import type { VerificationMethod } from "@/lib/database.types";

// One interface for every payment record (reward payout or vendor sale).
//
// Level 1 (always available): a person confirms the payment and records its txid
//   (admin for rewards, vendor for sales) -> verified_by = "manual".
// Level 2 (optional worker, see /worker): a view-only light wallet reads the reward fund's
//   transactions with its viewing key, matches memos, and sets verified_by = "viewing_key".
// If the worker isn't running, records simply stay at Level 1. Nothing depends on it.

export interface PaymentRecord {
  status: string;
  txid: string | null;
  verified_by: VerificationMethod | null;
}

export type VerificationResult = "verified" | "pending";

export function verifyPayment(record: PaymentRecord): VerificationResult {
  const paid = record.status === "paid";
  return paid && !!record.txid && !!record.verified_by ? "verified" : "pending";
}

export const VERIFICATION_LABEL: Record<VerificationMethod, string> = {
  manual: "Confirmed with txid",
  viewing_key: "Verified by viewing key",
};

export const TXID_PATTERN = /^[0-9a-f]{64}$/;

/** Public explorer link for a txid. Shielded details stay hidden; it only proves the tx exists. */
export function explorerUrl(txid: string, network: "mainnet" | "testnet"): string | null {
  if (!TXID_PATTERN.test(txid)) return null;
  return network === "mainnet" ? `https://blockchair.com/zcash/transaction/${txid}` : null;
}
