import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LanguageToggle } from "@/components/lesson/language-toggle";
import { LessonActivities } from "@/components/lesson/lesson-activities";
import { LessonMarkdown } from "@/components/lesson/lesson-markdown";
import { PidginLoader } from "@/components/lesson/pidgin-loader";
import { TESTNET_CHECKPOINT_LABELS, TestnetWalletGuide } from "@/components/lesson/testnet-wallet-guide";
import { TutorPanel } from "@/components/tutor/tutor-panel";
import { requireLearnerPage } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getCachedPidgin } from "@/lib/lesson-translations";
import { getLessonBySlug, getPublicQuiz, getUserProgress, listLessons, markStarted, parseStringArray, passMark } from "@/lib/lessons";
import { llmConfigured } from "@/lib/llm";
import { getNetworkInfo } from "@/lib/active-network";
import { tutorStarters } from "@/lib/tutor-starters";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug).catch(() => null);
  return { title: lesson ? lesson.title : "Lesson" };
}

export default async function LessonPage({ params, searchParams }: Props) {
  const { coin: COIN, isTestnet: IS_TESTNET } = await getNetworkInfo();
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const session = await requireLearnerPage(`/learn/${slug}`);
  const lesson = await getLessonBySlug(slug);
  if (!lesson) notFound();

  const lang: "en" | "pcm" = langParam === "pcm" || langParam === "en" ? langParam : session.profile.preferred_language;

  await markStarted(session.userId, lesson.id);
  const [lessons, progress, questions, pidgin] = await Promise.all([
    listLessons(),
    getUserProgress(session.userId),
    getPublicQuiz(lesson.id),
    lang === "pcm" ? getCachedPidgin(lesson) : Promise.resolve(null),
  ]);

  const display = pidgin ?? { title: lesson.title, summary: lesson.summary, content: lesson.content };
  const waitingForPidgin = lang === "pcm" && !pidgin;
  const mine = progress.get(lesson.id);
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined;
  const completedCount = lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
  const showReward = session.profile.role === "student" && lesson.reward_eligible;
  const langQuery = lang === "pcm" ? "?lang=pcm" : "";
  // On testnet, Lesson 3 points students at Zingo / Zkool and utest1 addresses instead of mainnet wallets.
  const testnetWalletLesson = IS_TESTNET && lesson.slug === "wallet-setup";
  const checkpoints = testnetWalletLesson
    ? lesson.checkpoints.map((c) => ({ ...c, label: TESTNET_CHECKPOINT_LABELS[c.id] ?? c.label }))
    : lesson.checkpoints;

  return (
    <div className="page pb-24 pt-8 md:pt-12 lg:pb-12">
      <div className="grid gap-10 lg:grid-cols-12">
        <article className="min-w-0 lg:col-span-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-muted">
            <Link href="/learn" className="hover:text-ink">
              Lessons
            </Link>
            <span aria-hidden>/</span>
            <span className="font-mono">
              {lesson.position} of {lessons.length}
            </span>
          </nav>
          <ProgressBar value={completedCount} max={lessons.length} label="Course progress" className="mt-4 max-w-prose" />

          <details className="group mt-4 max-w-prose rounded-md border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              Course outline
              <span className="flex items-center gap-2 font-mono text-xs text-ink-muted">
                {completedCount}/{lessons.length} done
                <ChevronDown aria-hidden className="h-4 w-4 transition-transform duration-150 ease-out group-open:rotate-180" />
              </span>
            </summary>
            <ol className="border-t border-line py-1">
              {lessons.map((l) => {
                const done = progress.get(l.id)?.status === "completed";
                const current = l.id === lesson.id;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${l.slug}${langQuery}`}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex items-start gap-3 px-4 py-2 text-sm transition-colors duration-150 ease-out hover:bg-paper",
                        current && "bg-brand-soft font-medium text-brand hover:bg-brand-soft",
                      )}
                    >
                      <span className="w-5 shrink-0 font-mono text-xs leading-5 text-ink-muted">
                        {done ? <CheckCircle2 aria-label="Completed" className="h-4 w-4 text-success" /> : l.position}
                      </span>
                      <span>{l.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </details>

          <header className="mt-8 max-w-prose">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <LanguageToggle slug={lesson.slug} current={lang} />
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
                  <Clock aria-hidden className="h-3.5 w-3.5" />
                  {lesson.estimated_minutes} min
                </span>
                {showReward ? <Badge tone="zec">Earns {COIN}</Badge> : null}
                {mine?.status === "completed" ? (
                  <Badge tone="success" dot>
                    Completed
                  </Badge>
                ) : null}
              </div>
            </div>
            <h1 className="text-xl md:text-2xl">{display.title}</h1>
            <p className="mt-3 text-lg text-ink-muted">{display.summary}</p>
          </header>

          <div className="mt-8 max-w-prose border-t border-line pt-8">
            {testnetWalletLesson ? <TestnetWalletGuide /> : null}
            {waitingForPidgin ? (
              <PidginLoader slug={lesson.slug} englishContent={lesson.content} />
            ) : (
              <LessonMarkdown content={display.content} />
            )}
          </div>

          <div className="mt-12 max-w-prose border-t border-line pt-10">
            {lang === "pcm" ? (
              <p className="mb-6 text-sm text-ink-muted">
                The quiz dey for English so everybody go answer the same questions. Take your time.
              </p>
            ) : null}
            <LessonActivities
              slug={lesson.slug}
              checkpoints={checkpoints}
              initialDone={parseStringArray(mine?.checkpoints_done)}
              questions={questions}
              passMark={passMark(questions.length)}
              completed={mine?.status === "completed"}
              bestScore={mine?.best_score ?? 0}
              rewardEligible={showReward}
              nextLesson={next ? { slug: next.slug, title: next.title } : null}
            />
          </div>

          <nav aria-label="Lesson navigation" className="mt-12 grid max-w-prose gap-3 border-t border-line pt-8 sm:grid-cols-2">
            {prev ? (
              <Link href={`/learn/${prev.slug}${langQuery}`} className="group rounded-md border border-line bg-surface p-4 hover:border-ink/30">
                <span className="flex items-center gap-1 text-xs text-ink-muted">
                  <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Previous
                </span>
                <span className="mt-1 block text-sm font-medium group-hover:text-brand">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/learn/${next.slug}${langQuery}`}
                className="group rounded-md border border-line bg-surface p-4 text-right hover:border-ink/30"
              >
                <span className="flex items-center justify-end gap-1 text-xs text-ink-muted">
                  Next <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 block text-sm font-medium group-hover:text-brand">{next.title}</span>
              </Link>
            ) : null}
          </nav>
        </article>

        <aside className="lg:col-span-4">
          <TutorPanel
            key={`${lesson.slug}-${lang}`}
            lessonSlug={lesson.slug}
            language={lang}
            available={llmConfigured()}
            starters={tutorStarters(lesson.slug, lang)}
          />
        </aside>
      </div>
    </div>
  );
}
