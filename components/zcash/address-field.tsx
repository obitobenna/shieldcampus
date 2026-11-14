"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { checkShieldedAddress, type ZcashNetwork } from "@/lib/zcash";

// Shielded address input with live checksum validation and plain-language feedback.
export function AddressField({
  id,
  label,
  value,
  onChange,
  network,
  serverError,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  network: ZcashNetwork;
  serverError?: string;
  hint?: string;
}) {
  const [touched, setTouched] = useState(false);
  const check = useMemo(() => (value.trim() ? checkShieldedAddress(value, network) : null), [value, network]);

  // Danger-level problems (recovery phrase, spending key) show immediately; others after blur.
  const urgent = check && !check.ok && (check.reason === "seed_phrase" || check.reason === "spending_key");
  const showProblem = check && !check.ok && (touched || urgent);
  const message = serverError ?? (showProblem && check && !check.ok ? check.message : undefined);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        rows={3}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        placeholder={network === "mainnet" ? "u1…" : "utest1…"}
        aria-invalid={!!message || undefined}
        aria-describedby={`${id}-status`}
        className={cn(
          "block w-full resize-none rounded-md border bg-surface px-3 py-2.5 font-mono text-sm leading-6 text-ink placeholder:text-ink-muted/70 transition-colors duration-150 ease-out focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
          message ? "border-danger" : check?.ok ? "border-success" : "border-line",
        )}
      />
      <div id={`${id}-status`} aria-live="polite" className="min-h-5 text-sm">
        {message ? (
          <p className={cn("flex gap-2", urgent ? "font-medium text-danger" : "text-danger")}>
            <ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </p>
        ) : check?.ok ? (
          <p className="flex items-center gap-2 text-success">
            <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0" />
            {check.kind === "unified" ? "Shielded unified address" : "Shielded Sapling address"} · checksum verified
          </p>
        ) : hint ? (
          <p className="text-ink-muted">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}
