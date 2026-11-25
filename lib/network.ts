// Zcash network helpers. Safe for browser and server: the network is not a secret.
//
// The ACTIVE network is chosen by an admin at runtime (Admin -> Network) and stored in the
// `settings` table. Server code reads it with getNetwork() from "@/lib/active-network";
// client components read it with useNetwork() from "@/components/network-context".
// ZCASH_NETWORK (env) is only the default used before an admin has picked one.
import type { ZcashNetwork } from "@/lib/zcash";

export type { ZcashNetwork };

function readDefault(): ZcashNetwork {
  const raw = (process.env.NEXT_PUBLIC_ZCASH_NETWORK || process.env.ZCASH_NETWORK || "").trim().toLowerCase();
  return raw === "mainnet" ? "mainnet" : "testnet";
}

/** Network used until an admin picks one in Admin -> Network. */
export const DEFAULT_NETWORK: ZcashNetwork = readDefault();

export function parseNetwork(value: unknown): ZcashNetwork | null {
  return value === "mainnet" || value === "testnet" ? value : null;
}

/** Ticker shown next to amounts. Testnet coins are called TAZ. */
export function coinFor(network: ZcashNetwork): "ZEC" | "TAZ" {
  return network === "testnet" ? "TAZ" : "ZEC";
}

/** Shown next to naira values on testnet. The conversion maths is identical to mainnet. */
export const DEMO_VALUE_NOTE = "demo value (testnet coins have no real value)";

export interface NetworkInfo {
  network: ZcashNetwork;
  isTestnet: boolean;
  /** "ZEC" or "TAZ" */
  coin: "ZEC" | "TAZ";
  /** " · demo value (…)" on testnet, "" on mainnet. Append after a naira figure. */
  demoSuffix: string;
  /** Address prefix students should look for in their wallet. */
  unifiedPrefix: "u1" | "utest1";
  /** "Zcash testnet" / "Zcash mainnet" */
  label: string;
}

export function networkInfo(network: ZcashNetwork): NetworkInfo {
  const isTestnet = network === "testnet";
  return {
    network,
    isTestnet,
    coin: coinFor(network),
    demoSuffix: isTestnet ? ` · ${DEMO_VALUE_NOTE}` : "",
    unifiedPrefix: isTestnet ? "utest1" : "u1",
    label: isTestnet ? "Zcash testnet" : "Zcash mainnet",
  };
}

/** Which network a shielded address belongs to, from its prefix. Null if it isn't one we know. */
export function networkOfAddress(address: string | null | undefined): ZcashNetwork | null {
  const a = (address ?? "").trim().toLowerCase();
  if (a.startsWith("utest1") || a.startsWith("ztestsapling1")) return "testnet";
  if (a.startsWith("u1") || a.startsWith("zs1")) return "mainnet";
  return null;
}

/** Network of a stored ZIP-321 request ("zcash:<address>?amount=…"). */
export function networkOfZip321(uri: string | null | undefined): ZcashNetwork | null {
  if (!uri) return null;
  return networkOfAddress(uri.replace(/^zcash:/i, "").split("?")[0]);
}
