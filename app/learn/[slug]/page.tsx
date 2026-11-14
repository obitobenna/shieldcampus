import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LessonActivities } from "@/components/lesson/lesson-activities";
import { LessonMarkdown } from "@/components/lesson/lesson-markdown";
import { requirePageSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getLessonBySlug, getPublicQuiz, getUserProgress, listLessons, markStarted, parseStringArray, passMark } from "@/lib/lessons";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug).catch(() => null);
  return { title: lesson ? lesson.title : "Lesson" };
}

export default async function LessonPage({ params }: Params) {
  const { slug } = await params;
  const session = await requirePageSession(undefined, `/learn/${slug}`);
  const lesson = await getLessonBySlug(slug);
  if (!lesson) notFound();

  await markStarted(session.userId, lesson.id);
  const [lessons, progress, questions] = await Promise.all([
    listLessons(),
    getUserProgress(session.userId),
    getPublicQuiz(lesson.id),
  ]);

  const mine = progress.get(lesson.id);
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined;
  const completedCount = lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
  const showReward = session.profile.role === "student" && lesson.reward_eligible;

  return (
    <div className="page py-8 md:py-12">
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

          <header className="mt-8 max-w-prose">
            <h1 className="text-xl md:text-2xl">{lesson.title}</h1>
            <p className="mt-3 text-lg text-ink-muted">{lesson.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted">
                <Clock aria-hidden className="h-3.5 w-3.5" />
                {lesson.estimated_minutes} min read
              </span>
              {showReward ? <Badge tone="zec">Earns ZEC</Badge> : null}
              {mine?.status === "completed" ? (
                <Badge tone="success" dot>
                  Completed
                </Badge>
              ) : null}
            </div>
          </header>

          <div className="mt-8 max-w-prose border-t border-line pt-8">
            <LessonMarkdown content={lesson.content} />
          </div>

          <div className="mt-12 max-w-prose border-t border-line pt-10">
            <LessonActivities
              slug={lesson.slug}
              checkpoints={lesson.checkpoints}
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
              <Link href={`/learn/${prev.slug}`} className="group rounded-md border border-line bg-surface p-4 hover:border-ink/30">
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
                href={`/learn/${next.slug}`}
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

        <aside className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-6 space-y-4">
            <nav aria-label="Course outline" className="rounded-lg border border-line bg-surface">
              <p className="border-b border-line px-5 py-3 text-sm font-semibold">Course outline</p>
              <ol className="py-2">
                {lessons.map((l) => {
                  const done = progress.get(l.id)?.status === "completed";
                  const current = l.id === lesson.id;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/learn/${l.slug}`}
                        aria-current={current ? "page" : undefined}
                        className={cn(
                          "flex items-start gap-3 px-5 py-2.5 text-sm transition-colors duration-150 ease-out hover:bg-paper",
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
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
