import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// A customer who started a payment from the shop QR gets a token that lets their browser check
// that one sale's status, without logging in and without the sale storing who they are.
// The token is an HMAC of the sale id, keyed by a server-only secret.

function sign(saleId: number): string {
  return createHmac("sha256", `shieldcampus-pay:${env().SUPABASE_SERVICE_ROLE_KEY}`)
    .update(String(saleId))
    .digest("base64url")
    .slice(0, 32);
}

export function payToken(saleId: number): string {
  return sign(saleId);
}

export function checkPayToken(saleId: number, token: string): boolean {
  if (!Number.isSafeInteger(saleId) || saleId <= 0 || typeof token !== "string") return false;
  const expected = Buffer.from(sign(saleId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
