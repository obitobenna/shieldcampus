import "server-only";
import { env } from "@/lib/env";

export interface ZecRates {
  usd: number;
  ngn: number;
  source: "coingecko" | "fallback";
  fetchedAt: string;
}

const TTL_MS = 5 * 60 * 1000;
const URL = "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd,ngn";

let cache: { rates: ZecRates; at: number } | null = null;
let inflight: Promise<ZecRates> | null = null;

async function fetchCoinGecko(): Promise<ZecRates> {
  const res = await fetch(URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
  const json = (await res.json()) as { zcash?: { usd?: unknown; ngn?: unknown } };
  const usd = Number(json.zcash?.usd);
  const ngn = Number(json.zcash?.ngn);
  if (!(usd > 0) || !(ngn > 0)) throw new Error("CoinGecko returned no ZEC price");
  return { usd, ngn, source: "coingecko", fetchedAt: new Date().toISOString() };
}

/** ZEC price in USD and NGN: CoinGecko, cached 5 minutes server-side, with .env fallback rates. */
export async function getZecRates(): Promise<ZecRates> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rates;
  inflight ??= fetchCoinGecko()
    .then((rates) => {
      cache = { rates, at: Date.now() };
      return rates;
    })
    .catch((err: unknown) => {
      console.error("[rates] using fallback:", err instanceof Error ? err.message : err);
      // A recent live price beats the static fallback.
      if (cache && Date.now() - cache.at < 60 * 60 * 1000) return cache.rates;
      const e = env();
      return { usd: e.FALLBACK_ZEC_USD, ngn: e.FALLBACK_ZEC_NGN, source: "fallback" as const, fetchedAt: new Date().toISOString() };
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
