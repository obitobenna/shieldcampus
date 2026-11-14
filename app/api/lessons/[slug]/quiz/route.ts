import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { getLessonBySlug, gradeQuiz, listLessons, parseStringArray, type GradeResult } from "@/lib/lessons";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { quizSubmissionSchema } from "@/lib/validation/lessons";

export interface QuizResponse extends GradeResult {
  completed: boolean;
  rewardEligible: boolean;
  nextLesson: { slug: string; title: string } | null;
}

export const POST = withApi(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const session = await requireApiSession();
  await enforceRateLimit(
    `quiz:${session.userId}`,
    30,
    10 * 60,
    "You've submitted a lot of answers in a short time. Take a short break, re-read the lesson, then try again.",
  );

  const { slug } = await ctx.params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) throw new ApiError(404, "That lesson doesn't exist.");

  const { answers } = await parseJson(request, quizSubmissionSchema);
  const db = createAdminClient();

  const { data: existing, error: progressError } = await db
    .from("lesson_progress")
    .select("*")
    .eq("user_id", session.userId)
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  if (progressError) throw new Error(progressError.message);

  // Wallet setup: every checkpoint must be ticked before the quiz counts.
  if (lesson.checkpoints.length > 0) {
    const done = new Set(parseStringArray(existing?.checkpoints_done));
    if (!lesson.checkpoints.every((c) => done.has(c.id))) {
      throw new ApiError(409, "Tick every wallet setup step above before taking the quiz.");
    }
  }

  const grade = await gradeQuiz(lesson.id, answers);
  if (!grade) throw new ApiError(422, "Answer every question before submitting.");

  const alreadyCompleted = existing?.status === "completed";
  const completed = alreadyCompleted || grade.passed;
  const now = new Date().toISOString();

  const { error: saveError } = await db.from("lesson_progress").upsert(
    {
      user_id: session.userId,
      lesson_id: lesson.id,
      status: completed ? "completed" : "in_progress",
      checkpoints_done: existing?.checkpoints_done ?? [],
      attempts: (existing?.attempts ?? 0) + 1,
      last_score: grade.score,
      best_score: Math.max(existing?.best_score ?? 0, grade.score),
      completed_at: alreadyCompleted ? existing?.completed_at ?? now : grade.passed ? now : null,
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (saveError) throw new Error(saveError.message);

  const lessons = await listLessons();
  const next = lessons.find((l) => l.position > lesson.position) ?? null;

  const body: QuizResponse = {
    ...grade,
    completed,
    rewardEligible: lesson.reward_eligible,
    nextLesson: next ? { slug: next.slug, title: next.title } : null,
  };
  return NextResponse.json(body);
});
