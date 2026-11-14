import { afterEach, describe, expect, it, vi } from "vitest";
import {
  amountWithinTolerance,
  decodeMemoHex,
  expectedMemo,
  matchPayment,
  normaliseOutput,
  type PaymentExpectation,
} from "@/lib/payment-match";
import { ManualVerifier, ZalletVerifier } from "@/lib/payment-verifier";
import { RpcError, ZcashRpcClient } from "@/lib/zcash-rpc";

const TXID = "a".repeat(64);
const OTHER_TXID = "b".repeat(64);

function memoHex(text: string): string {
  const bytes = new Uint8Array(512);
  bytes.set(new TextEncoder().encode(text));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const exp: PaymentExpectation = {
  kind: "reward",
  id: 7,
  memo: "ShieldCampus reward #7",
  amountZats: 1_000_000n,
  address: "utest1example",
};

describe("payment matching", () => {
  it("builds the standard memos", () => {
    expect(expectedMemo("reward", 7)).toBe("ShieldCampus reward #7");
    expect(expectedMemo("sale", 42)).toBe("ShieldCampus sale #42");
  });

  it("decodes zero-padded hex memos and ignores empty / binary ones", () => {
    expect(decodeMemoHex(memoHex("ShieldCampus sale #42"))).toBe("ShieldCampus sale #42");
    expect(decodeMemoHex("f6" + "00".repeat(511))).toBeNull(); // ZIP-302 empty memo
    expect(decodeMemoHex("zz")).toBeNull();
  });

  it("accepts amounts within 1% and rejects beyond", () => {
    expect(amountWithinTolerance(1_000_000n, 1_000_000n)).toBe(true);
    expect(amountWithinTolerance(990_000n, 1_000_000n)).toBe(true);
    expect(amountWithinTolerance(1_010_000n, 1_000_000n)).toBe(true);
    expect(amountWithinTolerance(989_999n, 1_000_000n)).toBe(false);
    expect(amountWithinTolerance(1_010_001n, 1_000_000n)).toBe(false);
  });

  it("matches by memo and amount, and only within the given txid when one is known", () => {
    const outputs = [
      { txid: OTHER_TXID, memo: "ShieldCampus reward #70", valueZats: 1_000_000n },
      { txid: TXID, memo: "ShieldCampus reward #7", valueZats: 995_000n },
    ];
    expect(matchPayment(outputs, exp)?.txid).toBe(TXID);
    expect(matchPayment(outputs, { ...exp, txid: OTHER_TXID })).toBeNull();
    expect(matchPayment(outputs, { ...exp, amountZats: 2_000_000n })).toBeNull();
    expect(matchPayment([{ txid: TXID, memo: "  shieldcampus REWARD #7\0\0", valueZats: 1_000_000n }], exp)).not.toBeNull();
  });

  it("normalises zcashd/Zallet output shapes", () => {
    expect(normaliseOutput({ txid: TXID, valueZat: 1_000_000, memo: memoHex("hi") })).toMatchObject({ valueZats: 1_000_000n, memo: "hi" });
    expect(normaliseOutput({ amount: 0.01, memoStr: "hi" }, TXID)).toMatchObject({ txid: TXID, valueZats: 1_000_000n, memo: "hi" });
    expect(normaliseOutput({ txid: TXID })).toBeNull();
  });
});

function fakeFetch(handler: (body: { method: string; params: unknown[] }) => Response | Promise<Response>) {
  return vi.fn(async (_url: string, init: RequestInit) => handler(JSON.parse(String(init.body))));
}
const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });

