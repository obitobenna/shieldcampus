import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Sponsor audit access: the PIN unlocks a signed, httpOnly cookie for 12 hours.
// The signing key is derived from the PIN and a server secret, so changing AUDIT_PIN
// immediately invalidates every existing audit session.

export const AUDIT_COOKIE = "sc_audit";
export const AUDIT_TTL_SECONDS = 12 * 60 * 60;

function signingKey(): Buffer | null {
  const e = env();
  if (!e.AUDIT_PIN) return null;
  return createHmac("sha256", e.SUPABASE_SERVICE_ROLE_KEY).update(`shieldcampus-audit:${e.AUDIT_PIN}`).digest();
}

export function auditEnabled(): boolean {
  return env().AUDIT_PIN.length >= 4;
}

/** Constant-time PIN comparison (hash both sides so lengths always match). */
export function pinMatches(pin: string): boolean {
  const expected = env().AUDIT_PIN;
  if (!expected) return false;
  const a = createHmac("sha256", "pin").update(pin).digest();
  const b = createHmac("sha256", "pin").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function issueToken(now = Date.now()): string {
  const key = signingKey();
  if (!key) throw new Error("Audit is not configured.");
  const exp = Math.floor(now / 1000) + AUDIT_TTL_SECONDS;
  const sig = createHmac("sha256", key).update(`audit:${exp}`).digest("base64url");
  return `${exp}.${sig}`;
}

export function verifyToken(token: string | undefined, now = Date.now()): boolean {
  const key = signingKey();
  if (!key || !token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isInteger(exp) || exp * 1000 < now) return false;
  const expected = createHmac("sha256", key).update(`audit:${exp}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hasAuditAccess(): Promise<boolean> {
  return verifyToken((await cookies()).get(AUDIT_COOKIE)?.value);
}
