import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import type { Database, SaleStatus } from "@/lib/database.types";
import { getSaleForVendor } from "@/lib/sales";
import { createAdminClient } from "@/lib/supabase/admin";
import { saleActionSchema } from "@/lib/validation/pos";
import { getShopForOwner } from "@/lib/vendors";

export interface SaleActionResponse {
  id: number;
  status: SaleStatus;
}

// POST /api/pos/sales/[id]: { action: "paid", txid? } or { action: "cancel" }.
// The vendor marks a sale paid after seeing the payment arrive in their own wallet.
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

  if (input.action === "paid") {
    if (input.txid) {
      const { data: dupe } = await db.from("sales").select("id").eq("txid", input.txid).maybeSingle();
      if (dupe) throw new ApiError(409, `That transaction ID is already recorded for sale #${dupe.id}.`, { txid: "Already used." });
    }
    update = {
      status: "paid",
      paid_at: now,
      txid: input.txid ?? null,
      verified_by: input.txid ? "manual" : null,
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
    .select("id, status")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "That transaction ID is already recorded.", { txid: "Already used." });
    throw new Error(error.message);
  }
  if (!saved) throw new ApiError(409, "This sale was just updated. Refresh to see it.");
  if (saved.status === "paid") revalidateTag("impact");

  const body: SaleActionResponse = { id: saved.id, status: saved.status };
  return NextResponse.json(body);
});
