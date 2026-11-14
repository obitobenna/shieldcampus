import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeading({
  id,
  eyebrow,
  title,
  body,
  action,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-prose">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={id} className="mt-2 text-xl">{title}</h2>
        {body ? <p className="mt-3 text-ink-muted">{body}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
