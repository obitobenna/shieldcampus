import { afterEach, describe, expect, it, vi } from "vitest";
import { coinFor, networkInfo, networkOfAddress, networkOfZip321, parseNetwork } from "@/lib/network";

describe("network config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("labels testnet amounts TAZ and mainnet ZEC", () => {
    expect(coinFor("testnet")).toBe("TAZ");
    expect(coinFor("mainnet")).toBe("ZEC");
  });

  it("defaults to testnet and only uses mainnet when asked", async () => {
    vi.stubEnv("NEXT_PUBLIC_ZCASH_NETWORK", "");
    vi.stubEnv("ZCASH_NETWORK", "");
    expect((await import("@/lib/network")).DEFAULT_NETWORK).toBe("testnet");

    vi.resetModules();
    vi.stubEnv("ZCASH_NETWORK", " Mainnet ");
    expect((await import("@/lib/network")).DEFAULT_NETWORK).toBe("mainnet");
  });

  it("describes mainnet without the demo note", () => {
    const main = networkInfo("mainnet");
    expect(main).toMatchObject({ isTestnet: false, coin: "ZEC", demoSuffix: "", unifiedPrefix: "u1", label: "Zcash mainnet" });
  });

  it("shows the demo-value note on testnet", () => {
    const t = networkInfo("testnet");
    expect(t.isTestnet).toBe(true);
    expect(t.demoSuffix).toMatch(/demo value \(testnet coins have no real value\)/);
    expect(t.unifiedPrefix).toBe("utest1");
  });

  it("only accepts known network names from settings", () => {
    expect(parseNetwork("mainnet")).toBe("mainnet");
    expect(parseNetwork("testnet")).toBe("testnet");
    expect(parseNetwork("Mainnet")).toBeNull();
    expect(parseNetwork(null)).toBeNull();
    expect(parseNetwork(1)).toBeNull();
  });
});

describe("network of an address", () => {
  it("tells testnet and mainnet shielded addresses apart", () => {
    expect(networkOfAddress("utest1abc")).toBe("testnet");
    expect(networkOfAddress("ztestsapling1abc")).toBe("testnet");
    expect(networkOfAddress("u1abc")).toBe("mainnet");
    expect(networkOfAddress("zs1abc")).toBe("mainnet");
    expect(networkOfAddress(" U1ABC ")).toBe("mainnet");
  });

  it("returns null for transparent or missing addresses", () => {
    expect(networkOfAddress("t1abc")).toBeNull();
    expect(networkOfAddress("tmabc")).toBeNull();
    expect(networkOfAddress("")).toBeNull();
    expect(networkOfAddress(null)).toBeNull();
  });

  it("reads the network from a stored ZIP-321 request", () => {
    expect(networkOfZip321("zcash:utest1abc?amount=0.01&memo=xyz")).toBe("testnet");
    expect(networkOfZip321("zcash:u1abc?amount=0.01")).toBe("mainnet");
    expect(networkOfZip321(null)).toBeNull();
  });
});
