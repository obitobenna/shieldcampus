"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { PaymentRequest } from "@/components/zcash/payment-request";
import { cn } from "@/lib/cn";
import type { SaleStatus } from "@/lib/database.types";
import { fetchJson } from "@/lib/fetch-json";
import { formatNaira } from "@/lib/format";
import type { SaleActionResponse } from "@/app/api/pos/sales/[id]/route";

interface Sale {
  id: number;
  status: SaleStatus;
  amountNgn: number;
  amountZec: string;
  rateNgn: number;
  rateIsFallback: boolean;
  note: string | null;
  memo: string;
  uri: string;
  address: string;
  txid: string | null;
}

export function ChargeScreen({ sale }: { sale: Sale }) {
  const router = useRouter();
  const [status, setStatus] = useState<SaleStatus>(sale.status);
  const [txid, setTxid] = useState("");
  const [showTxid, setShowTxid] = useState(false);
  const [busy, setBusy] = useState<"paid" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function act(e: FormEvent | null, action: "paid" | "cancel") {
    e?.preventDefault();
    setBusy(action);
    setError(null);
    const res = await fetchJson<SaleActionResponse>(`/api/pos/sales/${sale.id}`, {
      method: "POST",
      json: action === "paid" ? { action, txid: txid.trim() || undefined } : { action },
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatus(res.data.status);
    router.refresh();
  }

  if (status === "paid" || status === "cancelled") {
    const paid = status === "paid";
    return (
      <div className="space-y-6 text-center">
        <div className={cn("rounded-lg border px-5 py-10", paid ? "border-success/30 bg-success-soft" : "border-line bg-surface")}>
          {paid ? (
            <CheckCircle2 aria-hidden className="mx-auto h-14 w-14 text-success" />
          ) : (
            <XCircle aria-hidden className="mx-auto h-14 w-14 text-ink-muted" />
          )}
          <p className="mt-4 font-display text-xl font-semibold">{paid ? "Payment received" : "Sale cancelled"}</p>
          <p className="mt-2 font-mono text-2xl">{formatNaira(sale.amountNgn)}</p>
          <p className="mt-1 font-mono text-sm text-ink-muted">
            {sale.amountZec} ZEC · sale #{sale.id}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ButtonLink href="/pos" size="xl" className="w-full">
            New sale
          </ButtonLink>
          <ButtonLink href="/vendor/sales" size="xl" variant="secondary" className="w-full">
            Sales history
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label="Amount due" className="text-center">
        <p className="eyebrow">Customer pays</p>
        <p className="mt-2 font-mono text-[56px] font-medium leading-none tracking-tight">{formatNaira(sale.amountNgn)}</p>
        <p className="mt-3 font-mono text-base">{sale.amountZec} ZEC</p>
        <p className="mt-1 text-xs text-ink-muted">
          Rate locked at {formatNaira(Math.round(sale.rateNgn))} / ZEC{sale.rateIsFallback ? " (backup rate)" : ""}
          {sale.note ? ` · ${sale.note}` : ""}
        </p>
      </section>

      <PaymentRequest size="lg" uri={sale.uri} address={sale.address} amountZec={sale.amountZec} memo={sale.memo} />

      <div className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-muted">
        Ask the customer to scan with their Zcash wallet. Tap <span className="font-semibold text-ink">Mark as paid</span> only
        after the payment shows up in your wallet.
      </div>

      <form onSubmit={(e) => act(e, "paid")} className="space-y-3">
        <button
          type="button"
          onClick={() => setShowTxid((v) => !v)}
          aria-expanded={showTxid}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand"
        >
          Add transaction ID (optional)
          <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform duration-150", showTxid && "rotate-180")} />
        </button>
        {showTxid ? (
          <input
            value={txid}
            onChange={(e) => setTxid(e.target.value)}
            aria-label="Transaction ID"
            placeholder="64-character transaction ID from your wallet"
            spellCheck={false}
            autoCapitalize="off"
            className="block h-11 w-full rounded-md border border-line bg-surface px-3 font-mono text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button type="submit" variant="success" size="xl" className="w-full" loading={busy === "paid"}>
          <CheckCircle2 aria-hidden className="h-6 w-6" />
          Mark as paid
        </Button>
      </form>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <Link href="/pos" className="text-sm font-medium text-ink-muted hover:text-ink">
          Back to keypad
        </Link>
        {confirmCancel ? (
          <span className="flex items-center gap-2">
            <span className="text-sm text-ink-muted">Cancel this sale?</span>
            <Button size="sm" variant="danger" onClick={() => act(null, "cancel")} loading={busy === "cancel"}>
              Yes, cancel
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>
              No
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(true)}>
            Cancel sale
          </Button>
        )}
      </div>
    </div>
  );
}
