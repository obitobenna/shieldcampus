import { NextResponse } from "next/server";
import { ApiError, clientIp, parseJson, withApi } from "@/lib/api";
import { homeForRole } from "@/lib/auth";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validation/auth";

export type SignupResponse = { status: "signed_in"; redirectTo: string } | { status: "confirm_email"; email: string };

const DUPLICATE = "An account with this email already exists. Log in instead.";

export const POST = withApi(async (request: Request) => {
  // Generous per-IP limit: a whole class on campus WiFi shares one public IP.
  await enforceRateLimit(`signup:ip:${clientIp(request)}`, 100, 15 * 60, "Too many sign-ups from this network. Try again in 15 minutes.");
  const input = await parseJson(request, signupSchema);
  // Stops one address being hammered with confirmation emails.
  await enforceRateLimit(`signup:email:${input.email}`, 3, 60 * 60, "Too many sign-up attempts for this email. Try again in an hour.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { name: input.name, university: input.university, account_type: input.accountType },
      emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists" || /already registered/i.test(error.message)) {
      throw new ApiError(409, DUPLICATE, { email: DUPLICATE });
    }
    if (error.code === "weak_password") {
      const msg = "Choose a stronger password: mix letters and numbers, at least 8 characters.";
      throw new ApiError(422, msg, { password: msg });
    }
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      throw new ApiError(429, "We're sending too many emails right now. Please try again in a few minutes.");
    }
    if (error.code === "email_address_invalid") {
      const msg = "That email address can't receive mail. Use a different one.";
      throw new ApiError(422, msg, { email: msg });
    }
    console.error("[signup]", error.code, error.message);
    throw new ApiError(400, "We couldn't create your account. Please try again.");
  }

  // With email confirmation on, Supabase hides duplicates by returning a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new ApiError(409, DUPLICATE, { email: DUPLICATE });
  }

  const body: SignupResponse = data.session
    ? { status: "signed_in", redirectTo: homeForRole(input.accountType) }
    : { status: "confirm_email", email: input.email };
  return NextResponse.json(body, { status: 201 });
});
