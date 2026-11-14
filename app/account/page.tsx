import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, KeyRound, Store, User, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { AddressForm } from "@/components/account/address-form";
import { ProfileForm } from "@/components/account/profile-form";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requirePageSession } from "@/lib/auth";
import type { UserRole } from "@/lib/database.types";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getShopForOwner } from "@/lib/vendors";

export const metadata: Metadata = { title: "Your account" };

const ROLE: Record<UserRole, { label: string; tone: BadgeTone }> = {
  student: { label: "Student", tone: "brand" },
  vendor: { label: "Vendor", tone: "zec" },
  admin: { label: "Admin", tone: "neutral" },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; denied?: string }>;
}) {
  const { profile, email, userId } = await requirePageSession(undefined, "/account");
  const params = await searchParams;
  const shop = profile.role === "vendor" ? await getShopForOwner(userId) : null;
  const network = env().ZCASH_NETWORK;

  return (
    <div className="page py-10 md:py-14">
      <div className="max-w-3xl">
        {params.welcome ? (
          <Alert tone="success" title="Your email is confirmed" className="mb-8">
            Welcome to ShieldCampus, {profile.name.split(" ")[0]}.
          </Alert>
        ) : null}
        {params.denied ? (
          <Alert tone="warning" title="That page isn't available for your account" className="mb-8">
            It belongs to a different account type, so you've been brought here instead.
          </Alert>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span
            aria-hidden
            className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand font-display text-lg font-bold text-white"
          >
            {initials(profile.name)}
          </span>
          <div>
            <h1 className="text-xl md:text-2xl">{profile.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              <Badge tone={ROLE[profile.role].tone}>{ROLE[profile.role].label}</Badge>
              <span>{profile.university}</span>
              <span aria-hidden>·</span>
              <span>Joined {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          {profile.role === "student" ? (
            <Section
              id="wallet"
              icon={<Wallet aria-hidden className="h-5 w-5" />}
              title="Shielded address"
              description="Your ShieldCampus rewards are paid to this address. It's safe to share: people can pay you with it, but nobody can spend from it."
              aside={profile.zcash_address ? <Badge tone="success">Saved</Badge> : <Badge tone="warning">Not added</Badge>}
            >
              {!profile.zcash_address ? (
                <p className="mb-5 text-sm text-ink-muted">
                  Don&apos;t have a wallet yet? Lesson 3 walks you through it step by step.{" "}
                  <Link href="/learn/wallet-setup" className="font-medium text-brand underline underline-offset-4">
                    Set up your wallet
                  </Link>
                </p>
              ) : null}
              <AddressForm current={profile.zcash_address} network={network} />
            </Section>
          ) : null}

          {profile.role === "vendor" ? (
            <Section
              id="shop"
              icon={<Store aria-hidden className="h-5 w-5" />}
              title="Your shop"
              description="Your shop's details and the address customers pay are managed on your shop page."
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  {shop ? (
                    <>
                      <span className="font-medium">{shop.business_name}</span>
                      <span className="text-ink-muted"> · {shop.status === "approved" ? "Approved" : shop.status === "pending" ? "Awaiting approval" : "Suspended"}</span>
                    </>
                  ) : (
                    <span className="text-ink-muted">You haven&apos;t added your shop yet.</span>
                  )}
                </p>
                <ButtonLink href="/vendor" variant="secondary" className="shrink-0">
                  {shop ? "Manage shop" : "Set up shop"}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </ButtonLink>
              </div>
            </Section>
          ) : null}

          <Section
            id="profile"
            icon={<User aria-hidden className="h-5 w-5" />}
            title="Profile"
            description="Only you and the ShieldCampus team can see these details. They never appear on the public impact page."
          >
            <ProfileForm
              email={email}
              universityLabel={profile.role === "vendor" ? "Campus" : "University"}
              initial={{ name: profile.name, university: profile.university, preferredLanguage: profile.preferred_language }}
            />
          </Section>

          <Section
            id="safety"
            icon={<KeyRound aria-hidden className="h-5 w-5" />}
            title="Keeping your money safe"
            description="ShieldCampus never holds your money or your keys. Your wallet app does."
          >
            <ul className="space-y-2 text-sm text-ink/80">
              <li>We will never ask for your recovery phrase, private key or wallet PIN.</li>
              <li>Your shielded address is safe to share. Your recovery phrase never is.</li>
              <li>If someone claiming to be ShieldCampus asks for your phrase, it is a scam. Report it to the team at the help desk.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  description,
  aside,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-6 rounded-lg border border-line bg-surface">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${id}-heading`} className="text-lg">
              {title}
            </h2>
            {aside}
          </div>
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "S";
}
