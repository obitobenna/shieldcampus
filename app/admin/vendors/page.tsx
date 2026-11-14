import type { Metadata } from "next";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { VendorQueue, type QueueVendor } from "@/components/admin/vendor-queue";
import { requirePageSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Vendors · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminVendorsPage() {
  await requirePageSession(["admin"], "/admin/vendors");
  const db = createAdminClient();

  const { data: vendors, error } = await db.from("vendors").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  const rows = vendors ?? [];

  const ownerIds = rows.map((v) => v.owner_id);
  const vendorIds = rows.map((v) => v.id);
  const [{ data: owners }, { data: paidSales }] = await Promise.all([
    ownerIds.length ? db.from("profiles").select("id, name").in("id", ownerIds) : Promise.resolve({ data: [] }),
    vendorIds.length ? db.from("sales").select("vendor_id").eq("status", "paid").in("vendor_id", vendorIds) : Promise.resolve({ data: [] }),
  ]);
  const ownerName = new Map((owners ?? []).map((o) => [o.id, o.name]));
  const salesCount = new Map<string, number>();
  for (const s of paidSales ?? []) salesCount.set(s.vendor_id, (salesCount.get(s.vendor_id) ?? 0) + 1);

  const queue: QueueVendor[] = rows.map((v) => ({
    id: v.id,
    businessName: v.business_name,
    category: v.category,
    location: v.location,
    description: v.description,
    address: v.zcash_address,
    status: v.status,
    ownerName: ownerName.get(v.owner_id) ?? "Unknown",
    createdAt: v.created_at,
    paidSales: salesCount.get(v.id) ?? 0,
  }));

  return (
    <div className="page py-10 md:py-14">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 text-xl md:text-2xl">Vendors</h1>
      <p className="mt-3 max-w-prose text-ink-muted">
        Approve shops you have checked in person. Approved shops appear in the public directory and can open their till.
        If a shop changes its receiving address, it comes back here for approval.
      </p>
      <div className="mt-8">
        <AdminTabs current="vendors" pendingVendors={queue.filter((v) => v.status === "pending").length} />
      </div>
      <div className="mt-8">
        <VendorQueue vendors={queue} />
      </div>
    </div>
  );
}
