"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Store } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import type { VendorCategory, VendorStatus } from "@/lib/database.types";
import { fetchJson } from "@/lib/fetch-json";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-categories";
import { shortAddress } from "@/lib/zcash";

export interface QueueVendor {
  id: string;
  businessName: string;
  category: VendorCategory;
  location: string;
  description: string | null;
  address: string;
  status: VendorStatus;
  ownerName: string;
  createdAt: string;
  paidSales: number;
}

const STATUS: Record<VendorStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Awaiting approval", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  suspended: { label: "Suspended", tone: "danger" },
};

const dateFmt = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

export function VendorQueue({ vendors }: { vendors: QueueVendor[] }) {
  if (vendors.length === 0) {
    return <EmptyState icon={Store} title="No vendors yet" body="Shops appear here when vendors sign up and submit their details." />;
  }
  const order: VendorStatus[] = ["pending", "approved", "suspended"];
  return (
    <div className="space-y-10">
      {order.map((status) => {
        const group = vendors.filter((v) => v.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} aria-label={STATUS[status].label}>
            <h2 className="flex items-center gap-2 text-lg">
              {status === "pending" ? "Waiting for approval" : status === "approved" ? "Approved shops" : "Suspended"}
              <span className="font-mono text-sm font-normal text-ink-muted">{group.length}</span>
            </h2>
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
              {group.map((v) => (
                <VendorRowItem key={v.id} vendor={v} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function VendorRowItem({ vendor }: { vendor: QueueVendor }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "suspend" | "reinstate") {
    setBusy(action);
    setError(null);
    const res = await fetchJson(`/api/admin/vendors/${vendor.id}`, { method: "POST", json: { action } });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr_1.2fr_auto] md:items-start md:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{vendor.businessName}</p>
          <Badge tone={STATUS[vendor.status].tone}>{STATUS[vendor.status].label}</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {VENDOR_CATEGORY_LABEL[vendor.category]} · {vendor.location}
        </p>
        {vendor.description ? <p className="mt-1 text-sm">{vendor.description}</p> : null}
        <p className="mt-2 text-xs text-ink-muted">
          Owner {vendor.ownerName} · applied {dateFmt.format(new Date(vendor.createdAt))}
          {vendor.status !== "pending" ? ` · ${vendor.paidSales} paid sales` : ""}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">Receives payments at</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="truncate font-mono text-xs" title={vendor.address}>
            {shortAddress(vendor.address, 14, 8)}
          </span>
          <CopyButton value={vendor.address} label="address" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {vendor.status === "pending" ? (
          <>
            <Button size="sm" onClick={() => act("approve")} loading={busy === "approve"}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => act("suspend")} loading={busy === "suspend"}>
              Decline
            </Button>
          </>
        ) : vendor.status === "approved" ? (
          <Button size="sm" variant="secondary" onClick={() => act("suspend")} loading={busy === "suspend"}>
            Suspend
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => act("reinstate")} loading={busy === "reinstate"}>
            Reinstate
          </Button>
        )}
      </div>
      {error ? (
        <div className="md:col-span-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
    </li>
  );
}
