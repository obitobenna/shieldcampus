import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSearch } from "lucide-react";
import { AuditGate, AuditLock } from "@/components/impact/audit-gate";
import { ViewingKeyExplainer } from "@/components/impact/viewing-key-explainer";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat, StatGrid } from "@/components/ui/stat";
import { auditEnabled, hasAuditAccess } from "@/lib/audit";
import { formatCount, formatNaira, formatZec } from "@/lib/format";
import { getAuditRows } from "@/lib/impact";
import { explorerUrl, VERIFICATION_LABEL } from "@/lib/verification";
import { coinFor, type ZcashNetwork } from "@/lib/network";

export const metadata: Metadata = { title: "Sponsor audit", robots: { index: false } };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export default async function AuditPage() {
  const enabled = auditEnabled();
  const unlocked = enabled && (await hasAuditAccess());

  return (
    <div className="page py-10 md:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-prose">
          <p className="eyebrow">
            <Link href="/impact" className="hover:text-ink">
              Impact
            </Link>{" "}
            / Audit
          </p>
          <h1 className="mt-2 text-xl md:text-2xl">Payout and payment audit</h1>
          <p className="mt-3 text-ink-muted">
            Every reward payout and merchant payment, by ID, amount and transaction ID. No student names or addresses are
            shown. Match each reward&apos;s txid and memo (&quot;ShieldCampus reward #ID&quot;) against the reward fund&apos;s viewing key.
          </p>
        </div>
        {unlocked ? (
          <div className="flex shrink-0 gap-2">
            <a href="/api/impact/audit/csv" className={buttonClasses("secondary", "sm")}>
              <Download aria-hidden className="h-4 w-4" />
              CSV
            </a>
            <AuditLock />
          </div>
        ) : null}
      </div>

      <div className="mt-10">
        {!enabled ? (
          <EmptyState icon={FileSearch} title="Audit view not configured" body="Set AUDIT_PIN on the server to enable sponsor access." />
        ) : !unlocked ? (
          <AuditGate />
        ) : (
          <AuditTable />
        )}
      </div>

      <div className="mt-12">
        <ViewingKeyExplainer />
      </div>
    </div>
  );
}

async function AuditTable() {
  const rows = await getAuditRows();
  const pick = (type: "reward" | "sale", network: ZcashNetwork) => rows.filter((r) => r.type === type && r.network === network);
  const sum = (list: typeof rows) => formatZec(list.reduce((s, r) => s + r.amountZec, 0));
  const mainRewards = pick("reward", "mainnet");
  const mainSales = pick("sale", "mainnet");
  const testRewards = pick("reward", "testnet");
  const testSales = pick("sale", "testnet");

  return (
    <div className="space-y-6">
      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <Stat label="Mainnet rewards" value={formatCount(mainRewards.length)} note={`${sum(mainRewards)} ZEC · real value`} accent />
        <Stat label="Mainnet vendor payments" value={formatCount(mainSales.length)} note={`${sum(mainSales)} ZEC · ${formatNaira(mainSales.reduce((s, r) => s + (r.amountNgn ?? 0), 0))}`} accent />
        <Stat label="Testnet rewards" value={formatCount(testRewards.length)} note={`${sum(testRewards)} TAZ · practice coins, no value`} />
        <Stat label="Testnet vendor payments" value={formatCount(testSales.length)} note={`${sum(testSales)} TAZ · practice coins, no value`} />
      </StatGrid>

      {rows.length === 0 ? (
        <EmptyState icon={FileSearch} title="No payments yet" body="Paid rewards and merchant payments will appear here as they happen." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-paper text-left text-xs uppercase tracking-[0.06em] text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Date (WAT)</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ID</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Network</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Transaction ID</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const link = r.txid && r.network ? explorerUrl(r.txid, r.network) : null;
                  return (
                    <tr key={`${r.type}-${r.id}`}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{r.date ? dateFmt.format(new Date(r.date)) : "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={r.type === "reward" ? "zec" : "brand"}>{r.type === "reward" ? "Reward" : "Sale"}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono">{r.type === "reward" ? `R${r.id}` : `S${r.id}`}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={r.network === "mainnet" ? "success" : "warning"}>{r.network === "mainnet" ? "Mainnet" : r.network === "testnet" ? "Testnet" : "Unknown"}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">
                        {formatZec(r.amountZec)} {r.network ? coinFor(r.network) : ""}
                      </td>
                      <td className="max-w-[260px] px-4 py-2.5 font-mono text-xs">
                        {r.txid ? (
                          link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer" className="block truncate text-brand underline underline-offset-2" title={r.txid}>
                              {r.txid}
                            </a>
                          ) : (
                            <span className="block truncate" title={r.txid}>
                              {r.txid}
                            </span>
                          )
                        ) : (
                          <span className="text-ink-muted">Not recorded</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {r.verifiedBy ? (
                          <Badge tone={r.verifiedBy === "viewing_key" ? "success" : "neutral"}>{VERIFICATION_LABEL[r.verifiedBy]}</Badge>
                        ) : (
                          <Badge tone="warning">Vendor confirmed</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
