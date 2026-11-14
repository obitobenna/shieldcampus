import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSession, homeForRole, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  link_invalid: "That confirmation link is invalid or has expired. Log in, or sign up again to get a new link.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next) ?? undefined;
  const session = await getSession();
  if (session) redirect(next ?? homeForRole(session.profile.role));

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your lessons, check your rewards, or open your till.">
      <LoginForm next={next} initialError={params.error ? ERRORS[params.error] : undefined} />
    </AuthShell>
  );
}
