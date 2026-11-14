"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, Lock, RotateCcw, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fetchJson } from "@/lib/fetch-json";
import type { QuizResponse } from "@/app/api/lessons/[slug]/quiz/route";

interface Checkpoint {
  id: string;
  label: string;
}
interface Question {
  id: string;
  position: number;
  question: string;
  options: string[];
}

interface Props {
  slug: string;
  checkpoints: Checkpoint[];
  initialDone: string[];
  questions: Question[];
  passMark: number;
  completed: boolean;
  bestScore: number;
  rewardEligible: boolean;
  nextLesson: { slug: string; title: string } | null;
}

export function LessonActivities(props: Props) {
  const [done, setDone] = useState<string[]>(props.initialDone);
  const checkpointsComplete = props.checkpoints.every((c) => done.includes(c.id));

  return (
    <div className="space-y-12">
      {props.checkpoints.length > 0 ? (
        <Checkpoints slug={props.slug} checkpoints={props.checkpoints} done={done} onChange={setDone} />
      ) : null}
      <Quiz {...props} locked={!checkpointsComplete} />
    </div>
  );
}

function Checkpoints({
  slug,
  checkpoints,
  done,
  onChange,
}: {
  slug: string;
  checkpoints: Checkpoint[];
  done: string[];
  onChange: (next: string[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function toggle(id: string) {
    const previous = done;
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    onChange(next); // optimistic
    setSaving(true);
    setError(null);
    const res = await fetchJson<{ done: string[] }>(`/api/lessons/${slug}/checkpoints`, {
      method: "POST",
      json: { done: next },
    });
    setSaving(false);
    if (!res.ok) {
      onChange(previous);
      setError(res.error);
    }
  }

  const count = checkpoints.filter((c) => done.includes(c.id)).length;

  return (
    <section aria-labelledby="checkpoints-heading" className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id="checkpoints-heading" className="text-lg">
          Setup checkpoints
        </h2>
        <span className="font-mono text-sm text-ink-muted" aria-live="polite">
          {count}/{checkpoints.length}
          {saving ? <span className="sr-only"> saving</span> : null}
        </span>
      </div>
      <ul className="divide-y divide-line">
        {checkpoints.map((c) => {
          const checked = done.includes(c.id);
          return (
            <li key={c.id}>
              <label className="flex min-h-[56px] cursor-pointer items-start gap-3 px-5 py-4 transition-colors duration-150 ease-out hover:bg-paper">
                <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(c.id)} />
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150 ease-out peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                    checked ? "border-brand bg-brand text-white" : "border-ink/30 bg-surface",
                  )}
                >
                  {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span className={cn("text-base", checked && "text-ink-muted")}>{c.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {error ? (
        <div className="border-t border-line p-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}
    </section>
  );
}

function Quiz({
  slug,
  questions,
  passMark,
  completed,
  bestScore,
  rewardEligible,
  nextLesson,
  locked,
}: Props & { locked: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<QuizResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = answers.every((a) => a !== null);

  async function submit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setError(null);
    const res = await fetchJson<QuizResponse>(`/api/lessons/${slug}/quiz`, { method: "POST", json: { answers } });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res.data);
    if (res.data.passed) router.refresh();
    document.getElementById("quiz-result")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function retry() {
    setAnswers(questions.map(() => null));
    setResult(null);
    setError(null);
    document.getElementById("quiz-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (questions.length === 0) return null;

  return (
    <section aria-labelledby="quiz-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Check your understanding</p>
          <h2 id="quiz-heading" className="mt-1 text-xl">
            Quick quiz
          </h2>
        </div>
        {completed && !result ? (
          <Badge tone="success" dot>
            Passed · best {bestScore}/{questions.length}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        {questions.length} questions. Get {passMark} right to pass. You can try as many times as you need.
      </p>

      {locked ? (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-dashed border-line bg-surface p-5">
          <Lock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
          <p className="text-sm text-ink-muted">Tick every setup checkpoint above to unlock the quiz.</p>
        </div>
      ) : (
        <ol className="mt-6 space-y-6">
          {questions.map((q, qi) => {
            const r = result?.results[qi];
            return (
              <li key={q.id} className="rounded-lg border border-line bg-surface p-5">
                <fieldset disabled={!!result || submitting}>
                  <legend className="flex gap-3 text-base font-semibold">
                    <span className="font-mono text-sm font-normal leading-7 text-ink-muted">{qi + 1}.</span>
                    <span>{q.question}</span>
                  </legend>
                  <div className="mt-4 space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[qi] === oi;
                      const isCorrectAnswer = r?.correctIndex === oi;
                      const isWrongPick = r && selected && !r.correct;
                      return (
                        <label
                          key={oi}
                          className={cn(
                            "flex min-h-[48px] cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-base transition-colors duration-150 ease-out has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                            isCorrectAnswer || (r?.correct && selected)
                              ? "border-success bg-success-soft"
                              : isWrongPick
                                ? "border-danger bg-danger-soft"
                                : selected
                                  ? "border-brand bg-brand-soft"
                                  : "border-line hover:border-ink/30",
                            result && "cursor-default",
                          )}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            className="sr-only"
                            checked={selected}
                            onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                          />
                          <span
                            aria-hidden
                            className={cn(
                              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                              selected ? "border-brand" : "border-ink/30",
                            )}
                          >
                            {selected ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
                          </span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {r ? (
                  <div className={cn("mt-4 flex gap-2 text-sm", r.correct ? "text-success" : "text-danger")}>
                    {r.correct ? (
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <X aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <p>
                      <span className="font-semibold">{r.correct ? "Correct." : "Not quite."}</span>{" "}
                      <span className="text-ink/80">{r.explanation}</span>
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {error ? <Alert tone="danger" className="mt-6">{error}</Alert> : null}

      <div id="quiz-result" className="mt-6">
        {result ? (
          result.passed ? (
            <div className="rounded-lg border border-success/30 bg-success-soft p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-success" />
                <div>
                  <p className="font-display text-lg font-semibold">
                    You passed with <span className="font-mono">{result.score}/{result.total}</span>.
                  </p>
                  <p className="mt-1 text-sm text-ink/80">
                    {rewardEligible
                      ? "This lesson earns a shielded ZEC reward. You can claim it once reward claims open for your account."
                      : "Lesson complete. Your progress is saved."}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {nextLesson ? (
                  <ButtonLink href={`/learn/${nextLesson.slug}`}>
                    Next: {nextLesson.title}
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/learn">Back to all lessons</ButtonLink>
                )}
                <Button variant="secondary" onClick={retry}>
                  <RotateCcw aria-hidden className="h-4 w-4" />
                  Retake quiz
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-warning/30 bg-warning-soft p-5">
              <p className="font-display text-lg font-semibold">
                <span className="font-mono">{result.score}/{result.total}</span>, almost there.
              </p>
              <p className="mt-1 text-sm text-ink/80">
                You need {result.passMark} correct to pass. Read the notes above, look back at the lesson, and try again.
              </p>
              <Button className="mt-4" onClick={retry}>
                <RotateCcw aria-hidden className="h-4 w-4" />
                Try again
              </Button>
            </div>
          )
        ) : locked ? null : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={submit} disabled={!allAnswered} loading={submitting} size="lg">
              Check my answers
            </Button>
            {!allAnswered ? (
              <span className="text-sm text-ink-muted">
                {answers.filter((a) => a !== null).length} of {questions.length} answered
              </span>
            ) : null}
          </div>
        )}
      </div>

      {completed && !result && nextLesson ? (
        <p className="mt-6 text-sm text-ink-muted">
          Already passed.{" "}
          <Link href={`/learn/${nextLesson.slug}`} className="font-medium text-brand underline underline-offset-4">
            Go to the next lesson
          </Link>
        </p>
      ) : null}
    </section>
  );
}
