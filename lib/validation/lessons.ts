import { z } from "zod";

export const quizSubmissionSchema = z.object({
  answers: z
    .array(z.number({ invalid_type_error: "Answer every question." }).int().min(0).max(9), {
      required_error: "Answer every question.",
    })
    .min(1, "Answer every question.")
    .max(20),
});

export const checkpointUpdateSchema = z.object({
  done: z.array(z.string().min(1).max(40)).max(20),
});

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;
