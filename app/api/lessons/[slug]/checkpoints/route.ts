import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { getLessonBySlug } from "@/lib/lessons";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkpointUpdateSchema } from "@/lib/validation/lessons";

export const POST = withApi(async (request: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const session = await requireApiSession();
  await enforceRateLimit(`checkpoints:${session.userId}`, 120, 10 * 60);

  const { slug } = await ctx.params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) throw new ApiError(404, "That lesson doesn't exist.");
  if (lesson.checkpoints.length === 0) throw new ApiError(400, "This lesson has no checkpoints.");

  const { done } = await parseJson(request, checkpointUpdateSchema);
  const valid = new Set(lesson.checkpoints.map((c) => c.id));
  const clean = [...new Set(done)].filter((id) => valid.has(id));

  const { error } = await createAdminClient()
    .from("lesson_progress")
    .upsert(
      { user_id: session.userId, lesson_id: lesson.id, checkpoints_done: clean },
      { onConflict: "user_id,lesson_id" },
    );
  if (error) throw new Error(error.message);

  return NextResponse.json({ done: clean });
});
