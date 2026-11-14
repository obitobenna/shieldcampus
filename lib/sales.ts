import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SaleRow, VendorRow } from "@/lib/database.types";
import { getZecRates } from "@/lib/rates";
import { buildZip321Uri, formatZatoshis, ngnToZatoshis } from "@/lib/zcash";

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

// ---------------------------------------------------------------------------
// Creating a sale. Used by the vendor's till and by the customer "scan the shop QR" flow.
// ---------------------------------------------------------------------------

/** Pending sales older than this are treated as abandoned and cancelled when the vendor opens the till. */
export const ABANDONED_AFTER_MS = 2 * 60 * 60 * 1000;
/** How long a customer-started payment request stays open on the customer's screen and in the till's "Incoming" list. */
export const REQUEST_TTL_MS = 15 * 60 * 1000;

export interface CreatedSale {
  id: number;
  memo: string;
  uri: string;
  address: string;
  amountNgn: number;
  amountZec: string;
  rateNgn: number;
  rateIsFallback: boolean;
  createdAt: string;
}

/**
 * Converts naira to ZEC/TAZ at the live rate, locks that rate into a new pending sale and stores a
 * ZIP-321 request to the shop's address. The sale never records who the customer is.
 */
export async function createSale(shop: VendorRow, amountNgn: number, note: string | null): Promise<CreatedSale> {
  const rates = await getZecRates();
  const zats = ngnToZatoshis(amountNgn, rates.ngn);
  const db = createAdminClient();

  const { data: sale, error } = await db
    .from("sales")
    .insert({
      vendor_id: shop.id,
      amount_ngn: amountNgn,
      amount_zec: Number(formatZatoshis(zats)),
      rate_ngn_per_zec: Math.round(rates.ngn * 100) / 100,
      rate_source: rates.source,
      note,
    })
    .select("id, memo, created_at")
    .single();
  if (error) throw new Error(error.message);

  const uri = buildZip321Uri({ address: shop.zcash_address, amountZats: zats, memo: sale.memo });
  const { error: uriError } = await db.from("sales").update({ zip321_uri: uri }).eq("id", sale.id);
  if (uriError) throw new Error(uriError.message);

  return {
    id: sale.id,
    memo: sale.memo,
    uri,
    address: shop.zcash_address,
    amountNgn,
    amountZec: formatZatoshis(zats),
    rateNgn: rates.ngn,
    rateIsFallback: rates.source === "fallback",
    createdAt: sale.created_at,
  };
}

/** Cancels this shop's pending sales that nobody paid within ABANDONED_AFTER_MS. Best effort. */
export async function cancelAbandonedSales(vendorId: string): Promise<void> {
  const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS).toISOString();
  const { error } = await createAdminClient()
    .from("sales")
    .update({ status: "cancelled" })
    .eq("vendor_id", vendorId)
    .eq("status", "pending")
    .lt("created_at", cutoff);
  if (error) console.error("[sales] abandoned cleanup failed:", error.message);
}

/** Pending sales from the last REQUEST_TTL_MS, newest first: what the till shows as "Incoming". */
export async function listIncoming(vendorId: string): Promise<SaleRow[]> {
  const since = new Date(Date.now() - REQUEST_TTL_MS).toISOString();
  const { data, error } = await createAdminClient()
    .from("sales")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}
