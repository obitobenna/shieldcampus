import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Steps, type Step } from "@/components/ui/steps";
import { requirePageSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatZec } from "@/lib/format";
import { getUserProgress, listLessons } from "@/lib/lessons";
import { COIN, UNIFIED_PREFIX } from "@/lib/network";

export const metadata: Metadata = { title: "Lessons" };

export default async function LearnPage() {
  const session = await requirePageSession(undefined, "/learn");
  const [lessons, progress] = await Promise.all([listLessons(), getUserProgress(session.userId)]);

  const completedCount = lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
  const nextUp = lessons.find((l) => progress.get(l.id)?.status !== "completed") ?? null;
  const allDone = lessons.length > 0 && completedCount === lessons.length;
  const reward = formatZec(env().REWARD_ZEC);
  const isStudent = session.profile.role === "student";
  const rewardLessons = lessons.filter((l) => l.reward_eligible);
  const rewardsUnlocked = rewardLessons.filter((l) => progress.get(l.id)?.status === "completed").length;
  const walletLesson = lessons.find((l) => l.slug === "wallet-setup");
  const walletDone = !!session.profile.zcash_address;

  const journey: Step[] = [
    {
      title: "Learn",
      detail: `${completedCount} of ${lessons.length} lessons complete`,
      state: allDone ? "done" : "current",
    },
    {
      title: "Get a shielded wallet",
      detail: walletDone ? "Address saved to your account" : `Install a wallet and save your ${UNIFIED_PREFIX} address`,
      state: walletDone ? "done" : completedCount >= 2 ? "current" : "upcoming",
      href: walletDone ? undefined : walletLesson && progress.get(walletLesson.id)?.status === "completed" ? "/account#wallet" : walletLesson ? `/learn/${walletLesson.slug}` : undefined,
      action: walletDone ? undefined : walletLesson && progress.get(walletLesson.id)?.status === "completed" ? "Save your address" : "Start wallet setup",
    },
    {
      title: "Earn your first ZEC",
      detail: `${rewardsUnlocked} of ${rewardLessons.length} rewards unlocked · ${reward} ${COIN} each`,
      state: rewardsUnlocked === rewardLessons.length && rewardLessons.length > 0 ? "done" : walletDone ? "current" : "upcoming",
      href: rewardsUnlocked > 0 ? "/rewards" : undefined,
      action: rewardsUnlocked > 0 ? "Claim your rewards" : undefined,
    },
    {
      title: "Spend it on campus",
      detail: "Pay a vendor who accepts ZEC. Your purchase stays private, even from us.",
      state: "upcoming",
      href: "/vendors",
      action: "See vendors",
    },
  ];

  return (
    <div className="page py-10 md:py-14">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">Your course</p>
          <h1 className="mt-2 text-xl md:text-2xl">
            {allDone ? "You finished the course" : `Welcome, ${session.profile.name.split(" ")[0]}`}
          </h1>
          <p className="mt-3 max-w-prose text-ink-muted">
            {isStudent
              ? `Five short lessons on money privacy and Zcash. Lessons 3 and 4 each earn a ${reward} ${COIN} shielded reward.`
              : "Five short lessons on money privacy and Zcash. Lessons 3 to 5 show you how to receive payments safely."}
          </p>

          <div className="mt-8 rounded-lg border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium">Progress</span>
              <span className="font-mono text-sm text-ink-muted">
                {completedCount}/{lessons.length} lessons
              </span>
            </div>
            <ProgressBar value={completedCount} max={lessons.length} label="Course progress" className="mt-3" />
            {nextUp ? (
              <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  <span className="text-ink-muted">Up next: </span>
                  <span className="font-medium">
                    Lesson {nextUp.position}. {nextUp.title}
                  </span>
                </p>
                <ButtonLink href={`/learn/${nextUp.slug}`} className="shrink-0">
                  {progress.has(nextUp.id) ? "Continue" : "Start"}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </ButtonLink>
              </div>
            ) : null}
          </div>

          <ol className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
            {lessons.map((lesson) => {
              const p = progress.get(lesson.id);
              const status = p?.status === "completed" ? "completed" : p ? "started" : "new";
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${lesson.slug}`}
                    className="group grid grid-cols-[36px_1fr] gap-3 px-5 py-5 transition-colors duration-150 ease-out hover:bg-paper sm:grid-cols-[48px_1fr_auto] sm:items-center sm:gap-4"
                  >
                    <span className="pt-0.5 font-mono text-sm text-ink-muted sm:pt-0">
                      {status === "completed" ? (
                        <CheckCircle2 aria-label="Completed" className="h-5 w-5 text-success" />
                      ) : (
                        String(lesson.position).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <p className="font-semibold group-hover:text-brand">{lesson.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{lesson.summary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
                        <StatusBadges status={status} reward={isStudent && lesson.reward_eligible} minutes={lesson.estimated_minutes} />
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <StatusBadges status={status} reward={isStudent && lesson.reward_eligible} minutes={lesson.estimated_minutes} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          {isStudent ? (
            <section aria-labelledby="journey-heading" className="rounded-lg border border-line bg-surface p-5">
              <h2 id="journey-heading" className="text-lg">
                Your journey
              </h2>
              <Steps steps={journey} className="mt-4" />
            </section>
          ) : (
            <div className="rounded-lg border border-line bg-surface p-5">
              <p className="text-sm font-semibold">Learning as a vendor</p>
              <p className="mt-2 text-sm text-ink-muted">
                Rewards are for students, but the lessons are for everyone. Lessons 3 to 5 cover exactly what you need to
                receive payments safely.
              </p>
              <Link href="/vendor" className="mt-3 inline-block text-sm font-medium text-brand underline underline-offset-4">
                Back to your shop
              </Link>
            </div>
          )}
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-5">
            <p className="text-sm font-semibold">Never share your recovery phrase</p>
            <p className="mt-2 text-sm text-ink/80">
              ShieldCampus, tutors and vendors will never ask for it. Anyone who does is trying to take your money.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusBadges({ status, reward, minutes }: { status: "completed" | "started" | "new"; reward: boolean; minutes: number }) {
  return (
    <>
      {reward ? <Badge tone="zec">Earns ZEC</Badge> : null}
      {status === "completed" ? (
        <Badge tone="success">Completed</Badge>
      ) : status === "started" ? (
        <Badge tone="brand">In progress</Badge>
      ) : (
        <span className="font-mono text-xs text-ink-muted">{minutes} min</span>
      )}
    </>
  );
}
