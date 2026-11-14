import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { addressUpdateSchema } from "@/lib/validation/account";
import { checkShieldedAddress } from "@/lib/zcash";

// Students save the shielded address their rewards are paid to.
// (Vendors set their receiving address on their shop profile instead.)
export const PUT = withApi(async (request: Request) => {
  const session = await requireApiSession(["student"]);
  await enforceRateLimit(`address:${session.userId}`, 10, 60 * 60, "Too many address changes. Try again in an hour.");
  const { zcashAddress } = await parseJson(request, addressUpdateSchema);

  const check = checkShieldedAddress(zcashAddress, env().ZCASH_NETWORK);
  if (!check.ok) throw new ApiError(422, check.message, { zcashAddress: check.message });

  const db = createAdminClient();
  const { data: vendorUse } = await db.from("vendors").select("id").eq("zcash_address", check.address).maybeSingle();
  if (vendorUse) {
    const msg = "This address belongs to a vendor's shop. Use your own personal wallet address.";
    throw new ApiError(409, msg, { zcashAddress: msg });
  }

  const { error } = await db.from("profiles").update({ zcash_address: check.address }).eq("id", session.userId);
  if (error) {
    if (error.code === "23505") {
      const msg = "This address is already linked to another ShieldCampus account. Each student needs their own wallet.";
      throw new ApiError(409, msg, { zcashAddress: msg });
    }
    throw new Error(error.message);
  }

  return NextResponse.json({ zcashAddress: check.address, kind: check.kind });
});
