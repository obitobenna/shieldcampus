import { NextResponse } from "next/server";
import { ApiError, clientIp, parseJson, withApi } from "@/lib/api";
import { homeForRole, safeNext } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";

export type LoginResponse = { redirectTo: string };

export const POST = withApi(async (request: Request) => {
  // Generous per-IP limit (shared campus WiFi); the per-email limit below guards against password guessing.
  await enforceRateLimit(`login:ip:${clientIp(request)}`, 200, 15 * 60);
  const input = await parseJson(request, loginSchema);
  await enforceRateLimit(
    `login:email:${input.email}`,
    10,
    15 * 60,
    "Too many attempts for this account. Wait 15 minutes, then try again.",
  );

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      throw new ApiError(403, "Please confirm your email first. Check your inbox (and spam folder) for the link we sent.");
    }
    throw new ApiError(401, "That email and password don't match. Check them and try again.");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const body: LoginResponse = { redirectTo: safeNext(input.next) ?? homeForRole(profile?.role ?? "student") };
  return NextResponse.json(body);
});
