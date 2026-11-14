import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RewardClaimRow } from "@/lib/database.types";

/** Start of "today" in Lagos (WAT, UTC+1, no daylight saving), as an ISO timestamp. */
export function lagosDayStart(now = new Date()): string {
  const offsetMs = 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  const lagosMidnight = Math.floor((now.getTime() + offsetMs) / dayMs) * dayMs - offsetMs;
  return new Date(lagosMidnight).toISOString();
}

/** Claims that count against today's budget (everything except rejected). */
export async function claimsToday(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("reward_claims")
    .select("id", { count: "exact", head: true })
    .neq("status", "rejected")
    .gte("created_at", lagosDayStart());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getClaimsForUser(userId: string): Promise<RewardClaimRow[]> {
  const { data, error } = await createAdminClient()
    .from("reward_claims")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
