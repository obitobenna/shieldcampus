import { Check } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { ClaimStatus } from "@/lib/database.types";

export const CLAIM_BADGE: Record<ClaimStatus, { label: string; tone: BadgeTone }> = {
  submitted: { label: "Submitted", tone: "warning" },
  approved: { label: "Approved", tone: "brand" },
  paid: { label: "Paid", tone: "success" },
  rejected: { label: "Not approved", tone: "danger" },
};

export function ClaimBadge({ status }: { status: ClaimStatus }) {
  const b = CLAIM_BADGE[status];
  return (
    <Badge tone={b.tone} dot>
      {b.label}
    </Badge>
  );
}

const STEPS: { key: Exclude<ClaimStatus, "rejected">; label: string }[] = [
  { key: "submitted", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
];

// Submitted -> Approved -> Paid, with the reached steps filled in.
export function ClaimTimeline({ status }: { status: ClaimStatus }) {
  const reached = status === "rejected" ? 0 : STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex items-center gap-2" aria-label={`Claim status: ${CLAIM_BADGE[status].label}`}>
      {STEPS.map((s, i) => {
        const done = status !== "rejected" && i <= reached;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                  done ? "border-success bg-success text-white" : "border-line bg-surface",
                )}
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <span className={cn("text-xs font-medium", done ? "text-ink" : "text-ink-muted")}>{s.label}</span>
            </span>
            {i < STEPS.length - 1 ? (
              <span aria-hidden className={cn("h-px flex-1", i < reached && status !== "rejected" ? "bg-success" : "bg-line")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
