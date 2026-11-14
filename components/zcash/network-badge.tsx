import { Badge } from "@/components/ui/badge";
import { IS_TESTNET } from "@/lib/network";

// "TESTNET" marker for the header and every payment screen. Renders nothing on mainnet.
// Works in server and client components (the network is inlined at build time).
export function NetworkBadge({ className }: { className?: string }) {
  if (!IS_TESTNET) return null;
  return (
    <Badge tone="warning" dot className={className}>
      <span title="Zcash testnet: TAZ coins have no real value">Testnet</span>
    </Badge>
  );
}
