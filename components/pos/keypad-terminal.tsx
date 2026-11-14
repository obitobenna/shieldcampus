"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fetchJson } from "@/lib/fetch-json";
import { formatNaira } from "@/lib/format";
import { SALE_MAX_NGN, SALE_MIN_NGN } from "@/lib/validation/pos";
import { formatZatoshis, ngnToZatoshis } from "@/lib/zcash";
import type { CreateSaleResponse } from "@/app/api/pos/sales/route";
import { NetworkBadge } from "@/components/zcash/network-badge";
import { COIN, DEMO_VALUE_NOTE, IS_TESTNET } from "@/lib/network";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"] as const;

export function KeypadTerminal({ ngnPerZec, rateIsFallback }: { ngnPerZec: number; rateIsFallback: boolean }) {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(digits || "0");
  const tooBig = amount > SALE_MAX_NGN;
  const valid = amount >= SALE_MIN_NGN && !tooBig;
  const zec = amount > 0 ? formatZatoshis(ngnToZatoshis(amount, ngnPerZec)) : "0";

  const press = useCallback((key: (typeof KEYS)[number]) => {
    setError(null);
    setDigits((d) => {
      if (key === "back") return d.slice(0, -1);
      const next = (d + key).replace(/^0+/, "");
      return next.length > 6 ? d : next;
    });
  }, []);

  // Physical keyboard support (laptops at a stall, Bluetooth keypads).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.closest("input, textarea")) return;
      if (/^[0-9]$/.test(e.key)) press(e.key as (typeof KEYS)[number]);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Escape") setDigits("");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  async function charge() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    const res = await fetchJson<CreateSaleResponse>("/api/pos/sales", {
      method: "POST",
      json: { amountNgn: amount, note: note.trim() || undefined },
    });
    if (!res.ok) {
      setSubmitting(false);
      setError(res.error);
      return;
    }
    router.push(`/pos/${res.data.id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Amount" className="rounded-lg border border-line bg-surface px-5 py-6 text-center">
        <p className="eyebrow flex items-center justify-center gap-2">
          Amount <NetworkBadge />
        </p>
        <p
          aria-live="polite"
          className={cn(
            "mt-2 break-all font-mono text-[56px] font-medium leading-none tracking-tight",
            amount === 0 && "text-ink-muted/60",
            tooBig && "text-danger",
          )}
        >
          {formatNaira(amount)}
        </p>
        <p className="mt-3 font-mono text-sm text-ink-muted">≈ {zec} {COIN}</p>
        {IS_TESTNET ? <p className="mt-1 text-xs text-ink-muted">Naira price is a {DEMO_VALUE_NOTE}.</p> : null}
        {tooBig ? (
          <p className="mt-2 text-sm text-danger">The largest sale is {formatNaira(SALE_MAX_NGN)}.</p>
        ) : amount > 0 && amount < SALE_MIN_NGN ? (
          <p className="mt-2 text-sm text-ink-muted">The smallest sale is {formatNaira(SALE_MIN_NGN)}.</p>
        ) : null}
      </section>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Number keypad">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            onContextMenu={(e) => {
              if (k === "back") {
                e.preventDefault();
                setDigits("");
              }
            }}
            aria-label={k === "back" ? "Delete last digit" : k}
            className="flex h-16 items-center justify-center rounded-md border border-line bg-surface font-mono text-2xl font-medium transition-colors duration-150 ease-out hover:bg-paper active:bg-brand-soft"
          >
            {k === "back" ? <Delete aria-hidden className="h-6 w-6" /> : k}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="sale-note" className="mb-1.5 block text-sm font-medium">
          Item note <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="sale-note"
          value={note}
          maxLength={80}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Jollof rice and plantain"
          className="block h-11 w-full rounded-md border border-line bg-surface px-3 text-base placeholder:text-ink-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <p className="mt-1 text-xs text-ink-muted">Only you see this. It isn&apos;t sent with the payment.</p>
      </div>

      {rateIsFallback ? (
        <Alert tone="warning">Live price unavailable, so a backup rate is being used. Check the amount with your customer.</Alert>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Button size="xl" className="w-full" onClick={charge} disabled={!valid} loading={submitting}>
        {valid ? `Charge ${formatNaira(amount)}` : "Enter an amount"}
      </Button>
    </div>
  );
}
