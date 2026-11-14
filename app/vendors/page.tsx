import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { VendorCategory } from "@/lib/database.types";
import { cn } from "@/lib/cn";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-categories";
import { getVendorDirectory, type DirectoryVendor } from "@/lib/vendors";
import { COIN } from "@/lib/network";

export const metadata: Metadata = {
  title: "Vendors who accept ZEC",
  description: "Campus food spots, printing shops, data sellers and barbers that accept private Zcash payments.",
};

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  let vendors: DirectoryVendor[] = [];
  let failed = false;
  try {
    vendors = await getVendorDirectory();
  } catch (err) {
    console.error("[vendors] directory unavailable", err);
    failed = true;
  }

  const present = [...new Set(vendors.map((v) => v.category))] as VendorCategory[];
  const active = category && present.includes(category as VendorCategory) ? (category as VendorCategory) : null;
  const shown = active ? vendors.filter((v) => v.category === active) : vendors;

  return (
    <div className="page py-10 md:py-14">
      <p className="eyebrow">Spend it on campus</p>
      <h1 className="mt-2 text-xl md:text-2xl">Vendors who accept ZEC</h1>
      <p className="mt-3 max-w-prose text-ink-muted">
        Pay with your shielded wallet: scan the QR sticker at the shop (or tap Pay below), type the price in naira and confirm
        in your wallet. Or let the vendor show you a QR with the price. Nobody else can see what you bought.
      </p>

      {present.length > 1 ? (
        <nav aria-label="Filter by category" className="mt-8 flex flex-wrap gap-2">
          <FilterLink href="/vendors" active={!active} label={`All (${vendors.length})`} />
          {present.map((c) => (
            <FilterLink key={c} href={`/vendors?category=${c}`} active={active === c} label={VENDOR_CATEGORY_LABEL[c]} />
          ))}
        </nav>
      ) : null}

      {failed ? (
        <EmptyState className="mt-8" icon={Store} title="Vendors couldn't load" body="Please refresh the page in a moment." />
      ) : shown.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={Store}
          title="The first campus vendors are joining now"
          body="Run a food spot, printing shop, data kiosk or barbing salon on campus? Accept ZEC with a simple QR till on your phone."
          action={<ButtonLink href="/signup?as=vendor" variant="secondary">Register your shop</ButtonLink>}
        />
      ) : (
        <ul className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((v) => (
            <li key={v.slug} className="flex flex-col gap-3 bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{v.business_name}</p>
                <Badge tone="zec" dot className="shrink-0">
                  Accepts {COIN}
                </Badge>
              </div>
              <p className="text-sm text-ink-muted">{VENDOR_CATEGORY_LABEL[v.category]}</p>
              {v.description ? <p className="text-sm">{v.description}</p> : null}
              <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                <p className="flex min-w-0 items-center gap-1.5 text-sm text-ink-muted">
                  <MapPin aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="truncate">{v.location}</span>
                </p>
                <ButtonLink href={`/pay/${v.slug}`} size="sm" variant="zec" className="shrink-0">
                  Pay
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-ink-muted">
        Own a shop on campus?{" "}
        <Link href="/signup?as=vendor" className="font-medium text-brand underline underline-offset-4">
          Start accepting ZEC
        </Link>
      </p>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out",
        active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
