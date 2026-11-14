import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Lock, Wallet } from "lucide-react";
import { ClaimBadge, ClaimTimeline } from "@/components/rewards/claim-status";
import { ClaimButton } from "@/components/rewards/claim-button";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Stat, StatGrid } from "@/components/ui/stat";
import { requirePageSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatDate, formatNaira, formatZec } from "@/lib/format";
import { getUserProgress, listLessons } from "@/lib/lessons";
import { getZecRates } from "@/lib/rates";
import { getClaimsForUser } from "@/lib/rewards";
import { explorerUrl } from "@/lib/verification";
import { shortAddress } from "@/lib/zcash";

export const metadata: Metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const session = await requirePageSession(["student"], "/rewards");
  const e = env();
  const [lessons, progress, claims, rates] = await Promise.all([
    listLessons(),
    getUserProgress(session.userId),
    getClaimsForUser(session.userId),
    getZecRates(),
  ]);
  const eligible = lessons.filter((l) => l.reward_eligible);
  const address = session.profile.zcash_address;
  const paid = claims.filter((c) => c.status === "paid");
  const paidZec = paid.reduce((sum, c) => sum + Number(c.amount_zec), 0);
  const potentialZec = eligible.length * e.REWARD_ZEC;

  return (
    <div className="page py-10 md:py-14">
      <p className="eyebrow">Earn</p>
      <h1 className="mt-2 text-xl md:text-2xl">Your rewards</h1>
      <p className="mt-3 max-w-prose text-ink-muted">
        Pass the wallet lessons and claim {formatZec(e.REWARD_ZEC)} ZEC for each one, sent privately to your shielded address.
        A ShieldCampus admin checks each claim before paying it.
      </p>

      <StatGrid className="mt-8 grid-cols-2 lg:grid-cols-3">
        <Stat label="Received" value={`${formatZec(paidZec)} ZEC`} accent note={`${paid.length} of ${eligible.length} rewards paid`} />
        <Stat label="Available to earn" value={`${formatZec(potentialZec)} ZEC`} note={`≈ ${formatNaira(Math.round(potentialZec * rates.ngn))} at today's rate`} />
        <Stat
          label="Paid to"
          className="col-span-2 lg:col-span-1"
          value={<span className="text-base sm:text-lg">{address ? shortAddress(address, 10, 6) : "No address yet"}</span>}
          note={
            <Link href="/account#wallet" className="font-medium text-brand underline underline-offset-4">
              {address ? "Change address" : "Add your shielded address"}
            </Link>
          }
        />
      </StatGrid>

      {!address ? (
        <Alert tone="warning" title="Add your shielded address to claim" className="mt-6">
          Your reward needs somewhere to go. Set up a wallet in Lesson 3, then save your u1 address on your{" "}
          <Link href="/account#wallet" className="font-medium text-brand underline underline-offset-4">
            Account page
          </Link>
          .
        </Alert>
      ) : null}

      <ul className="mt-8 space-y-4">
        {eligible.map((lesson) => {
          const passed = progress.get(lesson.id)?.status === "completed";
          const claim = claims.find((c) => c.lesson_id === lesson.id);
          const link = claim?.txid ? explorerUrl(claim.txid, e.ZCASH_NETWORK) : null;

          return (
            <li key={lesson.id} className="rounded-lg border border-line bg-surface">
              <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-ink-muted">Lesson {lesson.position}</p>
                  <p className="mt-0.5 font-semibold">{lesson.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{formatZec(e.REWARD_ZEC)} ZEC</span>
                  {claim ? <ClaimBadge status={claim.status} /> : null}
                </div>
              </div>

              <div className="px-5 py-5">
                {!passed ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-sm text-ink-muted">
                      <Lock aria-hidden className="h-4 w-4" /> Pass this lesson&apos;s quiz to unlock the reward.
                    </p>
                    <ButtonLink href={`/learn/${lesson.slug}`} variant="secondary" size="sm">
                      Go to lesson
                    </ButtonLink>
                  </div>
                ) : !claim ? (
                  address ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-ink-muted">
                        Unlocked. It will be sent to <span className="font-mono text-ink">{shortAddress(address, 10, 6)}</span>.
                      </p>
                      <ClaimButton lessonSlug={lesson.slug} />
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 text-sm text-ink-muted">
                      <Wallet aria-hidden className="h-4 w-4" /> Unlocked. Add your shielded address to claim it.
                    </p>
                  )
                ) : claim.status === "rejected" ? (
                  <div className="space-y-4">
                    <Alert tone="danger" title="This claim wasn't approved">
                      {claim.rejection_reason ?? "Contact the ShieldCampus help desk for details."}
                    </Alert>
                    {address ? <ClaimButton lessonSlug={lesson.slug} label="Claim again" /> : null}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ClaimTimeline status={claim.status} />
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                      <dt className="text-ink-muted">Claim</dt>
                      <dd className="font-mono">#{claim.id}</dd>
                      <dt className="text-ink-muted">Submitted</dt>
                      <dd>{formatDate(claim.created_at)}</dd>
                      <dt className="text-ink-muted">To</dt>
                      <dd className="break-all font-mono text-xs leading-5">{claim.zcash_address}</dd>
                      {claim.txid ? (
                        <>
                          <dt className="text-ink-muted">Transaction</dt>
                          <dd className="flex flex-wrap items-center gap-2">
                            <span className="break-all font-mono text-xs leading-5">{claim.txid}</span>
                            {link ? (
                              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand underline underline-offset-4">
                                View on explorer <ExternalLink aria-hidden className="h-3 w-3" />
                              </a>
                            ) : null}
                          </dd>
                        </>
                      ) : null}
                    </dl>
                    <p className="text-sm text-ink-muted">
                      {claim.status === "submitted"
                        ? "Waiting for an admin to check your claim. This usually happens the same day."
                        : claim.status === "approved"
                          ? "Approved. The payment is being sent from the reward fund now."
                          : "Paid. Open your wallet to see it, with the memo below. Only you can see this payment's details."}
                    </p>
                    {claim.status === "paid" ? (
                      <p className="font-mono text-xs text-ink-muted">Memo: {claim.memo}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 max-w-prose text-sm text-ink-muted">
        One reward per lesson, per student. Each wallet can only be used by one account. Rewards are limited each day, so
        if today&apos;s budget runs out, claim again tomorrow.
      </p>
    </div>
  );
}
