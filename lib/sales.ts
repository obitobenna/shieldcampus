import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SaleRow, VendorRow } from "@/lib/database.types";

/** A sale, only if it belongs to the given vendor. */
export async function getSaleForVendor(saleId: number, vendorId: string): Promise<SaleRow | null> {
  if (!Number.isSafeInteger(saleId) || saleId <= 0) return null;
  const { data, error } = await createAdminClient().from("sales").select("*").eq("id", saleId).eq("vendor_id", vendorId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSalesForVendor(vendorId: string, limit = 200): Promise<SaleRow[]> {
  const { data, error } = await createAdminClient()
    .from("sales")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface SalesTotals {
  count: number;
  ngn: number;
  zec: number;
}

export function totals(sales: SaleRow[]): SalesTotals {
  return sales.reduce(
    (t, s) => ({ count: t.count + 1, ngn: t.ngn + Number(s.amount_ngn), zec: t.zec + Number(s.amount_zec) }),
    { count: 0, ngn: 0, zec: 0 },
  );
}

export function isApproved(shop: VendorRow | null): shop is VendorRow & { status: "approved" } {
  return !!shop && shop.status === "approved";
}
