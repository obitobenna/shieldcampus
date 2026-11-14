import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api";

// Postgres-backed fixed-window limiter, shared across all serverless instances.
// Fails open (logs) if the database is unreachable so a DB blip never locks users out.
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] check failed, allowing request:", error.message);
    return true;
  }
  return data === true;
}

export async function enforceRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  message = "Too many attempts. Please wait a few minutes and try again.",
): Promise<void> {
  if (!(await rateLimit(key, max, windowSeconds))) throw new ApiError(429, message);
}
