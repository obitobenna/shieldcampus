import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { homeForRole, safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Handles the link in Supabase confirmation emails.
// Supports both the PKCE `code` flow (default template) and `token_hash` (custom template).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(`${origin}/login?error=link_invalid`);
  }

  const { data } = await supabase.auth.getUser();
  let destination = next ?? "/account";
  if (!next && data.user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    destination = homeForRole(profile?.role ?? "student");
  }
  const target = new URL(destination, origin);
  target.searchParams.set("welcome", "1");
  return NextResponse.redirect(target);
}
