import { getSession } from "@/lib/auth";
import type { UserRole } from "@/lib/database.types";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { NavLink } from "@/components/nav-link";
import { NetworkBadge } from "@/components/zcash/network-badge";
import { MobileMenu } from "@/components/mobile-menu";

const NAV: Record<UserRole, { href: string; label: string }[]> = {
  student: [
    { href: "/learn", label: "Lessons" },
    { href: "/rewards", label: "Rewards" },
    { href: "/vendors", label: "Vendors" },
    { href: "/account", label: "Account" },
  ],
  vendor: [
    { href: "/pos", label: "Till" },
    { href: "/vendor/sales", label: "Sales" },
    { href: "/vendor", label: "Shop" },
    { href: "/account", label: "Account" },
  ],
  admin: [
    { href: "/admin", label: "Admin" },
    { href: "/impact", label: "Impact" },
    { href: "/account", label: "Account" },
  ],
};

const PUBLIC_NAV = [
  { href: "/vendors", label: "Vendors" },
  { href: "/impact", label: "Impact" },
];

export async function SiteHeader() {
  const session = await getSession().catch(() => null);

  return (
    <header className="relative z-40 border-b border-line bg-paper print:hidden">
      <div className="page flex h-16 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Logo />
          <NetworkBadge className="shrink-0" />
        </span>
        <MobileMenu items={session ? NAV[session.profile.role] : PUBLIC_NAV} signedIn={!!session} />
        {session ? (
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV[session.profile.role].map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
            <span className="ml-1 inline-flex">
              <LogoutButton />
            </span>
          </nav>
        ) : (
          <nav aria-label="Account" className="hidden items-center gap-2 md:flex">
            {PUBLIC_NAV.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
            <ButtonLink href="/login" variant="ghost" size="sm">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup" size="sm">
              Sign up
            </ButtonLink>
          </nav>
        )}
      </div>
    </header>
  );
}
