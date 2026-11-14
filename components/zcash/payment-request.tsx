"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ExternalLink } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

// A ZIP-321 payment request: big QR code, "Open in Zcash wallet" link, and copy buttons
// for the address, amount and memo (for wallets that can't scan or open links).
export function PaymentRequest({
  uri,
  address,
  amountZec,
  memo,
  size = "md",
  className,
}: {
  uri: string;
  address: string;
  amountZec: string;
  memo: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(uri, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#111418", light: "#FFFFFF" } })
      .then((s) => !cancelled && setSvg(s))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const box = size === "lg" ? "w-full max-w-[340px]" : "w-full max-w-[260px]";

  return (
    <div className={cn("space-y-5", className)}>
      <div className={cn("mx-auto aspect-square rounded-md border border-line bg-white p-3", box)}>
        {svg ? (
          <div
            role="img"
            aria-label="Zcash payment QR code"
            className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : failed ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-ink-muted">
            QR code unavailable. Use the button or copy the details below.
          </p>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>

      <a href={uri} className={buttonClasses("zec", "md", "w-full")}>
        Open in Zcash wallet
        <ExternalLink aria-hidden className="h-4 w-4" />
      </a>

      <dl className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
        <Detail label="Amount" value={`${amountZec} ZEC`} copyValue={amountZec} />
        <Detail label="Memo" value={memo} />
        <Detail label="Address" value={address} wrap />
      </dl>
    </div>
  );
}

function Detail({ label, value, copyValue, wrap }: { label: string; value: string; copyValue?: string; wrap?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-ink-muted">{label}</dt>
        <dd className={cn("mt-0.5 font-mono text-[13px] leading-5", wrap ? "break-all" : "truncate")}>{value}</dd>
      </div>
      <CopyButton value={copyValue ?? value} label={label.toLowerCase()} />
    </div>
  );
}
