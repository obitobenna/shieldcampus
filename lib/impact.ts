import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VendorCategory } from "@/lib/database.types";
import { networkOfAddress, networkOfZip321, type ZcashNetwork } from "@/lib/network";

const ROW_LIMIT = 50_000;

// Aggregate, non-identifying numbers only. Safe to show publicly.
// Payments are split by network (from the paid-to address) so testnet practice never reads as mainnet.
export interface PublicImpactSummary {
  students: number;
  lessonsCompleted: number;
  walletsSetUp: number;
  rewardsPaid: Record<ZcashNetwork, number>;
  activeVendors: number;
  merchantPayments: Record<ZcashNetwork, number>;
}

const byNet = <T,>(rows: T[], netOf: (r: T) => ZcashNetwork | null): Record<ZcashNetwork, T[]> => ({
  mainnet: rows.filter((r) => netOf(r) === "mainnet"),
  testnet: rows.filter((r) => netOf(r) === "testnet"),
});

async function loadSummary(): Promise<PublicImpactSummary> {
  const db = createAdminClient();
  const count = async (p: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: c, error } = await p;
    if (error) throw new Error(error.message);
    return c ?? 0;
  };

  const { data: walletLesson } = await db.from("lessons").select("id").eq("slug", "wallet-setup").maybeSingle();

  const [students, lessonsCompleted, walletsSetUp, claims, activeVendors, sales] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")),
    count(db.from("lesson_progress").select("user_id", { count: "exact", head: true }).eq("status", "completed")),
    walletLesson
      ? count(
          db
            .from("lesson_progress")
            .select("user_id", { count: "exact", head: true })
            .eq("lesson_id", walletLesson.id)
            .eq("status", "completed"),
        )
      : Promise.resolve(0),
    db.from("reward_claims").select("zcash_address").eq("status", "paid").range(0, ROW_LIMIT - 1),
    count(db.from("vendors").select("id", { count: "exact", head: true }).eq("status", "approved")),
    db.from("sales").select("zip321_uri").eq("status", "paid").range(0, ROW_LIMIT - 1),
  ]);
  if (claims.error) throw new Error(claims.error.message);
  if (sales.error) throw new Error(sales.error.message);
  const c = byNet(claims.data ?? [], (r) => networkOfAddress(r.zcash_address));
  const sl = byNet(sales.data ?? [], (r) => networkOfZip321(r.zip321_uri));

  return {
    students,
    lessonsCompleted,
    walletsSetUp,
    rewardsPaid: { mainnet: c.mainnet.length, testnet: c.testnet.length },
    activeVendors,
    merchantPayments: { mainnet: sl.mainnet.length, testnet: sl.testnet.length },
  };
}

// Cached for 60 seconds across requests so the landing page stays fast under conference traffic.
export const getPublicImpactSummary = unstable_cache(loadSummary, ["public-impact-summary"], { revalidate: 60 });

export interface PublicVendor {
  slug: string;
  business_name: string;
  category: VendorCategory;
  location: string;
}

export const getApprovedVendors = unstable_cache(
  async (limit: number): Promise<PublicVendor[]> => {
    const { data, error } = await createAdminClient()
      .from("vendors")
      .select("slug, business_name, category, location")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["approved-vendors"],
  { revalidate: 60, tags: ["vendors"] },
);

// ---------------------------------------------------------------------------
// Full public impact report (/impact). Totals and daily counts only: no names,
// addresses, or individual payments. Cached 60s; tagged so admin actions can refresh it.
// ---------------------------------------------------------------------------

export interface ImpactDay {
  date: string; // YYYY-MM-DD in Lagos time
  label: string; // "14 Nov"
  students: number; // cumulative students registered by the end of the day
  rewards: number; // rewards paid that day
  sales: number; // vendor payments that day
}

/** Payment figures for one network. */
export interface NetworkImpact {
  rewardsPaid: number;
  rewardsPaidZec: number;
  /** Students who received at least one shielded reward on this network. */
  studentsPaid: number;
  /** Approved shops whose saved address is on this network. */
  activeVendors: number;
  merchantPayments: number;
  merchantVolumeNgn: number;
  merchantVolumeZec: number;
}

export interface ImpactReport {
  students: number;
  lessonsCompleted: number;
  walletsSetUp: number;
  byNetwork: Record<ZcashNetwork, NetworkImpact>;
  /** Daily counts across both networks. */
  days: ImpactDay[];
  generatedAt: string;
}

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const lagosDate = (iso: string) => new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });

