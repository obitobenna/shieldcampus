import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getApprovedVendors } from "@/lib/impact";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-categories";

export async function VendorStrip() {
  let vendors: Awaited<ReturnType<typeof getApprovedVendors>> = [];
  try {
    vendors = await getApprovedVendors(8);
  } catch (err) {
    console.error("[landing] vendors unavailable", err);
  }

  if (vendors.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="The first campus vendors are joining now"
        body="Run a food spot, printing shop, data kiosk or barbing salon on campus? Accept ZEC with a simple QR till on your phone. Prices stay in naira."
        action={
          <ButtonLink href="/signup?as=vendor" variant="secondary">
            Register your shop
          </ButtonLink>
        }
      />
    );
  }

  return (
    <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {vendors.map((v) => (
        <li key={v.slug} className="flex flex-col gap-3 bg-surface p-5">
          <Badge tone="zec" dot className="self-start">
            Accepts ZEC
          </Badge>
          <div>
            <p className="font-semibold">{v.business_name}</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              {VENDOR_CATEGORY_LABEL[v.category]} · {v.location}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function VendorStripSkeleton() {
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 bg-surface p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}
