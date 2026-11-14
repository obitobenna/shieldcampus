import { NextResponse } from "next/server";
import { ApiError, clientIp, parseJson, withApi } from "@/lib/api";
import { payToken } from "@/lib/pay-token";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSale, REQUEST_TTL_MS } from "@/lib/sales";
import { createSaleSchema } from "@/lib/validation/pos";
import { getApprovedShopBySlug } from "@/lib/vendors";

export interface CustomerPayResponse {
  saleId: number;
  token: string;
  uri: string;
  address: string;
  memo: string;
  amountNgn: number;
  amountZec: string;
  rateNgn: number;
  rateIsFallback: boolean;
  expiresAt: string;
}

// POST /api/pay/[slug]: a customer who scanned a shop's QR sticker starts a payment for an amount
// they type. No login needed, and the sale stores nothing about who the customer is: it stays as
// private as a vendor-started sale. Rate limits stop anyone flooding a shop's till.
export const POST = withApi(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  await enforceRateLimit(`pay:ip:${clientIp(request)}`, 12, 10 * 60, "Too many payment requests from this network. Wait a few minutes and try again.");
  const input = await parseJson(request, createSaleSchema);

  const shop = await getApprovedShopBySlug(slug);
  if (!shop) throw new ApiError(404, "This shop isn't taking payments right now.");
  await enforceRateLimit(`pay:shop:${shop.id}`, 60, 10 * 60, "This shop is very busy right now. Ask the vendor to charge you from their till.");

  const sale = await createSale(shop, input.amountNgn, input.note ?? null);
  const body: CustomerPayResponse = {
    saleId: sale.id,
    token: payToken(sale.id),
    uri: sale.uri,
    address: sale.address,
    memo: sale.memo,
    amountNgn: sale.amountNgn,
    amountZec: sale.amountZec,
    rateNgn: sale.rateNgn,
    rateIsFallback: sale.rateIsFallback,
    expiresAt: new Date(new Date(sale.createdAt).getTime() + REQUEST_TTL_MS).toISOString(),
  };
  return NextResponse.json(body, { status: 201 });
});
