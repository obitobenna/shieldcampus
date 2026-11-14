import { z } from "zod";

export const TUTOR_MAX_MESSAGE = 800;

export const tutorRequestSchema = z.object({
  lessonSlug: z
    .string()
    .regex(/^[a-z0-9-]{1,80}$/)
    .nullable()
    .optional(),
  language: z.enum(["en", "pcm"]).default("en"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1, "Type a question first.")
    .max(30)
    .refine((m) => m[m.length - 1]?.role === "user", "The last message must be your question.")
    .refine(
      (m) => (m[m.length - 1]?.content.length ?? 0) <= TUTOR_MAX_MESSAGE,
      `Keep your question under ${TUTOR_MAX_MESSAGE} characters.`,
    ),
});

export type TutorRequest = z.infer<typeof tutorRequestSchema>;
