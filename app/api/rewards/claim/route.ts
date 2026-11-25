import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getLessonBySlug } from "@/lib/lessons";
import { enforceRateLimit } from "@/lib/rate-limit";
import { claimsToday } from "@/lib/rewards";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimSchema } from "@/lib/validation/rewards";
import { checkShieldedAddress, formatZatoshis, zecToZatoshis } from "@/lib/zcash";
import { getNetwork } from "@/lib/active-network";

export interface ClaimResponse {
  id: number;
  status: "submitted";
}

// POST /api/rewards/claim: a student claims the reward for a passed, reward-eligible lesson.
// Rules: students only · lesson passed · shielded address saved · one claim per lesson ·
// one account per address · daily budget cap · admin approval before payout.
export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession(["student"]);
  await enforceRateLimit(`claim:${session.userId}`, 10, 60 * 60, "Too many claim attempts. Try again in an hour.");
  const { lessonSlug } = await parseJson(request, claimSchema);
  const e = env();
  const db = createAdminClient();

  const lesson = await getLessonBySlug(lessonSlug);
  if (!lesson || !lesson.reward_eligible) throw new ApiError(404, "This lesson doesn't have a reward.");

  const { data: progress, error: progressError } = await db
    .from("lesson_progress")
    .select("status")
    .eq("user_id", session.userId)
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  if (progressError) throw new Error(progressError.message);
  if (progress?.status !== "completed") {
    throw new ApiError(403, `Pass the "${lesson.title}" quiz first, then come back to claim.`);
  }

  const address = session.profile.zcash_address;
  if (!address) throw new ApiError(409, "Add your shielded address on your Account page first. That's where your reward will be sent.");
  const check = checkShieldedAddress(address, await getNetwork());
  if (!check.ok) throw new ApiError(409, `Your saved address can't receive this reward: ${check.message}`);

  const { data: existing, error: existingError } = await db
    .from("reward_claims")
    .select("id, status")
    .eq("user_id", session.userId)
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing && existing.status !== "rejected") {
    throw new ApiError(409, "You've already claimed this reward. Check its status below.");
  }

  // The same wallet can't collect rewards through several accounts.
  const { data: otherUse, error: otherError } = await db
    .from("reward_claims")
    .select("id")
    .eq("zcash_address", check.address)
    .neq("user_id", session.userId)
    .neq("status", "rejected")
    .limit(1);
  if (otherError) throw new Error(otherError.message);
  if (otherUse && otherUse.length > 0) {
    throw new ApiError(409, "This address has already received a reward on another account. Each student needs their own wallet.");
  }

  if ((await claimsToday()) >= e.DAILY_REWARD_CAP) {
    throw new ApiError(429, "Today's reward budget has been used up. Claims reopen tomorrow morning, and your progress is saved.");
  }

  const amount = formatZatoshis(zecToZatoshis(e.REWARD_ZEC));
  const fields = {
    zcash_address: check.address,
    amount_zec: Number(amount),
    status: "submitted" as const,
    rejection_reason: null,
    approved_by: null,
    approved_at: null,
    zip321_uri: null,
    created_at: new Date().toISOString(),
  };

  const result = existing
    ? await db.from("reward_claims").update(fields).eq("id", existing.id).select("id").single()
    : await db
        .from("reward_claims")
        .insert({ ...fields, user_id: session.userId, lesson_id: lesson.id })
        .select("id")
        .single();

  if (result.error) {
    if (result.error.code === "23505") throw new ApiError(409, "This reward has already been claimed.");
    throw new Error(result.error.message);
  }

  const body: ClaimResponse = { id: result.data.id, status: "submitted" };
  return NextResponse.json(body, { status: 201 });
});
