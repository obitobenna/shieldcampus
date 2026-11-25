import { Stat, StatGrid } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/format";
import { getPublicImpactSummary } from "@/lib/impact";

export async function ImpactStrip() {
  let summary: Awaited<ReturnType<typeof getPublicImpactSummary>> | null = null;
  try {
    summary = await getPublicImpactSummary();
  } catch (err) {
    console.error("[landing] impact summary unavailable", err);
  }

  if (!summary) {
    return (
      <p className="rounded-lg border border-line bg-surface p-6 text-sm text-ink-muted">
        Live numbers are temporarily unavailable. They will be back shortly.
      </p>
    );
  }

  return (
    <StatGrid className="grid-cols-2 lg:grid-cols-4">
      <Stat label="Students learning" value={formatCount(summary.students)} />
      <Stat label="Wallets set up" value={formatCount(summary.walletsSetUp)} />
      <Stat
        label="Shielded rewards paid"
        value={formatCount(summary.rewardsPaid.mainnet + summary.rewardsPaid.testnet)}
        accent
        note={`${formatCount(summary.rewardsPaid.mainnet)} mainnet · ${formatCount(summary.rewardsPaid.testnet)} testnet`}
      />
      <Stat
        label="Payments at vendors"
        value={formatCount(summary.merchantPayments.mainnet + summary.merchantPayments.testnet)}
        accent
        note={`${formatCount(summary.merchantPayments.mainnet)} mainnet · ${formatCount(summary.merchantPayments.testnet)} testnet`}
      />
    </StatGrid>
  );
}

export function ImpactStripSkeleton() {
  return (
    <StatGrid className="grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 bg-surface p-5 sm:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </StatGrid>
  );
}
