import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VendorRow } from "@/lib/database.types";

export async function getShopForOwner(ownerId: string): Promise<VendorRow | null> {
  const { data, error } = await createAdminClient().from("vendors").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error(`Loading shop failed: ${error.message}`);
  return data;
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "shop"
  );
}

// "Mama Nkechi's Kitchen" -> "mama-nkechis-kitchen", or "-2", "-3"... if taken.
export async function uniqueSlug(name: string, excludeVendorId?: string): Promise<string> {
  const base = slugify(name);
  const { data, error } = await createAdminClient().from("vendors").select("id, slug").like("slug", `${base}%`);
  if (error) throw new Error(error.message);
  const taken = new Set((data ?? []).filter((v) => v.id !== excludeVendorId).map((v) => v.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export interface DirectoryVendor {
  slug: string;
  business_name: string;
  category: VendorRow["category"];
  location: string;
  description: string | null;
}

// Public vendor directory: approved shops only, no addresses or owner details.
export const getVendorDirectory = unstable_cache(
  async (): Promise<DirectoryVendor[]> => {
    const { data, error } = await createAdminClient()
      .from("vendors")
      .select("slug, business_name, category, location, description")
      .eq("status", "approved")
      .order("business_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["vendor-directory"],
  { revalidate: 60, tags: ["vendors"] },
);

/** An approved shop by its public slug (used by the "scan the shop QR" pay page). */
export async function getApprovedShopBySlug(slug: string): Promise<VendorRow | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data, error } = await createAdminClient().from("vendors").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
  if (error) throw new Error(`Loading shop failed: ${error.message}`);
  return data;
}
