import { z } from "zod";

export const SALE_MIN_NGN = 50;
export const SALE_MAX_NGN = 500_000;

export const createSaleSchema = z.object({
  amountNgn: z
    .number({ invalid_type_error: "Enter an amount in naira." })
    .int("Use whole naira.")
    .min(SALE_MIN_NGN, `The smallest sale is ₦${SALE_MIN_NGN}.`)
    .max(SALE_MAX_NGN, `The largest sale is ₦${SALE_MAX_NGN.toLocaleString("en-NG")}.`),
  note: z
    .string()
    .trim()
    .max(80, "Keep the note under 80 characters.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const saleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("paid"),
    txid: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || /^[0-9a-f]{64}$/.test(v), "A transaction ID is 64 characters of 0-9 and a-f. Leave it empty if you don't have it."),
  }),
  z.object({ action: z.literal("cancel") }),
]);

export const vendorActionSchema = z.object({
  action: z.enum(["approve", "suspend", "reinstate"]),
});
