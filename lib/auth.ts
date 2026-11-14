import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, UserRole } from "@/lib/database.types";
import { ApiError } from "@/lib/api";

export interface Session {
  userId: string;
  email: string;
  profile: ProfileRow;
}

// Returns the signed-in user and their profile, or null. Cached per request.
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile) return null;

  return { userId: userData.user.id, email: userData.user.email ?? "", profile };
});

// Where each role lands after logging in. Routes for later steps are added as they are built.
export function homeForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/account";
    case "vendor":
      return "/vendor";
    default:
      return "/learn";
  }
}

// Only allow same-site relative redirects (prevents open-redirects via ?next=).
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

// For pages: redirect to login when signed out, to /account when the role doesn't match.
export async function requirePageSession(roles?: UserRole[], next?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  if (roles && !roles.includes(session.profile.role)) {
    redirect("/account?denied=1");
  }
  return session;
}

// For API routes: throws ApiError(401/403), turned into JSON by withApi().
export async function requireApiSession(roles?: UserRole[]): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Please log in to continue.");
  if (roles && !roles.includes(session.profile.role)) {
    throw new ApiError(403, "You don't have access to this.");
  }
  return session;
}
