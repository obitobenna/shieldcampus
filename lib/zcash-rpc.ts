import "server-only";
import { env } from "@/lib/env";

// A small typed JSON-RPC client for Zcash nodes (Zebra) and wallets (Zallet). fetch-based, with a
// timeout on every call and errors that say what went wrong without leaking credentials.
//
// Note: hosted "lightwalletd" endpoints speak gRPC, not JSON-RPC. ZCASH_RPC_URL must point at a
// JSON-RPC endpoint (a Zebra node, or a provider's Zcash JSON-RPC gateway).

export type RpcErrorKind =
  | "not_configured" // no URL in .env
  | "timeout" // no answer in time
  | "network" // DNS / connection refused / TLS
  | "auth" // 401 / 403: wrong key or password
  | "http" // any other non-2xx
  | "parse" // response wasn't JSON-RPC
  | "rpc"; // the node answered with a JSON-RPC error (e.g. unknown method)

export class RpcError extends Error {
  constructor(
    public readonly kind: RpcErrorKind,
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "RpcError";
  }

  /** True when the endpoint itself couldn't be used (as opposed to a valid "no" answer). */
  get unreachable(): boolean {
    return this.kind !== "rpc";
  }
}

export interface RpcConfig {
  /** Short label used in error messages, e.g. "Zcash node". */
  label: string;
  url: string;
  apiKey?: string;
  apiKeyHeader?: string;
  user?: string;
  password?: string;
  timeoutMs?: number;
}

export interface BlockchainInfo {
  chain: string; // "main" | "test" | "regtest"
  blocks: number;
  bestblockhash?: string;
  estimatedheight?: number;
  [key: string]: unknown;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

let nextId = 1;

export class ZcashRpcClient {
  constructor(
    private readonly config: RpcConfig,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {}

  get label(): string {
    return this.config.label;
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const { url, apiKey, apiKeyHeader = "x-api-key", user, password, timeoutMs = 6000, label } = this.config;
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (apiKey) headers[apiKeyHeader] = apiKey;
    if (user || password) headers.Authorization = `Basic ${btoa(`${user ?? ""}:${password ?? ""}`)}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers,
        // "1.0" is what zcashd/Zebra/Zallet document; JSON-RPC 2.0 gateways accept it too.
        body: JSON.stringify({ jsonrpc: "1.0", id: nextId++, method, params }),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        throw new RpcError("timeout", `${label} did not answer within ${Math.round(timeoutMs / 1000)}s (${method}).`);
      }
      throw new RpcError("network", `Could not reach the ${label}. Check the URL in .env and your internet connection.`);
    }

    let body: unknown = null;
    const text = await res.text().catch(() => "");
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    // Many nodes return HTTP 500 together with a JSON-RPC error body, so read the body first.
    const rpc = body as { result?: unknown; error?: { code?: number; message?: string } | null } | null;
    if (rpc && typeof rpc === "object" && rpc.error) {
      throw new RpcError("rpc", `${label} error on ${method}: ${rpc.error.message ?? "unknown error"}`, rpc.error.code);
    }
    if (res.status === 401 || res.status === 403) {
      throw new RpcError("auth", `${label} rejected the credentials (HTTP ${res.status}). Check the API key or RPC user/password.`);
    }
    if (!res.ok) throw new RpcError("http", `${label} returned HTTP ${res.status} for ${method}.`);
    if (!rpc || typeof rpc !== "object" || !("result" in rpc)) {
      throw new RpcError("parse", `${label} sent a response that isn't JSON-RPC. Is ZCASH_RPC_URL a JSON-RPC endpoint (not lightwalletd/gRPC)?`);
    }
    return rpc.result as T;
  }

  // ---- Node (Zebra) methods ---------------------------------------------------------------
  getBlockCount(): Promise<number> {
    return this.call<number>("getblockcount");
  }
  getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.call<BlockchainInfo>("getblockchaininfo");
  }
}

/** Node endpoint for a network: ZCASH_RPC_URL_MAINNET / _TESTNET, falling back to ZCASH_RPC_URL. */
export function nodeRpcUrl(network: "mainnet" | "testnet"): string | undefined {
  const e = env();
  return (network === "mainnet" ? e.ZCASH_RPC_URL_MAINNET : e.ZCASH_RPC_URL_TESTNET) ?? e.ZCASH_RPC_URL;
}

/** Client for the Zcash node on the given network, or null when none is configured. */
export function nodeRpc(network: "mainnet" | "testnet"): ZcashRpcClient | null {
  const e = env();
  const url = nodeRpcUrl(network);
  if (!url) return null;
  return new ZcashRpcClient({
    label: "Zcash node",
    url,
    apiKey: e.ZCASH_RPC_API_KEY,
    apiKeyHeader: e.ZCASH_RPC_API_KEY_HEADER,
    user: e.ZCASH_RPC_USER,
    password: e.ZCASH_RPC_PASSWORD,
    timeoutMs: e.ZCASH_RPC_TIMEOUT_MS,
  });
}

/** Client for a Zallet wallet (ZALLET_RPC_URL), or null when it isn't configured. */
export function walletRpc(): ZcashRpcClient | null {
  const e = env();
  if (!e.ZALLET_RPC_URL) return null;
  return new ZcashRpcClient({
    label: "Zallet wallet",
    url: e.ZALLET_RPC_URL,
    user: e.ZALLET_RPC_USER,
    password: e.ZALLET_RPC_PASSWORD,
    timeoutMs: e.ZCASH_RPC_TIMEOUT_MS,
  });
}
