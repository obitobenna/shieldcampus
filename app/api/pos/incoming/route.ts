import { NextResponse } from "next/server";
import { ApiError, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { formatZec } from "@/lib/format";
import { isApproved, listIncoming } from "@/lib/sales";
import { getShopForOwner } from "@/lib/vendors";

export const dynamic = "force-dynamic";

export interface IncomingSale {
  id: number;
  amountNgn: number;
  amountZec: string;
  note: string | null;
  createdAt: string;
}

export interface IncomingResponse {
  sales: IncomingSale[];
}

// GET /api/pos/incoming: the vendor's open payment requests from the last 15 minutes,
// including ones customers started by scanning the shop QR. The till polls this.
export const GET = withApi(async () => {
  const session = await requireApiSession(["vendor"]);
  const shop = await getShopForOwner(session.userId);
  if (!isApproved(shop)) throw new ApiError(403, "Your till opens once your shop is approved.");

  const rows = await listIncoming(shop.id);
  const body: IncomingResponse = {
    sales: rows.map((s) => ({
      id: s.id,
      amountNgn: Number(s.amount_ngn),
      amountZec: formatZec(Number(s.amount_zec)),
      note: s.note,
      createdAt: s.created_at,
    })),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
});
