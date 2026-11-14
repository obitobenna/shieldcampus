// Pure matching logic for Level 2 payment verification. No I/O, so it's unit-tested directly.

/** What we expect to find on-chain for one reward payout or vendor sale. */
export interface PaymentExpectation {
  kind: "reward" | "sale";
  id: number;
  /** "ShieldCampus reward #<id>" or "ShieldCampus sale #<id>" */
  memo: string;
  amountZats: bigint;
  /** Recipient address (student for rewards, vendor for sales). */
  address: string;
  /** Known txid, if a person already entered one. */
  txid?: string | null;
}

/** One shielded output as reported by a wallet, normalised. */
export interface ObservedOutput {
  txid: string;
  memo: string | null;
  valueZats: bigint;
  address?: string | null;
}

export const AMOUNT_TOLERANCE_BPS = 100n; // 1%

export function expectedMemo(kind: "reward" | "sale", id: number): string {
  return `ShieldCampus ${kind} #${id}`;
}

/** Wallets return memos as hex (512 bytes, zero-padded). Returns null for empty / non-text memos. */
export function decodeMemoHex(hex: string): string | null {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  // ZIP-302: first byte > 0xF4 means "not text" (0xF6 = empty memo).
  if (bytes.length === 0 || bytes[0]! > 0xf4) return null;
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, end));
  } catch {
    return null;
  }
}

function normaliseMemo(m: string | null | undefined): string {
  return (m ?? "").replace(/\0+$/, "").trim().toLowerCase();
}

export function amountWithinTolerance(observed: bigint, expected: bigint): boolean {
  if (expected <= 0n) return false;
  const diff = observed > expected ? observed - expected : expected - observed;
  return diff * 10_000n <= expected * AMOUNT_TOLERANCE_BPS;
}

/**
 * Finds the output that pays this expectation: exact memo match (case-insensitive, trimmed)
 * and amount within 1%. If a txid is already known, only outputs of that transaction count.
 */
export function matchPayment(outputs: ObservedOutput[], exp: PaymentExpectation): ObservedOutput | null {
  const memo = normaliseMemo(exp.memo);
  const txid = exp.txid?.toLowerCase() ?? null;
  return (
    outputs.find(
      (o) =>
        (!txid || o.txid.toLowerCase() === txid) &&
        normaliseMemo(o.memo) === memo &&
        // Address isn't compared: wallets may report one receiver of a unified address instead of the
        // full UA. Memo + amount (+ txid) is specific enough, and the memo carries our record id.
        amountWithinTolerance(o.valueZats, exp.amountZats),
    ) ?? null
  );
}

/** Reads one output object from z_listunspent / z_viewtransaction, tolerating field-name differences. */
export function normaliseOutput(raw: unknown, fallbackTxid?: string): ObservedOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const txid = typeof r.txid === "string" ? r.txid : fallbackTxid;
  if (!txid) return null;

  let valueZats: bigint | null = null;
  for (const key of ["valueZat", "amountZat", "valueZats", "amountZats"]) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      valueZats = BigInt(Math.round(v));
      break;
    }
  }
  if (valueZats === null) {
    for (const key of ["value", "amount"]) {
      const v = r[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        valueZats = BigInt(Math.round(v * 1e8));
        break;
      }
    }
  }
  if (valueZats === null) return null;

  const memo =
    typeof r.memoStr === "string" ? r.memoStr : typeof r.memo === "string" ? decodeMemoHex(r.memo) : null;
  const address = typeof r.address === "string" ? r.address : null;
  return { txid, memo, valueZats, address };
}
