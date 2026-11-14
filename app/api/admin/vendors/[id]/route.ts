import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import type { Database, VendorStatus } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { vendorActionSchema } from "@/lib/validation/pos";

const FROM: Record<"approve" | "suspend" | "reinstate", VendorStatus[]> = {
  approve: ["pending"],
  suspend: ["pending", "approved"],
  reinstate: ["suspended"],
};

export const POST = withApi(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession(["admin"]);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ApiError(404, "Vendor not found.");
  const { action } = await parseJson(request, vendorActionSchema);

  const db = createAdminClient();
  const { data: vendor, error } = await db.from("vendors").select("id, status").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!vendor) throw new ApiError(404, "Vendor not found.");
  if (!FROM[action].includes(vendor.status)) throw new ApiError(409, `This shop is already ${vendor.status}. Refresh the page.`);

  const now = new Date().toISOString();
  const update: Database["public"]["Tables"]["vendors"]["Update"] =
    action === "suspend"
      ? { status: "suspended" }
      : { status: "approved", approved_by: session.userId, approved_at: now };

  const { data: saved, error: saveError } = await db
    .from("vendors")
    .update(update)
    .eq("id", id)
    .eq("status", vendor.status)
    .select("id, status")
    .maybeSingle();
  if (saveError) throw new Error(saveError.message);
  if (!saved) throw new ApiError(409, "Someone else just updated this shop. Refresh the page.");

  revalidateTag("vendors");
  revalidateTag("impact");
  return NextResponse.json(saved);
});
