"use client";

import { Badge } from "@/components/ui/badge";
import { useNetwork } from "@/components/network-context";

// "TESTNET" marker for the header and every payment screen. Renders nothing on mainnet.
// Reads the active network from NetworkProvider, so it works in server and client components.
export function NetworkBadge({ className }: { className?: string }) {
  const { isTestnet } = useNetwork();
  if (!isTestnet) return null;
  return (
    <Badge tone="warning" dot className={className}>
      <span title="Zcash testnet: TAZ coins have no real value">Testnet</span>
    </Badge>
  );
}
