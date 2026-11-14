import { afterEach, describe, expect, it, vi } from "vitest";
import { coinFor } from "@/lib/network";

describe("network config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("labels testnet amounts TAZ and mainnet ZEC", () => {
    expect(coinFor("testnet")).toBe("TAZ");
    expect(coinFor("mainnet")).toBe("ZEC");
  });

  it("defaults to testnet and only switches to mainnet when asked", async () => {
    vi.stubEnv("NEXT_PUBLIC_ZCASH_NETWORK", "");
    vi.stubEnv("ZCASH_NETWORK", "");
    expect((await import("@/lib/network")).NETWORK).toBe("testnet");

    vi.resetModules();
    vi.stubEnv("ZCASH_NETWORK", " Mainnet ");
    const main = await import("@/lib/network");
    expect(main.NETWORK).toBe("mainnet");
    expect(main.COIN).toBe("ZEC");
    expect(main.DEMO_SUFFIX).toBe("");
    expect(main.UNIFIED_PREFIX).toBe("u1");
  });

  it("shows the demo-value note on testnet", async () => {
    vi.stubEnv("ZCASH_NETWORK", "testnet");
    const t = await import("@/lib/network");
    expect(t.IS_TESTNET).toBe(true);
    expect(t.DEMO_SUFFIX).toMatch(/demo value \(testnet coins have no real value\)/);
    expect(t.UNIFIED_PREFIX).toBe("utest1");
  });
});
