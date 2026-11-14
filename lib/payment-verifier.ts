import "server-only";
import type { VerificationMethod } from "@/lib/database.types";
import { env } from "@/lib/env";
import { matchPayment, normaliseOutput, type ObservedOutput, type PaymentExpectation } from "@/lib/payment-match";
import { TXID_PATTERN } from "@/lib/verification";
import { RpcError, walletRpc, type ZcashRpcClient } from "@/lib/zcash-rpc";

// Payment verification behind one interface.
//
// Level 1, ManualVerifier (always works): a person confirms the payment arrived and records its txid.
// Level 2, ZalletVerifier (optional): asks a Zallet wallet you run, which holds the reward fund's
//   (and optionally vendors') VIEWING keys, whether a matching shielded output exists: memo
//   "ShieldCampus reward #<id>" / "ShieldCampus sale #<id>" and amount within 1%.
//
// Select with PAYMENT_VERIFIER=manual|zallet. If Zallet is unreachable or misconfigured, every call
// falls back to manual. Verification never throws and never blocks the Level 1 flow.
// No spending keys are ever used or stored: this code only reads.

export type VerifyOutcome =
  | { status: "verified"; method: VerificationMethod; txid: string }
  | { status: "not_found"; message: string }
  | { status: "manual"; message: string };

export interface PaymentVerifier {
  readonly name: "manual" | "zallet";
  verify(expectation: PaymentExpectation): Promise<VerifyOutcome>;
}

export class ManualVerifier implements PaymentVerifier {
  readonly name = "manual" as const;

  async verify(exp: PaymentExpectation): Promise<VerifyOutcome> {
    if (exp.txid && TXID_PATTERN.test(exp.txid)) return { status: "verified", method: "manual", txid: exp.txid };
    return { status: "manual", message: "Check your wallet, then confirm the payment with its transaction ID." };
  }
}

export class ZalletVerifier implements PaymentVerifier {
  readonly name = "zallet" as const;
  private readonly manual = new ManualVerifier();

  constructor(private readonly rpc: ZcashRpcClient) {}

  async verify(exp: PaymentExpectation): Promise<VerifyOutcome> {
    try {
      const outputs = exp.txid ? await this.outputsOfTx(exp.txid) : await this.receivedAt(exp.address);
      const hit = matchPayment(outputs, exp);
      if (hit) return { status: "verified", method: "viewing_key", txid: hit.txid.toLowerCase() };
      return {
        status: "not_found",
        message: exp.txid
          ? "The wallet node can't see a matching memo and amount in that transaction yet. It may need a few more minutes to sync."
          : "No matching payment found yet. Wait for the wallet to show it, or confirm it manually.",
      };
    } catch (err) {
      // Unreachable, timeout, bad credentials, or a method this Zallet version doesn't support:
      // fall back to Level 1 rather than failing the request.
      const reason = err instanceof RpcError ? err.message : "Unexpected verifier error.";
      console.error("[verifier] zallet unavailable, using manual:", reason);
      const fallback = await this.manual.verify(exp);
      return fallback.status === "verified"
        ? fallback
        : { status: "manual", message: "Automatic check is unavailable right now. Confirm the payment manually." };
    }
  }

  /** z_viewtransaction: outputs (incoming and outgoing) the wallet's keys can decrypt. */
  private async outputsOfTx(txid: string): Promise<ObservedOutput[]> {
    const tx = await this.rpc.call<{ outputs?: unknown[] }>("z_viewtransaction", [txid]);
    return (tx?.outputs ?? []).map((o) => normaliseOutput(o, txid)).filter((o): o is ObservedOutput => !!o);
  }

  /** z_listunspent filtered to one address: notes received there (needs that address's viewing key in Zallet). */
  private async receivedAt(address: string): Promise<ObservedOutput[]> {
    const notes = await this.rpc.call<unknown[]>("z_listunspent", [0, 9_999_999, true, [address]]);
    return (Array.isArray(notes) ? notes : []).map((n) => normaliseOutput(n)).filter((o): o is ObservedOutput => !!o);
  }
}

/** The configured verifier. Zallet selected but not configured -> manual, with a log line. */
export function getPaymentVerifier(): PaymentVerifier {
  if (env().PAYMENT_VERIFIER === "zallet") {
    const rpc = walletRpc();
    if (rpc) return new ZalletVerifier(rpc);
    console.error("[verifier] PAYMENT_VERIFIER=zallet but ZALLET_RPC_URL is not set; using manual.");
  }
  return new ManualVerifier();
}

/** True when automatic (Level 2) checks are switched on and configured. */
export function autoVerifyEnabled(): boolean {
  return env().PAYMENT_VERIFIER === "zallet" && !!env().ZALLET_RPC_URL;
}

/**
 * After a person recorded a txid (Level 1), try to upgrade it to Level 2. Returns "viewing_key"
 * only on a confirmed match; otherwise "manual". Never throws.
 */
export async function upgradeVerification(exp: PaymentExpectation & { txid: string }): Promise<VerificationMethod> {
  if (!autoVerifyEnabled()) return "manual";
  try {
    const outcome = await getPaymentVerifier().verify(exp);
    return outcome.status === "verified" ? outcome.method : "manual";
  } catch {
    return "manual";
  }
}