describe("ZcashRpcClient", () => {
  it("sends JSON-RPC with the API key header and basic auth", async () => {
    const f = vi.fn(async (_url: string, init: RequestInit) => {
      const h = init.headers as Record<string, string>;
      expect(h["x-api-key"]).toBe("k123");
      expect(h.Authorization).toBe(`Basic ${btoa("user:pass")}`);
      expect(JSON.parse(String(init.body))).toMatchObject({ method: "getblockcount", params: [] });
      return json({ result: 3_100_000, error: null, id: 1 });
    });
    const rpc = new ZcashRpcClient({ label: "Zcash node", url: "https://rpc.example", apiKey: "k123", user: "user", password: "pass" }, f);
    await expect(rpc.getBlockCount()).resolves.toBe(3_100_000);
  });

  it("turns failures into typed errors without leaking secrets", async () => {
    const mk = (f: Parameters<typeof fakeFetch>[0]) =>
      new ZcashRpcClient({ label: "Zcash node", url: "https://rpc.example", apiKey: "SECRET" }, fakeFetch(f));

    const rpcErr = await mk(() => json({ result: null, error: { code: -32601, message: "Method not found" } }, 500))
      .getBlockCount()
      .catch((e: unknown) => e);
    expect(rpcErr).toBeInstanceOf(RpcError);
    expect(rpcErr).toMatchObject({ kind: "rpc", code: -32601 });
    expect((rpcErr as RpcError).unreachable).toBe(false);

    await expect(mk(() => json({}, 401)).getBlockCount()).rejects.toMatchObject({ kind: "auth" });
    await expect(mk(() => new Response("<html>", { status: 200 })).getBlockCount()).rejects.toMatchObject({ kind: "parse" });
    const net = await mk(() => Promise.reject(new TypeError("fetch failed"))).getBlockCount().catch((e: unknown) => e);
    expect(net).toMatchObject({ kind: "network" });
    expect(String((net as Error).message)).not.toContain("SECRET");
  });

  it("times out slow endpoints", async () => {
    const slow = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
    );
    const rpc = new ZcashRpcClient({ label: "Zcash node", url: "https://rpc.example", timeoutMs: 50 }, slow);
    await expect(rpc.getBlockCount()).rejects.toMatchObject({ kind: "timeout" });
  });
});

describe("verifiers", () => {
  afterEach(() => vi.restoreAllMocks());

  it("ManualVerifier accepts a valid txid and otherwise asks a person", async () => {
    const m = new ManualVerifier();
    await expect(m.verify({ ...exp, txid: TXID })).resolves.toEqual({ status: "verified", method: "manual", txid: TXID });
    await expect(m.verify(exp)).resolves.toMatchObject({ status: "manual" });
  });

  it("ZalletVerifier verifies a txid by memo + amount via z_viewtransaction", async () => {
    const f = fakeFetch(({ method, params }) => {
      expect(method).toBe("z_viewtransaction");
      expect(params).toEqual([TXID]);
      return json({ result: { txid: TXID, outputs: [{ outgoing: true, valueZat: 1_000_000, memo: memoHex("ShieldCampus reward #7") }] } });
    });
    const v = new ZalletVerifier(new ZcashRpcClient({ label: "Zallet wallet", url: "http://127.0.0.1:28232" }, f));
    await expect(v.verify({ ...exp, txid: TXID })).resolves.toEqual({ status: "verified", method: "viewing_key", txid: TXID });
  });

  it("ZalletVerifier finds an incoming sale with z_listunspent", async () => {
    const f = fakeFetch(({ method, params }) => {
      expect(method).toBe("z_listunspent");
      expect(params[3]).toEqual(["utest1vendor"]);
      return json({ result: [{ txid: OTHER_TXID, amountZat: 204_919, memoStr: "ShieldCampus sale #42" }] });
    });
    const v = new ZalletVerifier(new ZcashRpcClient({ label: "Zallet wallet", url: "http://127.0.0.1:28232" }, f));
    const sale: PaymentExpectation = { kind: "sale", id: 42, memo: "ShieldCampus sale #42", amountZats: 204_919n, address: "utest1vendor" };
    await expect(v.verify(sale)).resolves.toMatchObject({ status: "verified", txid: OTHER_TXID });
    await expect(v.verify({ ...sale, memo: "ShieldCampus sale #43" })).resolves.toMatchObject({ status: "not_found" });
  });

  it("ZalletVerifier falls back to manual when the wallet is unreachable, and never throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const down = new ZalletVerifier(
      new ZcashRpcClient({ label: "Zallet wallet", url: "http://127.0.0.1:1" }, fakeFetch(() => Promise.reject(new TypeError("ECONNREFUSED")))),
    );
    await expect(down.verify(exp)).resolves.toMatchObject({ status: "manual" });
    // With a txid the manual (Level 1) confirmation still stands.
    await expect(down.verify({ ...exp, txid: TXID })).resolves.toEqual({ status: "verified", method: "manual", txid: TXID });
  });
});
