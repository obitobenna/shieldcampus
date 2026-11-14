import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, clientIp, parseJson, withApi } from "@/lib/api";
import { AUDIT_COOKIE, AUDIT_TTL_SECONDS, auditEnabled, issueToken, pinMatches } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";

const pinSchema = z.object({
  pin: z.string({ required_error: "Enter the audit PIN." }).trim().min(4, "Enter the audit PIN.").max(32),
});

// POST /api/impact/audit — unlock the sponsor audit view with the PIN.
export const POST = withApi(async (request: Request) => {
  await enforceRateLimit(`audit:${clientIp(request)}`, 8, 15 * 60, "Too many PIN attempts. Wait 15 minutes, then try again.");
  if (!auditEnabled()) throw new ApiError(503, "The audit view isn't set up yet. Set AUDIT_PIN on the server.");
  const { pin } = await parseJson(request, pinSchema);
  if (!pinMatches(pin)) throw new ApiError(401, "That PIN isn't right.", { pin: "That PIN isn't right." });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUDIT_COOKIE, issueToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUDIT_TTL_SECONDS,
  });
  return res;
});

// DELETE /api/impact/audit — lock the audit view again.
export const DELETE = withApi(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUDIT_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
});
