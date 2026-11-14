import { describe, expect, it } from "vitest";
import {
  base64UrlDecode,
  base64UrlEncode,
  buildZip321Uri,
  formatZatoshis,
  ngnToZatoshis,
  zecToZatoshis,
} from "@/lib/zcash";

const enc = (s: string) => new TextEncoder().encode(s);

describe("ZEC amounts", () => {
  it("parses and formats without floating point drift", () => {
    expect(zecToZatoshis("0.01")).toBe(1_000_000n);
    expect(zecToZatoshis(0.01)).toBe(1_000_000n);
    expect(zecToZatoshis("1")).toBe(100_000_000n);
    expect(zecToZatoshis("0.00000001")).toBe(1n);
    expect(zecToZatoshis(0.1 + 0.2)).toBe(30_000_000n);
    expect(formatZatoshis(1_000_000n)).toBe("0.01");
    expect(formatZatoshis(100_000_000n)).toBe("1");
    expect(formatZatoshis(12_345_678_900n)).toBe("123.456789");
    expect(formatZatoshis(1n)).toBe("0.00000001");
  });

  it("rejects bad amounts", () => {
    expect(() => zecToZatoshis("0.000000001")).toThrow();
    expect(() => zecToZatoshis("-1")).toThrow();
    expect(() => zecToZatoshis("1e3")).toThrow();
    expect(() => zecToZatoshis("21000001")).toThrow();
  });

  it("converts naira at a rate, rounding up to the next zatoshi", () => {
    expect(ngnToZatoshis(2500, 60000)).toBe(4_166_667n); // 0.04166667 ZEC
    expect(ngnToZatoshis(60000, 60000)).toBe(100_000_000n);
    expect(ngnToZatoshis(150.5, 75250.25)).toBe(200_000n);
  });
});

describe("ZIP-321", () => {
  it("encodes memos as unpadded base64url (ZIP-321 test vector)", () => {
    // From ZIP-321: memo "This is a simple memo." -> VGhpcyBpcyBhIHNpbXBsZSBtZW1vLg
    expect(base64UrlEncode(enc("This is a simple memo."))).toBe("VGhpcyBpcyBhIHNpbXBsZSBtZW1vLg");
    expect(base64UrlEncode(enc("ShieldCampus sale #42"))).toBe("U2hpZWxkQ2FtcHVzIHNhbGUgIzQy");
  });

  it("uses - and _ instead of + and /, and round-trips UTF-8", () => {
    const bytes = Uint8Array.from([0xfb, 0xff, 0xfe]);
    expect(base64UrlEncode(bytes)).toBe("-__-");
    const memo = "Ẹ kú iṣẹ́ · ₦2,500 · Mama Nkechi's";
    expect(new TextDecoder().decode(base64UrlDecode(base64UrlEncode(enc(memo))))).toBe(memo);
  });

  it("builds a single-payment URI matching the ZIP-321 example format", () => {
    const address = "ztestsapling10yy2ex5dcqkclhc7z7yrnjq2z6feyjad56ptwlfgmy77dmaqqrl9gyhprdx59qgmsnyfska2kez";
    expect(buildZip321Uri({ address, amountZats: zecToZatoshis("1"), memo: "This is a simple memo." })).toBe(
      `zcash:${address}?amount=1&memo=VGhpcyBpcyBhIHNpbXBsZSBtZW1vLg`,
    );
    expect(buildZip321Uri({ address, amountZats: 1_000_000n, memo: "ShieldCampus reward #7" })).toBe(
      `zcash:${address}?amount=0.01&memo=U2hpZWxkQ2FtcHVzIHJld2FyZCAjNw`,
    );
    expect(buildZip321Uri({ address, amountZats: 4_166_667n })).toBe(`zcash:${address}?amount=0.04166667`);
  });

  it("rejects memos over 512 bytes and non-positive amounts", () => {
    expect(() => buildZip321Uri({ address: "zs1x", amountZats: 1n, memo: "a".repeat(513) })).toThrow(/512/);
    expect(() => buildZip321Uri({ address: "zs1x", amountZats: 1n, memo: "₦".repeat(171) })).toThrow(/513 bytes/);
    expect(buildZip321Uri({ address: "zs1x", amountZats: 1n, memo: "a".repeat(512) })).toContain("memo=");
    expect(() => buildZip321Uri({ address: "zs1x", amountZats: 0n })).toThrow();
  });
});
