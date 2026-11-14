import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat, StatGrid } from "@/components/ui/stat";
import { requirePageSession } from "@/lib/auth";
import type { SaleStatus } from "@/lib/database.types";
import { formatCount, formatNaira, formatZec } from "@/lib/format";
import { lagosDayStart } from "@/lib/rewards";
import { isApproved, listSalesForVendor, totals } from "@/lib/sales";
import { getShopForOwner } from "@/lib/vendors";

export const metadata: Metadata = { title: "Sales" };
export const dynamic = "force-dynamic";

const STATUS: Record<SaleStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Waiting", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const timeFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function SalesPage() {
  const session = await requirePageSession(["vendor"], "/vendor/sales");
  const shop = await getShopForOwner(session.userId);
  const sales = shop ? await listSalesForVendor(shop.id, 300) : [];
  const paid = sales.filter((s) => s.status === "paid");
  const today = lagosDayStart();
  const all = totals(paid);
  const todays = totals(paid.filter((s) => (s.paid_at ?? s.created_at) >= today));

  return (
    <div className="page py-10 md:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{shop?.business_name ?? "Your shop"}</p>
          <h1 className="mt-2 text-xl md:text-2xl">Sales</h1>
        </div>
        {isApproved(shop) ? <ButtonLink href="/pos">Open till</ButtonLink> : null}
      </div>

      <StatGrid className="mt-8 grid-cols-2 lg:grid-cols-4">
        <Stat label="Today" value={formatNaira(todays.ngn)} note={`${formatCount(todays.count)} paid sales`} accent />
        <Stat label="Today in ZEC" value={formatZec(todays.zec)} note="Received to your wallet" />
        <Stat label="All time" value={formatNaira(all.ngn)} note={`${formatCount(all.count)} paid sales`} />
        <Stat label="All time in ZEC" value={formatZec(all.zec)} note="Naira at each sale's locked rate" />
      </StatGrid>

      {sales.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Receipt}
          title="No sales yet"
          body={isApproved(shop) ? "Open your till, type a price in naira, and show the QR code to your customer." : "Your till opens once your shop is approved."}
          action={isApproved(shop) ? <ButtonLink href="/pos">Open till</ButtonLink> : <ButtonLink href="/vendor" variant="secondary">Go to your shop</ButtonLink>}
        />
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-paper text-left text-xs uppercase tracking-[0.06em] text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Sale</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Time</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Note</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Naira</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">ZEC</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sales.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3 font-mono">#{s.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{timeFmt.format(new Date(s.created_at))}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      <span className="line-clamp-2">{s.note ?? <span className="text-ink-muted">—</span>}</span>
                      {s.txid ? <span className="mt-1 block truncate font-mono text-xs text-ink-muted" title={s.txid}>txid {s.txid.slice(0, 16)}…</span> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatNaira(Number(s.amount_ngn))}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatZec(Number(s.amount_zec))}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                        {s.status === "pending" ? (
                          <Link href={`/pos/${s.id}`} className="text-xs font-medium text-brand underline underline-offset-4">
                            Open
                          </Link>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
