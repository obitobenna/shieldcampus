import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VendorCategory } from "@/lib/database.types";

// Aggregate, non-identifying numbers only. Safe to show publicly.
export interface PublicImpactSummary {
  students: number;
  lessonsCompleted: number;
  walletsSetUp: number;
  rewardsPaid: number;
  activeVendors: number;
  merchantPayments: number;
}

async function loadSummary(): Promise<PublicImpactSummary> {
  const db = createAdminClient();
  const count = async (p: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: c, error } = await p;
    if (error) throw new Error(error.message);
    return c ?? 0;
  };

  const { data: walletLesson } = await db.from("lessons").select("id").eq("slug", "wallet-setup").maybeSingle();

  const [students, lessonsCompleted, walletsSetUp, rewardsPaid, activeVendors, merchantPayments] = await Promise.all([
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
    count(db.from("reward_claims").select("id", { count: "exact", head: true }).eq("status", "paid")),
    count(db.from("vendors").select("id", { count: "exact", head: true }).eq("status", "approved")),
    count(db.from("sales").select("id", { count: "exact", head: true }).eq("status", "paid")),
  ]);

  return { students, lessonsCompleted, walletsSetUp, rewardsPaid, activeVendors, merchantPayments };
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

export interface ImpactReport {
  students: number;
  lessonsCompleted: number;
  walletsSetUp: number;
  rewardsPaid: number;
  rewardsPaidZec: number;
  firstPrivateTransactions: number;
  activeVendors: number;
  merchantPayments: number;
  merchantVolumeNgn: number;
  merchantVolumeZec: number;
  days: ImpactDay[];
  generatedAt: string;
}

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const lagosDate = (iso: string) => new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
const ROW_LIMIT = 50_000;

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
    db.from("reward_claims").select("user_id, amount_zec, paid_at").eq("status", "paid").range(0, ROW_LIMIT - 1),
    db.from("vendors").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("sales").select("amount_ngn, amount_zec, paid_at, created_at").eq("status", "paid").range(0, ROW_LIMIT - 1),
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

  return {
    students: studentRows.length,
    lessonsCompleted: completed.count ?? 0,
    walletsSetUp: wallets.count ?? 0,
    rewardsPaid: rewardRows.length,
    rewardsPaidZec: rewardRows.reduce((s, r) => s + Number(r.amount_zec), 0),
    firstPrivateTransactions: new Set(rewardRows.map((r) => r.user_id)).size,
    activeVendors: vendors.count ?? 0,
    merchantPayments: saleRows.length,
    merchantVolumeNgn: saleRows.reduce((s, r) => s + Number(r.amount_ngn), 0),
    merchantVolumeZec: saleRows.reduce((s, r) => s + Number(r.amount_zec), 0),
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
}

export async function getAuditRows(): Promise<AuditRow[]> {
  const db = createAdminClient();
  const [rewards, sales] = await Promise.all([
    db.from("reward_claims").select("id, paid_at, amount_zec, txid, verified_by").eq("status", "paid").range(0, ROW_LIMIT - 1),
    db
      .from("sales")
      .select("id, paid_at, created_at, amount_zec, amount_ngn, txid, verified_by")
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
    })),
    ...(sales.data ?? []).map((s) => ({
      type: "sale" as const,
      id: s.id,
      date: s.paid_at ?? s.created_at,
      amountZec: Number(s.amount_zec),
      amountNgn: Number(s.amount_ngn),
      txid: s.txid,
      verifiedBy: s.verified_by,
    })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

