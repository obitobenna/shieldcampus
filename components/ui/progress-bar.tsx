import { cn } from "@/lib/cn";

export function ProgressBar({ value, max, label, className }: { value: number; max: number; label: string; className?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2 w-full overflow-hidden rounded-full bg-line"
      >
        <div className={cn("h-full rounded-full bg-brand transition-[width] duration-200 ease-out")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
