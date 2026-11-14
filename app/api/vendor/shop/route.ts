import { NextResponse } from "next/server";
import { ApiError, parseJson, withApi } from "@/lib/api";
import { requireApiSession } from "@/lib/auth";
import type { VendorStatus } from "@/lib/database.types";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { shopSchema } from "@/lib/validation/account";
import { getShopForOwner, uniqueSlug } from "@/lib/vendors";
import { checkShieldedAddress } from "@/lib/zcash";

export interface ShopResponse {
  status: VendorStatus;
  needsReapproval: boolean;
}

// Create or update the signed-in vendor's shop.
// Changing the receiving address on an approved shop sends it back for approval,
// so a hijacked login can't silently redirect customers' payments.
export const PUT = withApi(async (request: Request) => {
  const session = await requireApiSession(["vendor"]);
  await enforceRateLimit(`shop:${session.userId}`, 20, 10 * 60);
  const input = await parseJson(request, shopSchema);

  const check = checkShieldedAddress(input.zcashAddress, env().ZCASH_NETWORK);
  if (!check.ok) throw new ApiError(422, check.message, { zcashAddress: check.message });

  const db = createAdminClient();
  const { data: studentUse } = await db.from("profiles").select("id").eq("zcash_address", check.address).maybeSingle();
  if (studentUse) {
    const msg = "This address is linked to a student account. Use a separate wallet for your shop.";
    throw new ApiError(409, msg, { zcashAddress: msg });
  }

  const existing = await getShopForOwner(session.userId);
  const addressChanged = existing ? existing.zcash_address !== check.address : false;
  const needsReapproval = existing?.status === "approved" && addressChanged;
  const status: VendorStatus = existing ? (needsReapproval ? "pending" : existing.status) : "pending";

  const fields = {
    business_name: input.businessName,
    category: input.category,
    location: input.location,
    description: input.description ?? null,
    zcash_address: check.address,
  };

  const result = existing
    ? await db
        .from("vendors")
        .update({
          ...fields,
          slug: existing.business_name === input.businessName ? existing.slug : await uniqueSlug(input.businessName, existing.id),
          status,
          ...(needsReapproval ? { approved_at: null, approved_by: null } : {}),
        })
        .eq("id", existing.id)
    : await db.from("vendors").insert({ ...fields, owner_id: session.userId, slug: await uniqueSlug(input.businessName) });

  if (result.error) {
    if (result.error.code === "23505") {
      const msg = "Another shop already uses this address. Each shop needs its own wallet address.";
      throw new ApiError(409, msg, { zcashAddress: msg });
    }
    throw new Error(result.error.message);
  }

  const body: ShopResponse = { status, needsReapproval };
  return NextResponse.json(body, { status: existing ? 200 : 201 });
});
