import { beforeAll, describe, expect, it, vi } from "vitest";

describe("customer pay status token", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-for-tests-0000000");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-for-tests-000");
  });

  it("accepts the token for its own sale only", async () => {
    const { payToken, checkPayToken } = await import("@/lib/pay-token");
    const t = payToken(42);
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(checkPayToken(42, t)).toBe(true);
    expect(checkPayToken(43, t)).toBe(false);
    expect(checkPayToken(42, t.slice(0, -1) + (t.endsWith("A") ? "B" : "A"))).toBe(false);
    expect(checkPayToken(42, "")).toBe(false);
    expect(checkPayToken(Number.NaN, t)).toBe(false);
  });
});
