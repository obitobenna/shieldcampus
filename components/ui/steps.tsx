import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepState = "done" | "current" | "upcoming" | "blocked";

export interface Step {
  title: string;
  detail: string;
  state: StepState;
  href?: string;
  action?: string;
}

const STATE_LABEL: Record<StepState, string> = {
  done: "Done",
  current: "Next step",
  upcoming: "Not started",
  blocked: "Waiting",
};

// Numbered checklist used for the student journey and vendor setup.
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("divide-y divide-line", className)}>
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
              s.state === "done" && "border-success bg-success text-white",
              s.state === "current" && "border-brand bg-brand text-white",
              s.state === "blocked" && "border-warning bg-warning-soft text-warning-ink",
              s.state === "upcoming" && "border-line bg-surface text-ink-muted",
            )}
          >
            {s.state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
              {s.title}
              <span className="sr-only">({STATE_LABEL[s.state]})</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">{s.detail}</p>
            {s.href && s.action ? (
              <Link href={s.href} className="mt-1.5 inline-block text-sm font-medium text-brand underline underline-offset-4">
                {s.action}
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
