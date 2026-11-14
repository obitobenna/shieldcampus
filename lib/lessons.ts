import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LessonProgressRow, LessonRow } from "@/lib/database.types";

export interface Checkpoint {
  id: string;
  label: string;
}

export interface Lesson extends Omit<LessonRow, "checkpoints"> {
  checkpoints: Checkpoint[];
}

// Question as sent to the browser: never includes the correct answer.
export interface PublicQuestion {
  id: string;
  position: number;
  question: string;
  options: string[];
}

export interface QuestionResult {
  correct: boolean;
  explanation: string;
  // Revealed only once the student has passed, so retries still require thought.
  correctIndex: number | null;
}

const checkpointsSchema = z.array(z.object({ id: z.string(), label: z.string() }));
const stringArraySchema = z.array(z.string());

function toLesson(row: LessonRow): Lesson {
  const parsed = checkpointsSchema.safeParse(row.checkpoints);
  return { ...row, checkpoints: parsed.success ? parsed.data : [] };
}

export function parseStringArray(json: unknown): string[] {
  const parsed = stringArraySchema.safeParse(json);
  return parsed.success ? parsed.data : [];
}

// Pass mark: two thirds, rounded up (2 of 3).
export function passMark(total: number): number {
  return Math.ceil((total * 2) / 3);
}

export async function listLessons(): Promise<Lesson[]> {
  const { data, error } = await createAdminClient()
    .from("lessons")
    .select("*")
    .eq("published", true)
    .order("position", { ascending: true });
  if (error) throw new Error(`Loading lessons failed: ${error.message}`);
  return (data ?? []).map(toLesson);
}

export async function getLessonBySlug(slug: string): Promise<Lesson | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data, error } = await createAdminClient()
    .from("lessons")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(`Loading lesson failed: ${error.message}`);
  return data ? toLesson(data) : null;
}

export async function getUserProgress(userId: string): Promise<Map<string, LessonProgressRow>> {
  const { data, error } = await createAdminClient().from("lesson_progress").select("*").eq("user_id", userId);
  if (error) throw new Error(`Loading progress failed: ${error.message}`);
  return new Map((data ?? []).map((p) => [p.lesson_id, p]));
}

// Records that the student opened the lesson. No-op if a row already exists.
export async function markStarted(userId: string, lessonId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("lesson_progress")
    .upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
  if (error) console.error("[lessons] markStarted failed", error.message);
}

async function loadQuestions(lessonId: string) {
  const { data, error } = await createAdminClient()
    .from("quiz_questions")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true });
  if (error) throw new Error(`Loading quiz failed: ${error.message}`);
  return (data ?? []).map((q) => ({ ...q, options: parseStringArray(q.options) }));
}

export async function getPublicQuiz(lessonId: string): Promise<PublicQuestion[]> {
  const questions = await loadQuestions(lessonId);
  return questions.map(({ id, position, question, options }) => ({ id, position, question, options }));
}

export interface GradeResult {
  score: number;
  total: number;
  passMark: number;
  passed: boolean;
  results: QuestionResult[];
}

export async function gradeQuiz(lessonId: string, answers: number[]): Promise<GradeResult | null> {
  const questions = await loadQuestions(lessonId);
  if (questions.length === 0 || answers.length !== questions.length) return null;

  const marks = questions.map((q, i) => answers[i] === q.correct_index);
  const score = marks.filter(Boolean).length;
  const mark = passMark(questions.length);
  const passed = score >= mark;

  return {
    score,
    total: questions.length,
    passMark: mark,
    passed,
    results: questions.map((q, i) => ({
      correct: marks[i] === true,
      explanation: q.explanation,
      correctIndex: passed ? q.correct_index : null,
    })),
  };
}