async function loadReport(): Promise<ImpactReport> {
  const db = createAdminClient();
  const { data: walletLesson } = await db.from("lessons").select("id").eq("slug", "wallet-setup").maybeSingle();

  const [students, completed, wallets, rewards, vendors, sales] = await Promise.all([
    db.from("profiles").select("created_at").eq("role", "student").range(0, ROW_LIMIT - 1),
    db.from("lesson_progress").select("user_id", { count: "exact", head: true }).eq("status", "completed"),
    walletLesson
      ? db
          .from("lesson_progress")
          .select("user_id", { count: "exact", head: true })
          .eq("lesson_id", walletLesson.id)
          .eq("status", "completed")
      : Promise.resolve({ count: 0, error: null }),
    db.from("reward_claims").select("user_id, amount_zec, paid_at, zcash_address").eq("status", "paid").range(0, ROW_LIMIT - 1),
    db.from("vendors").select("zcash_address").eq("status", "approved").range(0, ROW_LIMIT - 1),
    db.from("sales").select("amount_ngn, amount_zec, paid_at, created_at, zip321_uri").eq("status", "paid").range(0, ROW_LIMIT - 1),
  ]);
  for (const r of [students, completed, wallets, rewards, vendors, sales]) {
    if (r.error) throw new Error(r.error.message);
  }

  const studentRows = students.data ?? [];
  const rewardRows = rewards.data ?? [];
  const saleRows = sales.data ?? [];

  // Last 14 Lagos days, oldest first.
  const today = lagosDate(new Date().toISOString());
  const keys = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
  const studentDays = studentRows.map((s) => lagosDate(s.created_at)).sort();
  const rewardDays = rewardRows.filter((r) => r.paid_at).map((r) => lagosDate(r.paid_at as string));
  const saleDays = saleRows.map((s) => lagosDate(s.paid_at ?? s.created_at));
  let cursor = 0;
  const days: ImpactDay[] = keys.map((key) => {
    while (cursor < studentDays.length && (studentDays[cursor] as string) <= key) cursor++;
    return {
      date: key,
      label: dayLabel.format(new Date(`${key}T00:00:00Z`)),
      students: cursor,
      rewards: rewardDays.filter((d) => d === key).length,
      sales: saleDays.filter((d) => d === key).length,
    };
  });

  const rewardsBy = byNet(rewardRows, (r) => networkOfAddress(r.zcash_address));
  const salesBy = byNet(saleRows, (r) => networkOfZip321(r.zip321_uri));
  const vendorsBy = byNet(vendors.data ?? [], (v) => networkOfAddress(v.zcash_address));
  const figures = (n: ZcashNetwork): NetworkImpact => ({
    rewardsPaid: rewardsBy[n].length,
    rewardsPaidZec: rewardsBy[n].reduce((s, r) => s + Number(r.amount_zec), 0),
    studentsPaid: new Set(rewardsBy[n].map((r) => r.user_id)).size,
    activeVendors: vendorsBy[n].length,
    merchantPayments: salesBy[n].length,
    merchantVolumeNgn: salesBy[n].reduce((s, r) => s + Number(r.amount_ngn), 0),
    merchantVolumeZec: salesBy[n].reduce((s, r) => s + Number(r.amount_zec), 0),
  });

  return {
    students: studentRows.length,
    lessonsCompleted: completed.count ?? 0,
    walletsSetUp: wallets.count ?? 0,
    byNetwork: { mainnet: figures("mainnet"), testnet: figures("testnet") },
    days,
    generatedAt: new Date().toISOString(),
  };
}

export const getImpactReport = unstable_cache(loadReport, ["impact-report"], { revalidate: 60, tags: ["impact"] });

// ---------------------------------------------------------------------------
// Sponsor audit rows (/impact/audit, PIN-protected). IDs, amounts and txids only.
// ---------------------------------------------------------------------------

export interface AuditRow {
  type: "reward" | "sale";
  id: number;
  date: string;
  amountZec: number;
  amountNgn: number | null;
  txid: string | null;
  verifiedBy: "manual" | "viewing_key" | null;
  /** From the paid-to address. Null only for malformed legacy rows. */
  network: ZcashNetwork | null;
}

export async function getAuditRows(): Promise<AuditRow[]> {
  const db = createAdminClient();
  const [rewards, sales] = await Promise.all([
    db.from("reward_claims").select("id, paid_at, amount_zec, txid, verified_by, zcash_address").eq("status", "paid").range(0, ROW_LIMIT - 1),
    db
      .from("sales")
      .select("id, paid_at, created_at, amount_zec, amount_ngn, txid, verified_by, zip321_uri")
      .eq("status", "paid")
      .range(0, ROW_LIMIT - 1),
  ]);
  if (rewards.error) throw new Error(rewards.error.message);
  if (sales.error) throw new Error(sales.error.message);
  const rows: AuditRow[] = [
    ...(rewards.data ?? []).map((r) => ({
      type: "reward" as const,
      id: r.id,
      date: r.paid_at ?? "",
      amountZec: Number(r.amount_zec),
      amountNgn: null,
      txid: r.txid,
      verifiedBy: r.verified_by,
      network: networkOfAddress(r.zcash_address),
    })),
    ...(sales.data ?? []).map((s) => ({
      type: "sale" as const,
      id: s.id,
      date: s.paid_at ?? s.created_at,
      amountZec: Number(s.amount_zec),
      amountNgn: Number(s.amount_ngn),
      txid: s.txid,
      verifiedBy: s.verified_by,
      network: networkOfZip321(s.zip321_uri),
    })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

