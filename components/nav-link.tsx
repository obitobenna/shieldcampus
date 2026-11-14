"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150 ease-out sm:px-3",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
