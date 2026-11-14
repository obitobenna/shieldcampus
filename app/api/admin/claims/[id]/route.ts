import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import type { ClaimStatus, Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminClaimActionSchema } from "@/lib/validation/rewards";
import { buildZip321Uri, zecToZatoshis } from "@/lib/zcash";

export interface AdminClaimResponse {
  id: number;
  status: ClaimStatus;
  zip321Uri: string | null;
}

// Which actions are allowed from which status.
const ALLOWED: Record<"approve" | "reject" | "paid", ClaimStatus[]> = {
  approve: ["submitted"],
  reject: ["submitted", "approved"],
  paid: ["approved"],
};

export const POST = withApi(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession(["admin"]);
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(404, "Claim not found.");

  const input = await parseJson(request, adminClaimActionSchema);
  const db = createAdminClient();

  const { data: claim, error } = await db.from("reward_claims").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!claim) throw new ApiError(404, "Claim not found.");
  if (!ALLOWED[input.action].includes(claim.status)) {
    throw new ApiError(409, `This claim is already ${claim.status}. Refresh the page to see the latest status.`);
  }

  const now = new Date().toISOString();
  let update: Database["public"]["Tables"]["reward_claims"]["Update"];

  switch (input.action) {
    case "approve": {
      const uri = buildZip321Uri({
        address: claim.zcash_address,
        amountZats: zecToZatoshis(Number(claim.amount_zec)),
        memo: claim.memo,
      });
      update = { status: "approved", zip321_uri: uri, approved_by: session.userId, approved_at: now };
      break;
    }
    case "reject":
      update = { status: "rejected", rejection_reason: input.reason, zip321_uri: null };
      break;
    case "paid": {
      const { data: dupe } = await db.from("reward_claims").select("id").eq("txid", input.txid).neq("id", id).maybeSingle();
      if (dupe) throw new ApiError(409, `That transaction ID is already recorded for reward #${dupe.id}.`, { txid: "Already used." });
      update = { status: "paid", txid: input.txid, paid_at: now, verified_by: "manual", verified_at: now };
      break;
    }
  }

  // Conditional update guards against two admins acting on the same claim at once.
  const { data: saved, error: saveError } = await db
    .from("reward_claims")
    .update(update)
    .eq("id", id)
    .eq("status", claim.status)
    .select("id, status, zip321_uri")
    .maybeSingle();
  if (saveError) {
    if (saveError.code === "23505") throw new ApiError(409, "That transaction ID is already recorded.", { txid: "Already used." });
    throw new Error(saveError.message);
  }
  if (!saved) throw new ApiError(409, "Someone else just updated this claim. Refresh the page.");

  const body: AdminClaimResponse = { id: saved.id, status: saved.status, zip321Uri: saved.zip321_uri };
  return NextResponse.json(body);
});
