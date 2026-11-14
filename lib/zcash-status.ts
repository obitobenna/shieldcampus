import "server-only";
import { env } from "@/lib/env";
import { checkShieldedAddress, type ZcashNetwork } from "@/lib/zcash";
import { nodeRpc, RpcError } from "@/lib/zcash-rpc";

export interface ZcashStatus {
  network: ZcashNetwork;
  /** "configured" = ZCASH_RPC_URL is set. */
  configured: boolean;
  reachable: boolean;
  blockHeight: number | null;
  /** Chain the node reports ("main" / "test"), when it supports getblockchaininfo. */
  nodeChain: string | null;
  /** Problem worth showing an admin (wrong chain, unreachable, bad fund address). Never contains secrets. */
  warning: string | null;
  verifier: "manual" | "zallet";
  fundAddressOk: boolean | null;
  checkedAt: string;
}

const TTL_MS = 30_000;
let cache: { status: ZcashStatus; at: number } | null = null;
let inflight: Promise<ZcashStatus> | null = null;

const EXPECTED_CHAIN: Record<ZcashNetwork, string> = { mainnet: "main", testnet: "test" };

async function probe(): Promise<ZcashStatus> {
  const e = env();
  const network = e.ZCASH_NETWORK;
  const fundAddressOk = e.REWARD_FUND_ADDRESS ? checkShieldedAddress(e.REWARD_FUND_ADDRESS, network).ok : null;
  const base: ZcashStatus = {
    network,
    configured: false,
    reachable: false,
    blockHeight: null,
    nodeChain: null,
    warning: fundAddressOk === false ? `REWARD_FUND_ADDRESS is not a valid ${network} shielded address.` : null,
    verifier: e.PAYMENT_VERIFIER,
    fundAddressOk,
    checkedAt: new Date().toISOString(),
  };

  const rpc = nodeRpc();
  if (!rpc) return base;

  try {
    // getblockchaininfo gives height and chain together; fall back to getblockcount for gateways that only allow it.
    let blockHeight: number;
    let nodeChain: string | null = null;
    try {
      const info = await rpc.getBlockchainInfo();
      blockHeight = Number(info.blocks);
      nodeChain = typeof info.chain === "string" ? info.chain : null;
    } catch (err) {
      if (!(err instanceof RpcError) || err.unreachable) throw err;
      blockHeight = Number(await rpc.getBlockCount());
    }
    if (!Number.isFinite(blockHeight)) throw new RpcError("parse", "Zcash node returned no block height.");

    const wrongChain = nodeChain && nodeChain !== EXPECTED_CHAIN[network];
    return {
      ...base,
      configured: true,
      reachable: true,
      blockHeight,
      nodeChain,
      warning: wrongChain
        ? `The node at ZCASH_RPC_URL is on "${nodeChain}", but ZCASH_NETWORK is ${network}. Use a ${network} endpoint.`
        : base.warning,
    };
  } catch (err) {
    const message = err instanceof RpcError ? err.message : "Unexpected error talking to the Zcash node.";
    console.error("[zcash-status]", message);
    return { ...base, configured: true, warning: message };
  }
}

/** Network + node status, cached for 30 seconds. Never throws. */
export async function getZcashStatus(): Promise<ZcashStatus> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.status;
  inflight ??= probe()
    .then((status) => {
      cache = { status, at: Date.now() };
      return status;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
