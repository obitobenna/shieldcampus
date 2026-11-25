import "server-only";
import { env } from "@/lib/env";
import { checkShieldedAddress, type ZcashNetwork } from "@/lib/zcash";
import { nodeRpc, RpcError } from "@/lib/zcash-rpc";
import { getNetwork } from "@/lib/active-network";
import { networkOfAddress } from "@/lib/network";

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
const cache = new Map<ZcashNetwork, { status: ZcashStatus; at: number }>();
const inflight = new Map<ZcashNetwork, Promise<ZcashStatus>>();

/** Reward fund address for a network: REWARD_FUND_ADDRESS_MAINNET / _TESTNET, else REWARD_FUND_ADDRESS if it belongs to that network. */
export function rewardFundAddress(network: ZcashNetwork): string | undefined {
  const e = env();
  const specific = network === "mainnet" ? e.REWARD_FUND_ADDRESS_MAINNET : e.REWARD_FUND_ADDRESS_TESTNET;
  if (specific) return specific;
  return e.REWARD_FUND_ADDRESS && networkOfAddress(e.REWARD_FUND_ADDRESS) === network ? e.REWARD_FUND_ADDRESS : undefined;
}

const EXPECTED_CHAIN: Record<ZcashNetwork, string> = { mainnet: "main", testnet: "test" };

async function probe(network: ZcashNetwork): Promise<ZcashStatus> {
  const e = env();
  const fund = rewardFundAddress(network);
  const fundAddressOk = fund ? checkShieldedAddress(fund, network).ok : null;
  const base: ZcashStatus = {
    network,
    configured: false,
    reachable: false,
    blockHeight: null,
    nodeChain: null,
    warning: fundAddressOk === false ? `The ${network} reward fund address is not a valid ${network} shielded address.` : null,
    verifier: e.PAYMENT_VERIFIER,
    fundAddressOk,
    checkedAt: new Date().toISOString(),
  };

  const rpc = nodeRpc(network);
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
        ? `The configured Zcash node is on "${nodeChain}", but ShieldCampus is on ${network}. Set ZCASH_RPC_URL_${network.toUpperCase()} to a ${network} endpoint.`
        : base.warning,
    };
  } catch (err) {
    const message = err instanceof RpcError ? err.message : "Unexpected error talking to the Zcash node.";
    console.error("[zcash-status]", message);
    return { ...base, configured: true, warning: message };
  }
}

/** Active network + node status, cached for 30 seconds per network. Never throws. */
export async function getZcashStatus(): Promise<ZcashStatus> {
  const network = await getNetwork();
  const hit = cache.get(network);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.status;
  let p = inflight.get(network);
  if (!p) {
    p = probe(network)
      .then((status) => {
        cache.set(network, { status, at: Date.now() });
        return status;
      })
      .finally(() => inflight.delete(network));
    inflight.set(network, p);
  }
  return p;
}
