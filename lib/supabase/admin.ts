import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

// Service-role client: bypasses RLS. Use only in server code AFTER validating
// input and checking the caller's role.
let client: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (client) return client;
  const e = env();
  client = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
