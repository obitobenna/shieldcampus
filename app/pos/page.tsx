import type { Metadata } from "next";
import Link from "next/link";
import { Store } from "lucide-react";
import { KeypadTerminal } from "@/components/pos/keypad-terminal";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePageSession } from "@/lib/auth";
import { formatNaira, formatZec } from "@/lib/format";
import { getZecRates } from "@/lib/rates";
import { cancelAbandonedSales, isApproved, listIncoming } from "@/lib/sales";
import { IncomingPayments } from "@/components/pos/incoming-payments";
import { getShopForOwner } from "@/lib/vendors";
import { COIN, DEMO_SUFFIX } from "@/lib/network";

export const metadata: Metadata = { title: "Till" };
export const dynamic = "force-dynamic";

export default async function PosPage() {
  const session = await requirePageSession(["vendor"], "/pos");
  const shop = await getShopForOwner(session.userId);

  if (!isApproved(shop)) {
    return (
      <div className="page py-10">
        <EmptyState
          className="mx-auto max-w-lg"
          icon={Store}
          title={shop?.status === "suspended" ? "Your till is paused" : "Your till opens after approval"}
          body={
            !shop
              ? "Add your shop details first. The ShieldCampus team approves every shop before it can take payments."
              : shop.status === "suspended"
                ? "Your shop has been paused. Please contact the ShieldCampus team at the help desk."
                : "Your shop is waiting for approval. This usually happens within a few hours during the conference."
          }
          action={<ButtonLink href="/vendor">Go to your shop</ButtonLink>}
        />
      </div>
    );
  }

  await cancelAbandonedSales(shop.id);
  const [rates, incoming] = await Promise.all([getZecRates(), listIncoming(shop.id)]);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg">{shop.business_name}</h1>
          <p className="font-mono text-xs text-ink-muted">
            1 {COIN} = {formatNaira(Math.round(rates.ngn))}
            {DEMO_SUFFIX}
          </p>
        </div>
        <span className="flex shrink-0 items-baseline gap-3">
          <Link href="/vendor/qr" className="text-sm font-medium text-brand underline underline-offset-4">
            Shop QR
          </Link>
          <Link href="/vendor/sales" className="text-sm font-medium text-brand underline underline-offset-4">
            Sales
          </Link>
        </span>
      </div>
      <IncomingPayments
        initial={incoming.map((s) => ({
          id: s.id,
          amountNgn: Number(s.amount_ngn),
          amountZec: formatZec(Number(s.amount_zec)),
          note: s.note,
          createdAt: s.created_at,
        }))}
      />
      <div className="mt-5">
        <KeypadTerminal ngnPerZec={rates.ngn} rateIsFallback={rates.source === "fallback"} />
      </div>
    </div>
  );
}
