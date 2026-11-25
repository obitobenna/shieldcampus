import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PaymentsChart, StudentsChart } from "@/components/impact/impact-charts";
import { ViewingKeyExplainer } from "@/components/impact/viewing-key-explainer";
import { SiteFooter } from "@/components/site-footer";
import { Alert } from "@/components/ui/alert";
import { Stat, StatGrid } from "@/components/ui/stat";
import { formatCount, formatNaira, formatZec } from "@/lib/format";
import { getImpactReport, type ImpactReport } from "@/lib/impact";
import { getZecRates } from "@/lib/rates";
import { EVENT_NAME } from "@/lib/site";
import { Suspense } from "react";
import { NetworkStatus, NetworkStatusFallback } from "@/components/zcash/network-status";
import { networkInfo, type ZcashNetwork } from "@/lib/network";
import { getNetwork } from "@/lib/active-network";
import { Badge } from "@/components/ui/badge";
import type { NetworkImpact } from "@/lib/impact";

export const metadata: Metadata = {
  title: "Impact",
  description: "How many Nigerian students ShieldCampus has onboarded to private Zcash payments, verified with the reward fund's viewing key.",
};
export const dynamic = "force-dynamic";

const updatedFmt = new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", timeZone: "Africa/Lagos" });

export default async function ImpactPage() {
  let report: ImpactReport | null = null;
  try {
    report = await getImpactReport();
  } catch (err) {
    console.error("[impact] report unavailable", err);
  }
  const rates = await getZecRates();
  const active = await getNetwork();

  return (
    <>
      <div className="page py-10 md:py-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-prose">
            <p className="eyebrow">Sponsor impact · {EVENT_NAME}</p>
            <h1 className="mt-2 text-2xl">What your support created</h1>
            <p className="mt-3 text-ink-muted">
              Real students, real wallets, real shielded payments, counted straight from the ShieldCampus database. Totals
              only: individual payments stay private.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            {report ? (
              <p className="font-mono text-xs text-ink-muted">Updated {updatedFmt.format(new Date(report.generatedAt))} WAT · refreshes every minute</p>
            ) : null}
            <Suspense fallback={<NetworkStatusFallback />}>
              <NetworkStatus />
            </Suspense>
            <Link href="/impact/audit" className="inline-flex items-center gap-1 text-sm font-medium text-brand underline underline-offset-4">
              Sponsor audit view <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {!report ? (
          <Alert tone="warning" title="Live figures are temporarily unavailable" className="mt-8">
            Please refresh in a moment.
          </Alert>
        ) : (
          <>
            <section aria-label="Onboarding" className="mt-10">
              <h2 className="eyebrow">Onboarding</h2>
              <StatGrid className="mt-3 grid-cols-2 lg:grid-cols-3 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
                <Stat label="Students registered" value={formatCount(report.students)} />
                <Stat label="Lessons completed" value={formatCount(report.lessonsCompleted)} />
                <Stat label="Wallets set up" value={formatCount(report.walletsSetUp)} note="Passed the wallet setup lesson" />
              </StatGrid>
            </section>

            {(["mainnet", "testnet"] as const).map((n) => (
              <NetworkSection key={n} network={n} figures={report.byNetwork[n]} ngnPerZec={rates.ngn} live={n === active} />
            ))}

            <section aria-label="Trends" className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
                <StudentsChart days={report.days} />
              </div>
              <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
                <PaymentsChart days={report.days} />
              </div>
            </section>

            <p className="mt-3 text-xs text-ink-muted">Daily counts include both networks.</p>

            <details className="group mt-4 rounded-lg border border-line bg-surface">
              <summary className="cursor-pointer list-none px-5 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                View chart data as a table
              </summary>
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-paper text-left text-xs uppercase tracking-[0.06em] text-ink-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-semibold">Day</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Students (total)</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Rewards paid</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Vendor payments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono">
                    {report.days.map((d) => (
                      <tr key={d.date}>
                        <td className="px-4 py-2 font-sans">{d.label}</td>
                        <td className="px-4 py-2 text-right">{d.students}</td>
                        <td className="px-4 py-2 text-right">{d.rewards}</td>
                        <td className="px-4 py-2 text-right">{d.sales}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}

        <div className="mt-10">
          <ViewingKeyExplainer />
        </div>
      </div>
      <SiteFooter />
    </>
  );
}

// One network's payment figures. Mainnet is real ZEC; testnet is practice TAZ with no value,
// labelled so it can never be read as mainnet activity.
function NetworkSection({ network, figures, ngnPerZec, live }: { network: ZcashNetwork; figures: NetworkImpact; ngnPerZec: number; live: boolean }) {
  const { coin, demoSuffix, isTestnet } = networkInfo(network);
  return (
    <section aria-label={`${isTestnet ? "Testnet" : "Mainnet"} payments`} className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="eyebrow">{isTestnet ? "Testnet · practice coins (TAZ), no real value" : "Mainnet · real ZEC"}</h2>
        {live ? <Badge tone={isTestnet ? "warning" : "success"} dot>Live now</Badge> : null}
      </div>
      <StatGrid className="mt-3 grid-cols-2 lg:grid-cols-4">
        <Stat
          label="First private transactions"
          value={formatCount(figures.studentsPaid)}
          accent={!isTestnet}
          note="Students who received a shielded reward"
        />
        <Stat
          label="Rewards paid"
          value={formatCount(figures.rewardsPaid)}
          accent={!isTestnet}
          note={`${formatZec(figures.rewardsPaidZec)} ${coin} · ≈ ${formatNaira(Math.round(figures.rewardsPaidZec * ngnPerZec))}${demoSuffix}`}
        />
        <Stat label="Vendors" value={formatCount(figures.activeVendors)} note={`Approved shops with a ${network} address`} />
        <Stat
          label="Vendor payments"
          value={formatCount(figures.merchantPayments)}
          accent={!isTestnet}
          note={`${formatNaira(figures.merchantVolumeNgn)} · ${formatZec(figures.merchantVolumeZec)} ${coin}${demoSuffix}`}
        />
      </StatGrid>
    </section>
  );
}
