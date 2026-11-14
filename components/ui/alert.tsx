import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { wrap: string; icon: typeof Info }> = {
  info: { wrap: "border-line bg-surface text-ink", icon: Info },
  success: { wrap: "border-success/30 bg-success-soft text-ink", icon: CheckCircle2 },
  warning: { wrap: "border-warning/30 bg-warning-soft text-ink", icon: AlertTriangle },
  danger: { wrap: "border-danger/30 bg-danger-soft text-ink", icon: XCircle },
};

const iconColor: Record<Tone, string> = {
  info: "text-ink-muted",
  success: "text-success",
  warning: "text-warning-ink",
  danger: "text-danger",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { wrap, icon: Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border p-4", wrap, className)}>
      <Icon aria-hidden className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor[tone])} />
      <div className="space-y-1 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink/80">{children}</div> : null}
      </div>
    </div>
  );
}
