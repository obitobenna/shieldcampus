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
              <StatGrid className="mt-3 grid-cols-2 lg:grid-cols-4">
                <Stat label="Students registered" value={formatCount(report.students)} />
                <Stat label="Lessons completed" value={formatCount(report.lessonsCompleted)} />
                <Stat label="Wallets set up" value={formatCount(report.walletsSetUp)} note="Passed the wallet setup lesson" />
                <Stat
                  label="First private transactions"
                  value={formatCount(report.firstPrivateTransactions)}
                  accent
                  note="Students who received a shielded reward"
                />
              </StatGrid>
            </section>

            <section aria-label="Payments" className="mt-8">
              <h2 className="eyebrow">Shielded payments</h2>
              <StatGrid className="mt-3 grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Rewards paid"
                  value={formatCount(report.rewardsPaid)}
                  accent
                  note={`${formatZec(report.rewardsPaidZec)} ZEC · ≈ ${formatNaira(Math.round(report.rewardsPaidZec * rates.ngn))}`}
                />
                <Stat label="Active vendors" value={formatCount(report.activeVendors)} note="Approved shops accepting ZEC" />
                <Stat label="Merchant payments" value={formatCount(report.merchantPayments)} accent note="Paid at campus vendors" />
                <Stat
                  label="Merchant volume"
                  value={formatNaira(report.merchantVolumeNgn)}
                  note={`${formatZec(report.merchantVolumeZec)} ZEC at each sale's rate`}
                />
              </StatGrid>
            </section>

            <section aria-label="Trends" className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
                <StudentsChart days={report.days} />
              </div>
              <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
                <PaymentsChart days={report.days} />
              </div>
            </section>

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
