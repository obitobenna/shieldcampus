"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, Inbox } from "lucide-react";
import { ClaimBadge } from "@/components/rewards/claim-status";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PaymentRequest } from "@/components/zcash/payment-request";
import { cn } from "@/lib/cn";
import type { ClaimStatus } from "@/lib/database.types";
import { fetchJson } from "@/lib/fetch-json";
import { formatZec } from "@/lib/format";
import { shortAddress } from "@/lib/zcash";
import type { AdminClaimResponse } from "@/app/api/admin/claims/[id]/route";

export interface QueueClaim {
  id: number;
  createdAt: string;
  studentName: string;
  university: string;
  lessonTitle: string;
  amountZec: number;
  address: string;
  memo: string;
  status: ClaimStatus;
  zip321Uri: string | null;
  txid: string | null;
  rejectionReason: string | null;
}

const TABS: { key: ClaimStatus; label: string }[] = [
  { key: "submitted", label: "To review" },
  { key: "approved", label: "To pay" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
];

const dateFmt = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
});

export function ClaimsQueue({ claims }: { claims: QueueClaim[] }) {
  const [tab, setTab] = useState<ClaimStatus>("submitted");
  const [openId, setOpenId] = useState<number | null>(null);
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, claims.filter((c) => c.status === t.key).length])) as Record<ClaimStatus, number>,
    [claims],
  );
  const visible = claims.filter((c) => c.status === tab);

  return (
    <div>
      <div role="tablist" aria-label="Claim status" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setOpenId(null);
            }}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out",
              tab === t.key ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
            <span className={cn("rounded-sm px-1.5 font-mono text-xs", tab === t.key ? "bg-brand text-white" : "bg-line/70 text-ink-muted")}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Inbox}
          title={tab === "submitted" ? "No claims waiting" : `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} claims`}
          body={tab === "submitted" ? "New claims appear here as soon as students pass Lesson 3 or 4 and claim." : "Nothing here yet."}
        />
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
          {visible.map((c) => (
            <ClaimRow key={c.id} claim={c} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} onOpen={() => setOpenId(c.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ClaimRow({ claim, open, onToggle, onOpen }: { claim: QueueClaim; open: boolean; onToggle: () => void; onOpen: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | "paid" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(claim.zip321Uri);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [txid, setTxid] = useState("");
  const [txidError, setTxidError] = useState<string | undefined>();

  async function act(body: { action: "approve" } | { action: "reject"; reason: string } | { action: "paid"; txid: string }) {
    setBusy(body.action);
    setError(null);
    setTxidError(undefined);
    const res = await fetchJson<AdminClaimResponse>(`/api/admin/claims/${claim.id}`, { method: "POST", json: body });
    setBusy(null);
    if (!res.ok) {
      if (res.fields?.txid) setTxidError(res.fields.txid);
      setError(res.error);
      return false;
    }
    if (res.data.zip321Uri) setUri(res.data.zip321Uri);
    return true;
  }

  async function approve() {
    if (await act({ action: "approve" })) {
      onOpen();
      router.refresh();
    }
  }

  async function reject(e: FormEvent) {
    e.preventDefault();
    if (await act({ action: "reject", reason })) router.refresh();
  }

  async function markPaid(e: FormEvent) {
    e.preventDefault();
    const clean = txid.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      setTxidError("A transaction ID is 64 characters of 0-9 and a-f.");
      return;
    }
    if (await act({ action: "paid", txid: clean })) router.refresh();
  }

  const expandable = claim.status === "approved" || claim.status === "submitted";

  return (
    <li>
      <div className="grid gap-3 px-4 py-4 md:grid-cols-[72px_1.4fr_1.2fr_110px_auto] md:items-center md:gap-4 md:px-5">
        <div className="flex items-center justify-between md:block">
          <span className="font-mono text-sm">#{claim.id}</span>
          <span className="md:hidden">
            <ClaimBadge status={claim.status} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{claim.studentName}</p>
          <p className="truncate text-xs text-ink-muted">
            {claim.university} · {dateFmt.format(new Date(claim.createdAt))}
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm">{claim.lessonTitle}</p>
          <p className="truncate font-mono text-xs text-ink-muted">{shortAddress(claim.address, 10, 6)}</p>
        </div>
        <p className="font-mono text-sm">{formatZec(claim.amountZec)} ZEC</p>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className="hidden md:inline-flex">
            <ClaimBadge status={claim.status} />
          </span>
          {claim.status === "submitted" ? (
            <>
              <Button size="sm" onClick={approve} loading={busy === "approve"}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setRejecting(true); onOpen(); }}>
                Reject
              </Button>
            </>
          ) : claim.status === "approved" ? (
            <Button size="sm" variant="zec" onClick={onToggle} aria-expanded={open}>
              {open ? "Hide payout" : "Pay now"}
              <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-180")} />
            </Button>
          ) : null}
        </div>
      </div>

      {claim.status === "paid" && claim.txid ? (
        <p className="break-all px-4 pb-4 font-mono text-xs text-ink-muted md:px-5 md:pl-[108px]">txid {claim.txid}</p>
      ) : null}
      {claim.status === "rejected" && claim.rejectionReason ? (
        <p className="px-4 pb-4 text-sm text-ink-muted md:px-5 md:pl-[108px]">Reason: {claim.rejectionReason}</p>
      ) : null}

      {error && !open ? (
        <div className="px-4 pb-4 md:px-5">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      {open && expandable ? (
        <div className="border-t border-line bg-paper px-4 py-5 md:px-5">
          {claim.status === "submitted" && rejecting ? (
            <form onSubmit={reject} className="max-w-xl space-y-3">
              <Field id={`reason-${claim.id}`} label="Reason shown to the student" hint="Be kind and specific. They can claim again after fixing it.">
                <Input
                  id={`reason-${claim.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="This address already received a reward on another account."
                  maxLength={280}
                />
              </Field>
              {error ? <Alert tone="danger">{error}</Alert> : null}
              <div className="flex gap-2">
                <Button type="submit" variant="danger" size="sm" loading={busy === "reject"} disabled={reason.trim().length < 3}>
                  Reject claim
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); onToggle(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : uri ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold">1. Scan with the reward fund wallet</p>
                <p className="mt-1 text-sm text-ink-muted">
                  The amount, address and memo <span className="font-mono">{claim.memo}</span> are filled in for you. Check them on the
                  wallet&apos;s confirmation screen, then send.
                </p>
                <PaymentRequest className="mt-4" uri={uri} address={claim.address} amountZec={formatZec(claim.amountZec)} memo={claim.memo} />
              </div>
              <form onSubmit={markPaid} className="space-y-4 lg:pt-0">
                <div>
                  <p className="text-sm font-semibold">2. Record the transaction</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    After sending, open the transaction in the fund wallet, copy its transaction ID, and paste it here.
                  </p>
                </div>
                <Field id={`txid-${claim.id}`} label="Transaction ID (txid)" error={txidError}>
                  <Input
                    id={`txid-${claim.id}`}
                    value={txid}
                    onChange={(e) => { setTxid(e.target.value); setTxidError(undefined); }}
                    mono
                    spellCheck={false}
                    autoCapitalize="off"
                    placeholder="64 characters, e.g. 9f2c…"
                    invalid={!!txidError}
                  />
                </Field>
                {error && !txidError ? <Alert tone="danger">{error}</Alert> : null}
                <Button type="submit" loading={busy === "paid"}>
                  Mark as paid
                </Button>
                <p className="text-xs text-ink-muted">
                  Never type the reward fund&apos;s recovery phrase into any website, including this one.
                </p>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
