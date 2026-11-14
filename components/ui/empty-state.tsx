import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Designed empty / error state: icon, one sentence of context, one clear action.
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-line bg-surface px-6 py-10", className)}>
      <div className="flex max-w-prose flex-col items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <p className="font-display text-lg font-semibold">{title}</p>
        <div className="text-sm text-ink-muted">{body}</div>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}
