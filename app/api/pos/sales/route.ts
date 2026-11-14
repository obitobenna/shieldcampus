import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSale, isApproved } from "@/lib/sales";
import { createSaleSchema } from "@/lib/validation/pos";
import { getShopForOwner } from "@/lib/vendors";

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

  const sale = await createSale(shop, input.amountNgn, input.note ?? null);
  const body: CreateSaleResponse = { id: sale.id };
  return NextResponse.json(body, { status: 201 });
});
