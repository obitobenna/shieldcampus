import { describe, expect, it } from "vitest";
import { bytesTo5bit, checkShieldedAddress, encodeBech32, verifyBech32 } from "@/lib/zcash";

function bytes(n: number, seed: number): Uint8Array {
  return Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed * 17 + 7) & 0xff);
}

// Sapling raw address = 43 bytes; unified (Orchard-only) = 61 bytes after F4Jumble + padding.
const saplingMain = encodeBech32("zs", bytesTo5bit(bytes(43, 1)), "bech32");
const saplingTest = encodeBech32("ztestsapling", bytesTo5bit(bytes(43, 2)), "bech32");
const unifiedMain = encodeBech32("u", bytesTo5bit(bytes(61, 3)), "bech32m");
const unifiedFull = encodeBech32("u", bytesTo5bit(bytes(150, 4)), "bech32m");
const unifiedTest = encodeBech32("utest", bytesTo5bit(bytes(61, 5)), "bech32m");

function corrupt(addr: string): string {
  const i = addr.length - 10;
  const c = addr[i] === "q" ? "p" : "q";
  return addr.slice(0, i) + c + addr.slice(i + 1);
}

describe("bech32 primitives", () => {
  it("matches the BIP-173 / BIP-350 test vectors", () => {
    expect(verifyBech32("a12uel5l", "bech32")).not.toBeNull();
    expect(verifyBech32("abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw", "bech32")).not.toBeNull();
    expect(verifyBech32("a1lqfn3a", "bech32m")).not.toBeNull();
    expect(verifyBech32("abcdef1l7aum6echk45nj3s0wdvt2fg8x9yrzpqzd3ryx", "bech32m")).not.toBeNull();
    // A bech32 string must not validate as bech32m and vice versa.
    expect(verifyBech32("a12uel5l", "bech32m")).toBeNull();
    expect(verifyBech32("a1lqfn3a", "bech32")).toBeNull();
  });

  it("produces addresses of the real lengths", () => {
    expect(saplingMain).toHaveLength(78);
    expect(saplingTest).toHaveLength(88);
    expect(unifiedMain.length).toBeGreaterThan(100);
  });
});

// From zcash/zcash-test-vectors unified_address.json (ZIP 316).
const OFFICIAL_UA =
  "u1l8xunezsvhq8fgzfl7404m450nwnd76zshscn6nfys7vyz2ywyh4cc5daaq0c7q2su5lqfh23sp7fkf3kt27ve5948mzpfdvckzaect2jtte308mkwlycj2u0eac077wu70vqcetkxf";

describe("checkShieldedAddress (mainnet)", () => {
  it("accepts an official ZIP 316 test vector", () => {
    expect(checkShieldedAddress(OFFICIAL_UA, "mainnet")).toMatchObject({ ok: true, kind: "unified" });
    expect(checkShieldedAddress(corrupt(OFFICIAL_UA), "mainnet").ok).toBe(false);
  });

  it("accepts unified and sapling addresses", () => {
    expect(checkShieldedAddress(unifiedMain, "mainnet")).toMatchObject({ ok: true, kind: "unified" });
    expect(checkShieldedAddress(unifiedFull, "mainnet")).toMatchObject({ ok: true, kind: "unified" });
    expect(checkShieldedAddress(saplingMain, "mainnet")).toMatchObject({ ok: true, kind: "sapling" });
  });

  it("tolerates surrounding whitespace and line breaks from copy-paste", () => {
    const pasted = `  ${unifiedMain.slice(0, 50)}\n${unifiedMain.slice(50)}  `;
    expect(checkShieldedAddress(pasted, "mainnet")).toMatchObject({ ok: true, address: unifiedMain });
  });

  it("rejects a single-character typo via the checksum", () => {
    expect(checkShieldedAddress(corrupt(unifiedMain), "mainnet")).toMatchObject({ ok: false, reason: "checksum" });
    expect(checkShieldedAddress(corrupt(saplingMain), "mainnet")).toMatchObject({ ok: false, reason: "checksum" });
  });

  it("rejects a truncated address", () => {
    expect(checkShieldedAddress(unifiedMain.slice(0, -4), "mainnet").ok).toBe(false);
  });

  it("explains why transparent addresses are rejected", () => {
    const r = checkShieldedAddress("t1Rv4exT7bqhZqi2j7xz8bUHDMxwosrjADU", "mainnet");
    expect(r).toMatchObject({ ok: false, reason: "transparent" });
    if (!r.ok) expect(r.message).toMatch(/visible to everyone/);
    expect(checkShieldedAddress("t3Vz22vK5z2LcKEdg16Yv4FFneEL1zg9ojd", "mainnet")).toMatchObject({ reason: "transparent" });
  });

  it("warns loudly when a recovery phrase is pasted", () => {
    const phrase = "abandon ability able about above absent absorb abstract absurd abuse access accident";
    const r = checkShieldedAddress(phrase, "mainnet");
    expect(r).toMatchObject({ ok: false, reason: "seed_phrase" });
    if (!r.ok) expect(r.message).toMatch(/Never/);
  });

  it("recognises viewing keys and wrong-network addresses", () => {
    expect(checkShieldedAddress("uview1qqqqqqqqqqqqqqqqqqqq", "mainnet")).toMatchObject({ reason: "viewing_key" });
    expect(checkShieldedAddress(unifiedTest, "mainnet")).toMatchObject({ reason: "wrong_network" });
  });

  it("rejects empty and random input", () => {
    expect(checkShieldedAddress("   ", "mainnet")).toMatchObject({ reason: "empty" });
    expect(checkShieldedAddress("hello", "mainnet")).toMatchObject({ reason: "format" });
    expect(checkShieldedAddress("0801234567", "mainnet")).toMatchObject({ reason: "format" });
  });
});

