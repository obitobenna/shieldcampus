import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getSession, homeForRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const session = await getSession();
  if (session) redirect(homeForRole(session.profile.role));
  const { as } = await searchParams;

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes a minute. You only need your name, university and email. One account per email."
    >
      <SignupForm initialType={as === "vendor" ? "vendor" : "student"} />
    </AuthShell>
  );
}
