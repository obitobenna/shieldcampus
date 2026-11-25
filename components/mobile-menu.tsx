"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string };

// Phone-width navigation: a menu button that opens a full-width panel under the header.
export function MobileMenu({ items, signedIn }: { items: Item[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close after navigating.
  useEffect(() => setOpen(false), [pathname]);

  // Close on Escape and return focus to the button.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || (pathname.startsWith(`${href}/`) && !(href === "/vendor" && pathname.startsWith("/vendor/sales")));

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-ink/5"
      >
        {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
      </button>

      {open ? (
        <>
          {/* Tap outside to close */}
          <div className="fixed inset-0 top-16 z-30 bg-ink/20" aria-hidden onClick={() => setOpen(false)} />
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="absolute inset-x-0 top-16 z-40 border-b border-line bg-paper shadow-lg"
          >
            <ul className="page flex flex-col py-2">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center rounded-md px-2 text-base font-medium",
                      isActive(item.href) ? "text-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="page flex gap-3 border-t border-line py-4">
              {signedIn ? (
                <LogoutButton />
              ) : (
                <>
                  <Link href="/login" className={buttonClasses("secondary", "md", "flex-1")}>
                    Log in
                  </Link>
                  <Link href="/signup" className={buttonClasses("primary", "md", "flex-1")}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
