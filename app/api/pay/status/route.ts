import { NextResponse } from "next/server";
import { ApiError, withApi } from "@/lib/api";
import type { SaleStatus } from "@/lib/database.types";
import { checkPayToken } from "@/lib/pay-token";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface PayStatusResponse {
  status: SaleStatus;
}

// GET /api/pay/status?sale=<id>&t=<token>: lets the customer's screen show "Paid" once the vendor
// confirms. Only works with the token the customer got when starting the payment.
export const GET = withApi(async (request: Request) => {
  const url = new URL(request.url);
  const saleId = Number(url.searchParams.get("sale"));
  if (!checkPayToken(saleId, url.searchParams.get("t") ?? "")) throw new ApiError(404, "Payment not found.");

  const { data, error } = await createAdminClient().from("sales").select("status").eq("id", saleId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError(404, "Payment not found.");

  const body: PayStatusResponse = { status: data.status };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
});
