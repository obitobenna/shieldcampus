import { z } from "zod";

export const claimSchema = z.object({
  lessonSlug: z.string().regex(/^[a-z0-9-]{1,80}$/, "Choose a lesson."),
});

export const adminClaimActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().min(3, "Give the student a short reason.").max(280, "Keep it under 280 characters."),
  }),
  z.object({
    action: z.literal("paid"),
    txid: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[0-9a-f]{64}$/, "A transaction ID is 64 characters of 0-9 and a-f. Copy it from the wallet's transaction details."),
  }),
]);

export type AdminClaimAction = z.infer<typeof adminClaimActionSchema>;
