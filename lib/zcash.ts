// Zcash helpers shared by browser and server. No secrets here.
//
// Address validation verifies the real Bech32 / Bech32m checksum, so a single mistyped
// character is caught, and explains clearly why non-shielded input is rejected.

export type ZcashNetwork = "mainnet" | "testnet";
export type ShieldedKind = "unified" | "sapling";

export type AddressCheck =
  | { ok: true; kind: ShieldedKind; address: string }
  | {
      ok: false;
      reason:
        | "empty"
        | "transparent"
        | "tex"
        | "viewing_key"
        | "spending_key"
        | "seed_phrase"
        | "wrong_network"
        | "checksum"
        | "format";
      message: string;
    };

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((top >>> i) & 1) chk ^= GENERATOR[i]!;
    }
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

/** Verifies a Bech32 (variant "bech32") or Bech32m string. No length limit (unified addresses exceed 90). */
export function verifyBech32(str: string, variant: "bech32" | "bech32m"): { hrp: string; data: number[] } | null {
  if (str !== str.toLowerCase()) return null;
  const sep = str.lastIndexOf("1");
  if (sep < 1 || sep + 7 > str.length) return null;
  const hrp = str.slice(0, sep);
  const data: number[] = [];
  for (const ch of str.slice(sep + 1)) {
    const idx = CHARSET.indexOf(ch);
    if (idx === -1) return null;
    data.push(idx);
  }
  const target = variant === "bech32" ? BECH32_CONST : BECH32M_CONST;
  if (polymod([...hrpExpand(hrp), ...data]) !== target) return null;
  return { hrp, data: data.slice(0, -6) };
}

/** Encodes 5-bit groups as Bech32/Bech32m. Used by tests and tooling. */
export function encodeBech32(hrp: string, data5: number[], variant: "bech32" | "bech32m"): string {
  const target = variant === "bech32" ? BECH32_CONST : BECH32M_CONST;
  const mod = polymod([...hrpExpand(hrp), ...data5, 0, 0, 0, 0, 0, 0]) ^ target;
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31);
  return `${hrp}1${[...data5, ...checksum].map((d) => CHARSET[d]).join("")}`;
}

/** Converts 8-bit bytes to 5-bit groups (with padding). */
export function bytesTo5bit(bytes: Uint8Array): number[] {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.push((acc >> bits) & 31);
    }
  }
  if (bits > 0) out.push((acc << (5 - bits)) & 31);
  return out;
}

const HRP = {
  mainnet: { unified: "u", sapling: "zs" },
  testnet: { unified: "utest", sapling: "ztestsapling" },
} as const;

const NETWORK_NAME: Record<ZcashNetwork, string> = { mainnet: "mainnet", testnet: "testnet" };

export function checkShieldedAddress(input: string, network: ZcashNetwork): AddressCheck {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "empty", message: "Paste your shielded address. It starts with u1." };

  // Someone pasted words, not an address. Most likely their recovery phrase.
  const words = raw.split(/\s+/);
  if (words.length >= 12 && words.every((w) => /^[a-z]+$/i.test(w))) {
    return {
      ok: false,
      reason: "seed_phrase",
      message:
        "Stop: that looks like a recovery phrase. Never paste it anywhere or share it with anyone. Delete it from this box, then copy your address from the Receive screen in your wallet instead.",
    };
  }

  const addr = raw.replace(/\s+/g, "");
  const lower = addr.toLowerCase();

  if (/^(uview|uivk|zxview|zxviews|zivk|zxviewtestsapling)/.test(lower)) {
    return {
      ok: false,
      reason: "viewing_key",
      message: "That's a viewing key, not an address. Copy the address from the Receive screen in your wallet. It starts with u1.",
    };
  }
  if (/^(secret-extended-key|secret-|usk)/.test(lower)) {
    return {
      ok: false,
      reason: "spending_key",
      message: "Stop: that's a private spending key. Never share it. Copy your address from the Receive screen instead.",
    };
  }
  if (/^(tex1|textest1)/.test(lower)) {
    return {
      ok: false,
      reason: "tex",
      message: "That's a transparent-only (TEX) address. ShieldCampus pays to shielded addresses only. Use the address that starts with u1.",
    };
  }
  if (/^(t1|t3|tm|t2)[1-9A-HJ-NP-Za-km-z]{20,}$/.test(addr)) {
    return {
      ok: false,
      reason: "transparent",
      message:
        "That's a transparent address (it starts with t). Payments to it are visible to everyone on the internet, which defeats the point. Use your shielded address instead: it starts with u1.",
    };
  }

  const other: ZcashNetwork = network === "mainnet" ? "testnet" : "mainnet";
  if (lower.startsWith(`${HRP[other].unified}1`) || lower.startsWith(`${HRP[other].sapling}1`)) {
    return {
      ok: false,
      reason: "wrong_network",
      message: `That's a ${NETWORK_NAME[other]} address, but ShieldCampus runs on Zcash ${NETWORK_NAME[network]}. Check your wallet's network setting.`,
    };
  }

  const { unified, sapling } = HRP[network];
  if (lower.startsWith(`${unified}1`)) {
    const decoded = verifyBech32(lower, "bech32m");
    if (!decoded || decoded.hrp !== unified || decoded.data.length < 90) {
      return {
        ok: false,
        reason: "checksum",
        message: "That address has a typo or is incomplete. Copy it again using the copy button in your wallet, rather than typing it.",
      };
    }
    return { ok: true, kind: "unified", address: lower };
  }
  if (lower.startsWith(`${sapling}1`)) {
    const decoded = verifyBech32(lower, "bech32");
    if (!decoded || decoded.hrp !== sapling || decoded.data.length !== 69) {
      return {
        ok: false,
        reason: "checksum",
        message: "That address has a typo or is incomplete. Copy it again using the copy button in your wallet, rather than typing it.",
      };
    }
    return { ok: true, kind: "sapling", address: lower };
  }

  return {
    ok: false,
    reason: "format",
    message:
      network === "mainnet"
        ? "That doesn't look like a Zcash shielded address. It should start with u1 (or zs1 for older wallets)."
        : "That doesn't look like a Zcash testnet shielded address. It should start with utest1 (or ztestsapling1).",
  };
}

/** Shortened display form: u1abcd…wxyz */
export function shortAddress(address: string, head = 8, tail = 6): string {
  return address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}
