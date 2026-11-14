"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Skeleton } from "@/components/ui/skeleton";

// Printable "Scan to pay" sticker for a shop. The QR opens the shop's pay page, where the customer
// types the amount and pays from their own phone. It never changes, so print it once.
export function ShopQrSticker({ url, shopName, location, testnet }: { url: string; shopName: string; location: string; testnet: boolean }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#111418", light: "#FFFFFF" } })
      .then((s) => !cancelled && setSvg(s))
      .catch(() => !cancelled && setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-sm rounded-lg border-2 border-ink bg-white p-6 text-center text-[#111418] print:max-w-none print:border-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">ShieldCampus</p>
        <p className="mt-2 font-display text-2xl font-bold leading-tight">{shopName}</p>
        <p className="mt-1 text-sm">{location}</p>
        <div className="mx-auto mt-5 aspect-square w-full max-w-[260px]">
          {svg ? (
            <div role="img" aria-label={`QR code to pay ${shopName}`} className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>
        <p className="mt-5 font-display text-xl font-bold">Scan to pay with Zcash</p>
        <p className="mt-1 text-sm">Open your phone camera, scan, type the price, pay privately.</p>
        {testnet ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em]">Testnet demo · TAZ has no real value</p> : null}
      </div>

      <div className="mx-auto flex max-w-sm flex-col gap-3 print:hidden">
        <Button size="lg" className="w-full" onClick={() => window.print()}>
          <Printer aria-hidden className="h-5 w-5" />
          Print sticker
        </Button>
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
          <CopyButton value={url} label="link" />
        </div>
        <p className="text-center text-xs text-ink-muted">You can also share this link on WhatsApp so regulars can pay ahead.</p>
      </div>
    </div>
  );
}
