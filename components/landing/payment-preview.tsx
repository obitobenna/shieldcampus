import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/format";
import { formatZatoshis, ngnToZatoshis } from "@/lib/zcash";

const EXAMPLE_NGN = 2500;

// Product preview shown in the hero until a real campus photo is added (see lib/site.ts).
// Clearly labelled as an example; it does not claim to be a real transaction.
export function PaymentPreview({ ngnPerZec }: { ngnPerZec: number }) {
  const zec = formatZatoshis(ngnToZatoshis(EXAMPLE_NGN, ngnPerZec));
  return (
    <figure className="relative">
      <div className="rounded-lg border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-semibold">Mama Nkechi&apos;s Kitchen</p>
            <p className="text-xs text-ink-muted">Food · Beside Nkrumah Hall</p>
          </div>
          <Badge tone="zec" dot>
            Accepts ZEC
          </Badge>
        </div>

        <div className="px-5 py-6">
          <p className="text-xs text-ink-muted">Jollof rice, plantain and chicken</p>
          <p className="mt-1 font-mono text-[40px] font-medium leading-none tracking-tight">{formatNaira(EXAMPLE_NGN)}</p>
          <p className="mt-2 font-mono text-sm text-ink-muted">
            {zec} ZEC at {formatNaira(Math.round(ngnPerZec))} / ZEC
          </p>
        </div>

        <dl className="grid grid-cols-[96px_1fr] gap-y-2 border-t border-line px-5 py-4 text-sm">
          <dt className="text-ink-muted">Pay to</dt>
          <dd className="truncate font-mono text-xs leading-5">u1 shielded address</dd>
          <dt className="text-ink-muted">Memo</dt>
          <dd className="font-mono text-xs leading-5">ShieldCampus sale #128</dd>
        </dl>

        <div className="flex items-center gap-2 border-t border-line bg-brand-soft px-5 py-3 text-sm text-brand">
          <Lock aria-hidden className="h-4 w-4" />
          Only you and the vendor can see this payment.
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-ink-muted">Example of a payment request at a campus vendor.</figcaption>
    </figure>
  );
}
