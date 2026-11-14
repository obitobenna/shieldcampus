import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { CustomerPay } from "@/components/pay/customer-pay";
import { NetworkBadge } from "@/components/zcash/network-badge";
import { getZecRates } from "@/lib/rates";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-categories";
import { getApprovedShopBySlug } from "@/lib/vendors";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getApprovedShopBySlug(slug).catch(() => null);
  return { title: shop ? `Pay ${shop.business_name}` : "Pay a vendor", robots: { index: false } };
}

// Opened by scanning a shop's printed QR sticker (or "Pay" in the vendor directory).
// Public: no login needed, so paying is as fast as possible and stays anonymous.
export default async function PayShopPage({ params }: Props) {
  const { slug } = await params;
  const shop = await getApprovedShopBySlug(slug);
  if (!shop) notFound();
  const rates = await getZecRates();

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-12 pt-6">
      <div className="mb-6 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Pay with Zcash</p>
            <h1 className="mt-1 truncate text-lg">{shop.business_name}</h1>
          </div>
          <NetworkBadge className="shrink-0" />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
          {VENDOR_CATEGORY_LABEL[shop.category]} ·
          <MapPin aria-hidden className="h-4 w-4 shrink-0" />
          <span className="truncate">{shop.location}</span>
        </p>
      </div>
      <CustomerPay slug={shop.slug} shopName={shop.business_name} ngnPerZec={rates.ngn} />
    </div>
  );
}
