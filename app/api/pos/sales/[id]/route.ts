import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import type { Database, SaleRow, SaleStatus, VerificationMethod } from "@/lib/database.types";
import type { PaymentExpectation } from "@/lib/payment-match";
import { autoVerifyEnabled, getPaymentVerifier, upgradeVerification } from "@/lib/payment-verifier";
import { getSaleForVendor } from "@/lib/sales";
import { createAdminClient } from "@/lib/supabase/admin";
import { saleActionSchema } from "@/lib/validation/pos";
import { getShopForOwner } from "@/lib/vendors";
import { zecToZatoshis } from "@/lib/zcash";

export interface SaleActionResponse {
  id: number;
  status: SaleStatus;
  verifiedBy?: VerificationMethod | null;
  /** Only for action "check": what the automatic check found. */
  check?: { found: boolean; message: string };
}

function expectationFor(sale: SaleRow, txid?: string | null): PaymentExpectation {
  return {
    kind: "sale",
    id: sale.id,
    memo: sale.memo,
    amountZats: zecToZatoshis(Number(sale.amount_zec)),
    // The address this sale was created for, from its stored ZIP-321 request.
    address: (sale.zip321_uri ?? "").slice("zcash:".length).split("?")[0] ?? "",
    txid,
  };
}

// POST /api/pos/sales/[id]: { action: "paid", txid? } | { action: "cancel" } | { action: "check" }.
// The vendor marks a sale paid after seeing the payment arrive in their own wallet (Level 1).
// With PAYMENT_VERIFIER=zallet, "check" asks the wallet node to find it automatically (Level 2).
export const POST = withApi(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession(["vendor"]);
  const { id: rawId } = await ctx.params;
  const input = await parseJson(request, saleActionSchema);

  const shop = await getShopForOwner(session.userId);
  if (!shop) throw new ApiError(404, "Sale not found.");
  const sale = await getSaleForVendor(Number(rawId), shop.id);
  if (!sale) throw new ApiError(404, "Sale not found.");
  if (sale.status !== "pending") throw new ApiError(409, `This sale is already ${sale.status === "paid" ? "paid" : "cancelled"}.`);

  const now = new Date().toISOString();
  const db = createAdminClient();
  let update: Database["public"]["Tables"]["sales"]["Update"];

  if (input.action === "check") {
    if (!autoVerifyEnabled()) {
      return NextResponse.json<SaleActionResponse>({
        id: sale.id,
        status: sale.status,
        check: { found: false, message: "Automatic checking is off. Confirm the payment from your wallet." },
      });
    }
    const outcome = await getPaymentVerifier().verify(expectationFor(sale));
    if (outcome.status !== "verified") {
      return NextResponse.json<SaleActionResponse>({ id: sale.id, status: sale.status, check: { found: false, message: outcome.message } });
    }
    const { data: dupe } = await db.from("sales").select("id").eq("txid", outcome.txid).maybeSingle();
    if (dupe) {
      return NextResponse.json<SaleActionResponse>({
        id: sale.id,
        status: sale.status,
        check: { found: false, message: `The matching transaction is already recorded for sale #${dupe.id}.` },
      });
    }
    update = { status: "paid", paid_at: now, txid: outcome.txid, verified_by: outcome.method, verified_at: now };
  } else if (input.action === "paid") {
    if (input.txid) {
      const { data: dupe } = await db.from("sales").select("id").eq("txid", input.txid).maybeSingle();
      if (dupe) throw new ApiError(409, `That transaction ID is already recorded for sale #${dupe.id}.`, { txid: "Already used." });
    }
    const verifiedBy = input.txid ? await upgradeVerification({ ...expectationFor(sale, input.txid), txid: input.txid }) : null;
    update = {
      status: "paid",
      paid_at: now,
      txid: input.txid ?? null,
      verified_by: verifiedBy,
      verified_at: input.txid ? now : null,
    };
  } else {
    update = { status: "cancelled" };
  }

  const { data: saved, error } = await db
    .from("sales")
    .update(update)
    .eq("id", sale.id)
    .eq("status", "pending")
    .select("id, status, verified_by")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "That transaction ID is already recorded.", { txid: "Already used." });
    throw new Error(error.message);
  }
  if (!saved) throw new ApiError(409, "This sale was just updated. Refresh to see it.");
  if (saved.status === "paid") revalidateTag("impact");

  const body: SaleActionResponse = {
    id: saved.id,
    status: saved.status,
    verifiedBy: saved.verified_by,
    ...(input.action === "check" ? { check: { found: true, message: "Payment found and verified by the wallet node." } } : {}),
  };
  return NextResponse.json(body);
});
