import { NextResponse } from "next/server";
import { ApiError, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { generatePidgin, getCachedPidgin } from "@/lib/lesson-translations";
import { getLessonBySlug } from "@/lib/lessons";
import { llmConfigured } from "@/lib/llm";
import { enforceRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

// POST /api/lessons/[slug]/translate — makes sure a Pidgin version exists (cached for everyone).
export const POST = withApi(async (_request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const session = await requireApiSession();
  const { slug } = await ctx.params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) throw new ApiError(404, "That lesson doesn't exist.");

  if (await getCachedPidgin(lesson)) return NextResponse.json({ ready: true, cached: true });

  if (!llmConfigured()) throw new ApiError(503, "Pidgin version no dey available now. Read am for English for now.");
  await enforceRateLimit(`translate:${session.userId}`, 10, 10 * 60, "Too many translation requests. Try again in a few minutes.");

  try {
    await generatePidgin(lesson);
  } catch (err) {
    console.error("[translate]", err instanceof Error ? err.message : err);
    throw new ApiError(503, "We couldn't prepare the Pidgin version just now. Read am for English for now, and try again later.");
  }
  return NextResponse.json({ ready: true, cached: false });
});
