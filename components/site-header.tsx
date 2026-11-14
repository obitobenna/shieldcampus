import { getSession } from "@/lib/auth";
import type { UserRole } from "@/lib/database.types";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { NavLink } from "@/components/nav-link";

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
    { href: "/learn", label: "Lessons" },
    { href: "/account", label: "Account" },
  ],
};

export async function SiteHeader() {
  const session = await getSession().catch(() => null);

  return (
    <header className="border-b border-line bg-paper">
      <div className="page flex h-16 items-center justify-between gap-3">
        <Logo compact={!!session} />
        {session ? (
          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV[session.profile.role].map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
            <span className="ml-1 hidden sm:inline-flex">
              <LogoutButton />
            </span>
          </nav>
        ) : (
          <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
            <NavLink href="/vendors">Vendors</NavLink>
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
