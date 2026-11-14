import { NextResponse } from "next/server";
import { parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileUpdateSchema } from "@/lib/validation/account";

export const PATCH = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforceRateLimit(`profile:${session.userId}`, 30, 10 * 60);
  const input = await parseJson(request, profileUpdateSchema);

  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ name: input.name, university: input.university, preferred_language: input.preferredLanguage })
    .eq("id", session.userId)
    .select("name, university, preferred_language")
    .single();
  if (error) throw new Error(error.message);

  return NextResponse.json(data);
});
