import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChargeScreen } from "@/components/pos/charge-screen";
import { requirePageSession } from "@/lib/auth";
import { autoVerifyEnabled } from "@/lib/payment-verifier";
import { formatZec } from "@/lib/format";
import { getSaleForVendor } from "@/lib/sales";
import { getShopForOwner } from "@/lib/vendors";

export const metadata: Metadata = { title: "Charge" };
export const dynamic = "force-dynamic";

export default async function ChargePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePageSession(["vendor"], `/pos/${id}`);
  const shop = await getShopForOwner(session.userId);
  if (!shop) redirect("/vendor");

  const sale = await getSaleForVendor(Number(id), shop.id);
  if (!sale || !sale.zip321_uri) notFound();

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <ChargeScreen
        autoVerify={autoVerifyEnabled()}
        sale={{
          id: sale.id,
          status: sale.status,
          amountNgn: Number(sale.amount_ngn),
          amountZec: formatZec(Number(sale.amount_zec)),
          rateNgn: Number(sale.rate_ngn_per_zec),
          rateIsFallback: sale.rate_source === "fallback",
          note: sale.note,
          memo: sale.memo,
          uri: sale.zip321_uri,
          // The address this sale was created for (from its stored ZIP-321 request), not today's shop address.
          address: sale.zip321_uri.slice("zcash:".length).split("?")[0] ?? shop.zcash_address,
          txid: sale.txid,
        }}
      />
    </div>
  );
}
