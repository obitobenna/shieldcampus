// Which Zcash network ShieldCampus runs on. Safe for browser and server: the network is not a secret.
//
// Set ZCASH_NETWORK=testnet|mainnet in .env.local (default: testnet). next.config.ts copies it into
// NEXT_PUBLIC_ZCASH_NETWORK at build time so client components see the same value as the server.
// Changing it needs a restart (dev) or a redeploy (Vercel).
import type { ZcashNetwork } from "@/lib/zcash";

function readNetwork(): ZcashNetwork {
  const raw = (process.env.NEXT_PUBLIC_ZCASH_NETWORK || process.env.ZCASH_NETWORK || "").trim().toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

export const NETWORK: ZcashNetwork = readNetwork();
export const IS_TESTNET = NETWORK === "testnet";

/** Ticker shown next to amounts. Testnet coins are called TAZ. */
export function coinFor(network: ZcashNetwork): "ZEC" | "TAZ" {
  return network === "testnet" ? "TAZ" : "ZEC";
}
export const COIN = coinFor(NETWORK);

/** Shown next to naira values on testnet. The conversion maths is identical to mainnet. */
export const DEMO_VALUE_NOTE = "demo value (testnet coins have no real value)";

/** " · demo value (…)" on testnet, "" on mainnet. Append after a naira figure. */
export const DEMO_SUFFIX = IS_TESTNET ? ` · ${DEMO_VALUE_NOTE}` : "";

/** Address prefix students should look for in their wallet. */
export const UNIFIED_PREFIX = IS_TESTNET ? "utest1" : "u1";

export const NETWORK_LABEL = IS_TESTNET ? "Zcash testnet" : "Zcash mainnet";
