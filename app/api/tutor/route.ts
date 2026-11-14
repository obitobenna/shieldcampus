import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getLessonBySlug } from "@/lib/lessons";
import { LlmError, llmConfigured, streamCompletion, type ChatMessage } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";
import { detectSecret, SECRET_WARNING } from "@/lib/safety";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildTutorMessages } from "@/lib/tutor";
import { tutorRequestSchema } from "@/lib/validation/tutor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sentinel the client strips: tells it the stream broke mid-answer.
const STREAM_ERROR = "\u0000ERR";
const HISTORY_TURNS = 10;

const CUT_OFF_TAIL: Record<"en" | "pcm", string> = {
  en: "\n\nSorry, my answer got cut off. I can help with money privacy, Zcash, wallets and staying safe. Please ask your question again, or try one about this lesson.",
  pcm: "\n\nSorry, my answer cut for middle. I fit help with money privacy, Zcash, wallet and how to stay safe. Abeg ask your question again, or ask about this lesson.",
};

// A very short answer that doesn't end like a sentence was almost certainly truncated.
function looksCutOff(answer: string): boolean {
  const t = answer.trim();
  return t.length > 0 && t.length < 40 && !/[.!?)"'*]$/.test(t);
}

export interface TutorHistoryItem {
  role: "user" | "assistant";
  content: string;
}

// GET /api/tutor?lesson=slug — the student's recent conversation for this lesson.
export const GET = withApi(async (request: Request) => {
  const session = await requireApiSession();
  const slug = new URL(request.url).searchParams.get("lesson");
  const lesson = slug ? await getLessonBySlug(slug) : null;

  let query = createAdminClient()
    .from("tutor_messages")
    .select("role, content, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(30);
  query = lesson ? query.eq("lesson_id", lesson.id) : query.is("lesson_id", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items: TutorHistoryItem[] = (data ?? []).reverse().map((m) => ({ role: m.role, content: m.content }));
  return NextResponse.json({ items, available: llmConfigured() });
});

// POST /api/tutor — streams the tutor's answer as plain text.
export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  const input = await parseJson(request, tutorRequestSchema);
  const question = input.messages[input.messages.length - 1]!.content;

  // Never forward or store a recovery phrase / private key.
  const secret = detectSecret(question);
  if (secret) {
    return new Response(SECRET_WARNING[input.language][secret], {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Tutor-Blocked": "secret" },
    });
  }

  const perBurst = await rateLimit(`tutor:burst:${session.userId}`, 12, 5 * 60);
  const perDay = await rateLimit(`tutor:day:${session.userId}`, 120, 24 * 60 * 60);
  if (!perBurst || !perDay) {
    throw new ApiError(
      429,
      input.language === "pcm"
        ? "You don ask plenty question for short time. Rest small, read the lesson, then ask again."
        : "You've asked a lot of questions in a short time. Take a short break, re-read the lesson, then ask again.",
    );
  }

  if (!llmConfigured()) throw new ApiError(503, "The tutor is offline right now. The lesson and quiz still work.");

  const lesson = input.lessonSlug ? await getLessonBySlug(input.lessonSlug) : null;
  // Prior turns: drop any that contained secrets, keep the most recent few.
  const history: ChatMessage[] = input.messages
    .filter((m) => !detectSecret(m.content))
    .slice(-HISTORY_TURNS * 2)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  const messages = buildTutorMessages(
    input.language,
    lesson ? { title: lesson.title, content: lesson.content } : null,
    history,
    env().REWARD_ZEC,
  );

  // Open the upstream stream before responding, so connection failures become a clean 503.
  let iterator: AsyncGenerator<string>;
  let first: IteratorResult<string>;
  try {
    iterator = streamCompletion(messages, { maxTokens: 500, temperature: 0.4, timeoutMs: 45_000, signal: request.signal });
    first = await iterator.next();
  } catch (err) {
    console.error("[tutor] upstream failed:", err instanceof LlmError ? `${err.kind}: ${err.message}` : err);
    throw new ApiError(503, "The tutor couldn't answer just now. Please try again in a moment. The lesson and quiz still work.");
  }

  const encoder = new TextEncoder();
  const userId = session.userId;
  const lessonId = lesson?.id ?? null;
  const language = input.language;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      let failed = false;
      try {
        if (!first.done && first.value) {
          answer += first.value;
          controller.enqueue(encoder.encode(first.value));
        }
        if (!first.done) {
          for await (const delta of iterator) {
            answer += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
        // Rarely the provider stops after a fragment (e.g. "Ah,"). Finish politely instead of leaving it hanging.
        if (looksCutOff(answer)) {
          const tail = CUT_OFF_TAIL[language];
          answer += tail;
          controller.enqueue(encoder.encode(tail));
        }
      } catch (err) {
        failed = true;
        console.error("[tutor] stream interrupted:", err instanceof Error ? err.message : err);
        controller.enqueue(encoder.encode(STREAM_ERROR));
      } finally {
        controller.close();
      }

      if (!failed && answer.trim()) {
        const { error } = await createAdminClient()
          .from("tutor_messages")
          .insert([
            { user_id: userId, lesson_id: lessonId, role: "user", content: question.slice(0, 8000), language },
            { user_id: userId, lesson_id: lessonId, role: "assistant", content: answer.slice(0, 8000), language },
          ]);
        if (error) console.error("[tutor] saving history failed:", error.message);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
});
