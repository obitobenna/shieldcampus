import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Metric tile: mono number, short label, optional note. Used on the landing and impact pages.
export function Stat({
  label,
  value,
  note,
  accent = false,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 bg-surface p-5 sm:p-6", className)}>
      <span className="flex items-center gap-2 text-sm text-ink-muted">
        {accent ? <span aria-hidden className="h-2 w-2 rounded-full bg-zec" /> : null}
        {label}
      </span>
      <span className="font-mono text-xl font-medium tracking-tight text-ink sm:text-2xl">{value}</span>
      {note ? <span className="text-xs text-ink-muted">{note}</span> : null}
    </div>
  );
}

// Grid of stats separated by 1px hairlines (gap-px over a line-coloured background).
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-px overflow-hidden rounded-lg border border-line bg-line", className)}>{children}</div>
  );
}
