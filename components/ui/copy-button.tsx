"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older Android browsers / non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-sm font-medium transition-colors duration-150 ease-out hover:border-ink/30",
        copied && "border-success/40 text-success",
        className,
      )}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
    >
      {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
