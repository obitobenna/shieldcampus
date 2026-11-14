import { cn } from "@/lib/cn";
import { formatCount } from "@/lib/format";
import { getZcashStatus } from "@/lib/zcash-status";

// "Connected to Zcash testnet · block #N". Server component; wrap in <Suspense> so a slow node
// never delays the page. Admins also see the reason when something is wrong.
export async function NetworkStatus({ showWarning = false, className }: { showWarning?: boolean; className?: string }) {
  const s = await getZcashStatus();
  const net = `Zcash ${s.network}`;
  const tone = s.reachable ? "bg-success" : s.configured ? "bg-danger" : "bg-ink-muted";
  const text = s.reachable
    ? `Connected to ${net} · block #${formatCount(s.blockHeight ?? 0)}`
    : s.configured
      ? `${net} node unreachable`
      : `${net} · no node configured`;

  return (
    <div className={cn("text-xs", className)}>
      <p className="inline-flex items-center gap-2 font-mono text-ink-muted" role="status">
        <span aria-hidden className={cn("h-2 w-2 rounded-full", tone)} />
        {text}
        {showWarning && s.verifier === "zallet" ? <span>· auto-verify on</span> : null}
      </p>
      {showWarning && s.warning ? <p className="mt-1 text-warning-ink">{s.warning}</p> : null}
    </div>
  );
}

export function NetworkStatusFallback({ className }: { className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-2 font-mono text-xs text-ink-muted", className)}>
      <span aria-hidden className="h-2 w-2 rounded-full bg-line" />
      Checking Zcash network…
    </p>
  );
}
