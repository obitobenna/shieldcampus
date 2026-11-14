import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ClaimsQueue, type QueueClaim } from "@/components/admin/claims-queue";
import { Stat, StatGrid } from "@/components/ui/stat";
import { requirePageSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatCount, formatNaira, formatZec } from "@/lib/format";
import { getZecRates } from "@/lib/rates";
import { claimsToday } from "@/lib/rewards";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePageSession(["admin"], "/admin");
  const e = env();
  const db = createAdminClient();

  const [{ data: claims, error }, today, rates, { count: pendingVendors }] = await Promise.all([
    db.from("reward_claims").select("*").order("created_at", { ascending: false }).limit(500),
    claimsToday(),
    getZecRates(),
    db.from("vendors").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  if (error) throw new Error(error.message);

  const rows = claims ?? [];
  const userIds = [...new Set(rows.map((c) => c.user_id))];
  const lessonIds = [...new Set(rows.map((c) => c.lesson_id))];
  const [{ data: profiles }, { data: lessons }] = await Promise.all([
    userIds.length ? db.from("profiles").select("id, name, university").in("id", userIds) : Promise.resolve({ data: [] }),
    lessonIds.length ? db.from("lessons").select("id, title, position").in("id", lessonIds) : Promise.resolve({ data: [] }),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const lessonById = new Map((lessons ?? []).map((l) => [l.id, l]));

  const queue: QueueClaim[] = rows.map((c) => ({
    id: c.id,
    createdAt: c.created_at,
    studentName: profileById.get(c.user_id)?.name ?? "Unknown student",
    university: profileById.get(c.user_id)?.university ?? "",
    lessonTitle: lessonById.get(c.lesson_id) ? `L${lessonById.get(c.lesson_id)!.position} · ${lessonById.get(c.lesson_id)!.title}` : "Lesson",
    amountZec: Number(c.amount_zec),
    address: c.zcash_address,
    memo: c.memo,
    status: c.status,
    zip321Uri: c.zip321_uri,
    txid: c.txid,
    rejectionReason: c.rejection_reason,
  }));

  const paid = queue.filter((c) => c.status === "paid");
  const paidZec = paid.reduce((s, c) => s + c.amountZec, 0);
  const owed = queue.filter((c) => c.status === "submitted" || c.status === "approved").reduce((s, c) => s + c.amountZec, 0);

  return (
    <div className="page py-10 md:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-2 text-xl md:text-2xl">Reward payouts</h1>
        </div>
        <p className="font-mono text-xs text-ink-muted">
          1 ZEC = {formatNaira(Math.round(rates.ngn))} · ${rates.usd.toFixed(2)} ({rates.source === "coingecko" ? "CoinGecko" : "fallback rate"})
        </p>
      </div>

      <div className="mt-8">
        <AdminTabs current="payouts" pendingVendors={pendingVendors ?? 0} />
      </div>

      <StatGrid className="mt-8 grid-cols-2 lg:grid-cols-4">
        <Stat label="Claims today" value={`${formatCount(today)} / ${formatCount(e.DAILY_REWARD_CAP)}`} note="Daily cap (Lagos time)" />
        <Stat label="Waiting" value={formatCount(queue.filter((c) => c.status !== "paid" && c.status !== "rejected").length)} note={`${formatZec(owed)} ZEC to pay`} />
        <Stat label="Paid out" value={`${formatZec(paidZec)} ZEC`} accent note={`${paid.length} rewards · ≈ ${formatNaira(Math.round(paidZec * rates.ngn))}`} />
        <Stat label="Reward size" value={`${formatZec(e.REWARD_ZEC)} ZEC`} note="Set by REWARD_ZEC" />
      </StatGrid>

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
        <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-ink-muted">
          Check each claim before approving: one per student per lesson, and no wallet shared between accounts (the server already
          blocks duplicates). Payments are sent from the reward fund wallet on your phone. This site never holds its keys.
        </p>
      </div>

      <section aria-label="Claims" className="mt-10">
        <ClaimsQueue claims={queue} />
      </section>
    </div>
  );
}
