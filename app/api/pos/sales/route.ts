import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getZecRates } from "@/lib/rates";
import { isApproved } from "@/lib/sales";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSaleSchema } from "@/lib/validation/pos";
import { getShopForOwner } from "@/lib/vendors";
import { buildZip321Uri, formatZatoshis, ngnToZatoshis } from "@/lib/zcash";

export interface CreateSaleResponse {
  id: number;
}

// POST /api/pos/sales: the vendor starts a sale. The naira price is converted to ZEC at the
// current rate, which is locked into the sale, and a ZIP-321 request to the shop's address is stored.
export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession(["vendor"]);
  await enforceRateLimit(`pos:${session.userId}`, 60, 10 * 60, "That's a lot of sales in a few minutes. Wait a moment and try again.");
  const input = await parseJson(request, createSaleSchema);

  const shop = await getShopForOwner(session.userId);
  if (!isApproved(shop)) throw new ApiError(403, "Your till opens once your shop is approved.");

  const rates = await getZecRates();
  const zats = ngnToZatoshis(input.amountNgn, rates.ngn);
  const db = createAdminClient();

  const { data: sale, error } = await db
    .from("sales")
    .insert({
      vendor_id: shop.id,
      amount_ngn: input.amountNgn,
      amount_zec: Number(formatZatoshis(zats)),
      rate_ngn_per_zec: Math.round(rates.ngn * 100) / 100,
      rate_source: rates.source,
      note: input.note ?? null,
    })
    .select("id, memo")
    .single();
  if (error) throw new Error(error.message);

  const uri = buildZip321Uri({ address: shop.zcash_address, amountZats: zats, memo: sale.memo });
  const { error: uriError } = await db.from("sales").update({ zip321_uri: uri }).eq("id", sale.id);
  if (uriError) throw new Error(uriError.message);

  const body: CreateSaleResponse = { id: sale.id };
  return NextResponse.json(body, { status: 201 });
});
