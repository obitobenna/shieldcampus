import Link from "next/link";
import { cn } from "@/lib/cn";

export function AdminTabs({ current, pendingVendors }: { current: "payouts" | "vendors"; pendingVendors?: number }) {
  const tabs = [
    { key: "payouts", href: "/admin", label: "Reward payouts" },
    { key: "vendors", href: "/admin/vendors", label: "Vendors" },
  ] as const;
  return (
    <nav aria-label="Admin sections" className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
            current === t.key ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.key === "vendors" && pendingVendors ? (
            <span className="rounded-sm bg-warning-soft px-1.5 font-mono text-xs text-warning-ink">{pendingVendors}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
