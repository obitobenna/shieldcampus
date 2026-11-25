"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Clock, Lock, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PaymentRequest } from "@/components/zcash/payment-request";
import { fetchJson } from "@/lib/fetch-json";
import { formatNaira } from "@/lib/format";
import { useNetwork } from "@/components/network-context";
import { SALE_MAX_NGN, SALE_MIN_NGN } from "@/lib/validation/pos";
import { formatZatoshis, ngnToZatoshis } from "@/lib/zcash";
import type { CustomerPayResponse } from "@/app/api/pay/[slug]/route";
import type { PayStatusResponse } from "@/app/api/pay/status/route";

type Phase = "waiting" | "paid" | "cancelled" | "expired";

// Customer side of "scan the shop QR": type the price, then pay from your own wallet.
export function CustomerPay({ slug, shopName, ngnPerZec }: { slug: string; shopName: string; ngnPerZec: number }) {
  const { coin: COIN, demoSuffix: DEMO_SUFFIX } = useNetwork();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<CustomerPayResponse | null>(null);
  const [phase, setPhase] = useState<Phase>("waiting");

  const ngn = Number(amount || "0");
  const valid = Number.isInteger(ngn) && ngn >= SALE_MIN_NGN && ngn <= SALE_MAX_NGN;
  const estimate = ngn > 0 ? formatZatoshis(ngnToZatoshis(ngn, ngnPerZec)) : "0";

  // Watch for the vendor confirming the payment. Stops when paid, cancelled or expired.
  useEffect(() => {
    if (!request || phase !== "waiting") return;
    const expiresAt = new Date(request.expiresAt).getTime();
    const poll = async () => {
      if (Date.now() > expiresAt) {
        setPhase("expired");
        return;
      }
      const res = await fetchJson<PayStatusResponse>(`/api/pay/status?sale=${request.saleId}&t=${encodeURIComponent(request.token)}`);
      if (res.ok && res.data.status !== "pending") setPhase(res.data.status);
    };
    const timer = window.setInterval(poll, 4000);
    return () => window.clearInterval(timer);
  }, [request, phase]);

  async function start(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError(`Enter an amount between ${formatNaira(SALE_MIN_NGN)} and ${formatNaira(SALE_MAX_NGN)}.`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetchJson<CustomerPayResponse>(`/api/pay/${slug}`, {
      method: "POST",
      json: { amountNgn: ngn, note: note.trim() || undefined },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPhase("waiting");
    setRequest(res.data);
  }

  function reset() {
    setRequest(null);
    setPhase("waiting");
    setAmount("");
    setNote("");
  }

  if (request && phase === "paid") {
    return (
      <div className="rounded-lg border border-success/30 bg-success-soft px-5 py-10 text-center">
        <CheckCircle2 aria-hidden className="mx-auto h-14 w-14 text-success" />
        <p className="mt-4 font-display text-xl font-semibold">Payment confirmed</p>
        <p className="mt-2 font-mono text-2xl">{formatNaira(request.amountNgn)}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {shopName} confirmed sale #{request.saleId}. Enjoy!
        </p>
        <Button variant="secondary" className="mt-6" onClick={reset}>
          Pay again
        </Button>
      </div>
    );
  }

  if (request && (phase === "cancelled" || phase === "expired")) {
    return (
      <div className="rounded-lg border border-line bg-surface px-5 py-10 text-center">
        <XCircle aria-hidden className="mx-auto h-12 w-12 text-ink-muted" />
        <p className="mt-4 font-display text-lg font-semibold">
          {phase === "cancelled" ? "The vendor cancelled this request" : "This payment request has expired"}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          If you already sent the payment, show the vendor the confirmation in your wallet. Otherwise, start again so the price
          uses the latest rate.
        </p>
        <Button className="mt-6" onClick={reset}>
          Start again
        </Button>
      </div>
    );
  }

  if (request) {
    return (
      <div className="space-y-6">
        <section aria-label="Amount to pay" className="text-center">
          <p className="eyebrow">You pay {shopName}</p>
          <p className="mt-2 font-mono text-[44px] font-medium leading-none tracking-tight">{formatNaira(request.amountNgn)}</p>
          <p className="mt-3 font-mono text-base">
            {request.amountZec} {COIN}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Rate locked at {formatNaira(Math.round(request.rateNgn))} / {COIN}
            {request.rateIsFallback ? " (backup rate)" : ""}
            {DEMO_SUFFIX}
          </p>
        </section>

        <PaymentRequest walletFirst uri={request.uri} address={request.address} amountZec={request.amountZec} memo={request.memo} />

        <p className="flex items-center justify-center gap-2 text-sm text-ink-muted" role="status">
          <Clock aria-hidden className="h-4 w-4" />
          Waiting for {shopName} to confirm. This page updates by itself.
        </p>
        <p className="text-center text-xs text-ink-muted">
          Keep the memo exactly as it is: it tells the vendor which order you paid for.
        </p>
        <div className="text-center">
          <button type="button" onClick={reset} className="text-sm font-medium text-ink-muted underline underline-offset-4 hover:text-ink">
            Wrong amount? Start again
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={start} className="space-y-5" noValidate>
      <Field id="amount" label="Amount in naira" hint="Type the price the vendor told you.">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-lg text-ink-muted">₦</span>
          <Input
            id="amount"
            inputMode="numeric"
            autoComplete="off"
            mono
            value={amount}
            onChange={(e) => {
              setError(null);
              setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
            }}
            placeholder="1500"
            className="h-14 pl-8 text-2xl"
            autoFocus
          />
        </div>
      </Field>
      <p className="font-mono text-sm text-ink-muted" aria-live="polite">
        ≈ {estimate} {COIN}
        {DEMO_SUFFIX}
      </p>
      <Field id="note" label="What is it for? (optional)" hint="Helps the vendor match your order, e.g. 2 plates of jollof.">
        <Input id="note" value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="2 plates of jollof" />
      </Field>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button type="submit" size="xl" variant="zec" className="w-full" loading={busy} disabled={!valid}>
        Continue to pay
      </Button>
      <p className="flex items-start gap-2 text-xs text-ink-muted">
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ShieldCampus doesn&apos;t record who you are with this payment. Only you and the vendor see it.
      </p>
    </form>
  );
}
