import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShopQrSticker } from "@/components/vendor/shop-qr-sticker";
import { requirePageSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getNetworkInfo } from "@/lib/active-network";
import { isApproved } from "@/lib/sales";
import { getShopForOwner } from "@/lib/vendors";

export const metadata: Metadata = { title: "Shop QR" };
export const dynamic = "force-dynamic";

export default async function ShopQrPage() {
  const { isTestnet: IS_TESTNET } = await getNetworkInfo();
  const session = await requirePageSession(["vendor"], "/vendor/qr");
  const shop = await getShopForOwner(session.userId);
  if (!isApproved(shop)) redirect("/vendor");

  const url = `${env().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "")}/pay/${shop.slug}`;

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-12 pt-6 print:max-w-none print:p-0">
      <div className="mb-6 print:hidden">
        <p className="eyebrow">Your shop QR</p>
        <h1 className="mt-1 text-lg">Let customers pay from their own phone</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Print this and stick it on your counter. Customers scan it, type the price and pay. Each payment appears under{" "}
          <Link href="/pos" className="font-medium text-brand underline underline-offset-4">
            Incoming payments
          </Link>{" "}
          on your till. Tap it and mark it paid once it shows in your wallet.
        </p>
      </div>
      <ShopQrSticker url={url} shopName={shop.business_name} location={shop.location} testnet={IS_TESTNET} />
    </div>
  );
}