describe("checkShieldedAddress (testnet)", () => {
  it("accepts utest1 unified and ztestsapling1 Sapling addresses", () => {
    expect(checkShieldedAddress(unifiedTest, "testnet")).toMatchObject({ ok: true, kind: "unified", address: unifiedTest });
    expect(checkShieldedAddress(saplingTest, "testnet")).toMatchObject({ ok: true, kind: "sapling", address: saplingTest });
    expect(unifiedTest.startsWith("utest1")).toBe(true);
    expect(saplingTest.startsWith("ztestsapling1")).toBe(true);
  });

  it("rejects mainnet addresses with a clear wrong-network message", () => {
    for (const addr of [unifiedMain, saplingMain, OFFICIAL_UA]) {
      const r = checkShieldedAddress(addr, "testnet");
      expect(r).toMatchObject({ ok: false, reason: "wrong_network" });
      if (!r.ok) expect(r.message).toMatch(/This is a mainnet address, but ShieldCampus is running on testnet/);
    }
  });

  it("rejects testnet addresses on mainnet with the mirror message", () => {
    const r = checkShieldedAddress(saplingTest, "mainnet");
    expect(r).toMatchObject({ ok: false, reason: "wrong_network" });
    if (!r.ok) expect(r.message).toMatch(/This is a testnet address, but ShieldCampus is running on mainnet/);
  });

  it("rejects testnet transparent (tm…) addresses with a friendly explanation", () => {
    const r = checkShieldedAddress("tmEZhbWHTpdKMw5it8YDspUXSMGQyFwovpU", "testnet");
    expect(r).toMatchObject({ ok: false, reason: "transparent" });
    if (!r.ok) {
      expect(r.message).toMatch(/visible to everyone/);
      expect(r.message).toMatch(/starts with utest1/);
      expect(r.message).not.toMatch(/mainnet/);
    }
  });

  it("flags a mainnet transparent address on testnet as both transparent and wrong network", () => {
    const r = checkShieldedAddress("t1Rv4exT7bqhZqi2j7xz8bUHDMxwosrjADU", "testnet");
    expect(r).toMatchObject({ ok: false, reason: "transparent" });
    if (!r.ok) expect(r.message).toMatch(/mainnet address, and ShieldCampus is running on testnet/);
  });

  it("catches typos in testnet addresses via the checksum", () => {
    expect(checkShieldedAddress(corrupt(unifiedTest), "testnet")).toMatchObject({ ok: false, reason: "checksum" });
    expect(checkShieldedAddress(corrupt(saplingTest), "testnet")).toMatchObject({ ok: false, reason: "checksum" });
  });

  it("uses the utest1 prefix in hints", () => {
    const empty = checkShieldedAddress("", "testnet");
    if (!empty.ok) expect(empty.message).toMatch(/utest1/);
    const junk = checkShieldedAddress("hello", "testnet");
    expect(junk).toMatchObject({ reason: "format" });
    if (!junk.ok) expect(junk.message).toMatch(/utest1/);
    const tex = checkShieldedAddress("textest1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq", "testnet");
    expect(tex).toMatchObject({ reason: "tex" });
  });
});
