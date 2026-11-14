import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { coinFor } from "@/lib/network";
import { getZcashStatus } from "@/lib/zcash-status";

export const dynamic = "force-dynamic";

// GET /api/zcash/status: public, read-only. Network, block height and whether the node is reachable.
// It never returns URLs, keys or addresses.
export const GET = withApi(async () => {
  const s = await getZcashStatus();
  return NextResponse.json(
    {
      network: s.network,
      coin: coinFor(s.network),
      reachable: s.reachable,
      configured: s.configured,
      blockHeight: s.blockHeight,
      nodeChain: s.nodeChain,
      verifier: s.verifier,
      checkedAt: s.checkedAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
