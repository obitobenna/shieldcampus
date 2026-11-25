import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { setNetwork } from "@/lib/active-network";

const schema = z.object({ network: z.enum(["mainnet", "testnet"]) });

export interface SetNetworkResponse {
  network: "mainnet" | "testnet";
}

// POST /api/admin/network: switch the whole site between Zcash testnet and mainnet. Admin only.
// Takes effect on the next page load; no redeploy needed.
export const POST = withApi(async (request: Request) => {
  await requireApiSession(["admin"]);
  const { network } = await parseJson(request, schema);
  await setNetwork(network);
  const body: SetNetworkResponse = { network };
  return NextResponse.json(body);
});
