import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "zec" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface text-ink-muted",
  brand: "border-brand/20 bg-brand-soft text-brand",
  zec: "border-zec/40 bg-zec-soft text-zec-ink",
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning-ink",
  danger: "border-danger/25 bg-danger-soft text-danger",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-ink-muted",
  brand: "bg-brand",
  zec: "bg-zec",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

// Small uppercase status badge. Always carries a text label, never colour alone.
export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.06em]",
        tones[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} /> : null}
      {children}
    </span>
  );
}
