"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Inbox } from "lucide-react";
import { fetchJson } from "@/lib/fetch-json";
import { formatNaira } from "@/lib/format";
import { COIN } from "@/lib/network";
import type { IncomingResponse, IncomingSale } from "@/app/api/pos/incoming/route";

const timeFmt = new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

// Open payment requests, including ones customers start by scanning the shop QR sticker.
// Refreshes every 5 seconds while the tab is visible.
export function IncomingPayments({ initial }: { initial: IncomingSale[] }) {
  const [sales, setSales] = useState(initial);

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetchJson<IncomingResponse>("/api/pos/incoming", { cache: "no-store" });
      if (!stopped && res.ok) setSales(res.data.sales);
    };
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <section aria-labelledby="incoming-heading" className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="incoming-heading" className="text-sm font-semibold">
          Incoming payments
        </h2>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
          Live
        </span>
      </div>
      {sales.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-4 text-sm text-ink-muted">
          <Inbox aria-hidden className="h-4 w-4 shrink-0" />
          Customers who scan your shop QR appear here.
        </p>
      ) : (
        <ul className="divide-y divide-line" aria-live="polite">
          {sales.map((s) => (
            <li key={s.id}>
              <Link href={`/pos/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-paper">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-lg font-medium leading-6">{formatNaira(s.amountNgn)}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {s.amountZec} {COIN} · sale #{s.id} · {timeFmt.format(new Date(s.createdAt))}
                    {s.note ? ` · ${s.note}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-warning-ink">Waiting</span>
                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
