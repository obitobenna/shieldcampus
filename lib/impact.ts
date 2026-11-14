import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VendorCategory } from "@/lib/database.types";

// Aggregate, non-identifying numbers only. Safe to show publicly.
export interface PublicImpactSummary {
  students: number;
  lessonsCompleted: number;
  walletsSetUp: number;
  rewardsPaid: number;
  activeVendors: number;
  merchantPayments: number;
}

async function loadSummary(): Promise<PublicImpactSummary> {
  const db = createAdminClient();
  const count = async (p: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count: c, error } = await p;
    if (error) throw new Error(error.message);
    return c ?? 0;
  };

  const { data: walletLesson } = await db.from("lessons").select("id").eq("slug", "wallet-setup").maybeSingle();

  const [students, lessonsCompleted, walletsSetUp, rewardsPaid, activeVendors, merchantPayments] = await Promise.all([
    count(db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")),
    count(db.from("lesson_progress").select("user_id", { count: "exact", head: true }).eq("status", "completed")),
    walletLesson
      ? count(
          db
            .from("lesson_progress")
            .select("user_id", { count: "exact", head: true })
            .eq("lesson_id", walletLesson.id)
            .eq("status", "completed"),
        )
      : Promise.resolve(0),
    count(db.from("reward_claims").select("id", { count: "exact", head: true }).eq("status", "paid")),
    count(db.from("vendors").select("id", { count: "exact", head: true }).eq("status", "approved")),
    count(db.from("sales").select("id", { count: "exact", head: true }).eq("status", "paid")),
  ]);

  return { students, lessonsCompleted, walletsSetUp, rewardsPaid, activeVendors, merchantPayments };
}

// Cached for 60 seconds across requests so the landing page stays fast under conference traffic.
export const getPublicImpactSummary = unstable_cache(loadSummary, ["public-impact-summary"], { revalidate: 60 });

export interface PublicVendor {
  slug: string;
  business_name: string;
  category: VendorCategory;
  location: string;
}

export const getApprovedVendors = unstable_cache(
  async (limit: number): Promise<PublicVendor[]> => {
    const { data, error } = await createAdminClient()
      .from("vendors")
      .select("slug, business_name, category, location")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["approved-vendors"],
  { revalidate: 60, tags: ["vendors"] },
);

