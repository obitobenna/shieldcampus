import { z } from "zod";

// Shared between client forms and API routes.
export const emailSchema = z
  .string({ required_error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address, like ada@unn.edu.ng.");

export const passwordSchema = z
  .string({ required_error: "Enter a password." })
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

export const signupSchema = z.object({
  name: z
    .string({ required_error: "Enter your name." })
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Use 80 characters or fewer."),
  university: z
    .string({ required_error: "Enter your university." })
    .trim()
    .min(2, "Enter your university.")
    .max(120, "Use 120 characters or fewer."),
  email: emailSchema,
  password: passwordSchema,
  accountType: z.enum(["student", "vendor"]).default("student"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().max(200).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const NIGERIAN_UNIVERSITIES = [
  "University of Nigeria, Nsukka",
  "University of Lagos",
  "University of Ibadan",
  "Obafemi Awolowo University",
  "Ahmadu Bello University",
  "University of Benin",
  "Nnamdi Azikiwe University",
  "Enugu State University of Science and Technology",
  "University of Port Harcourt",
  "Covenant University",
  "Federal University of Technology, Owerri",
  "Federal University of Technology, Akure",
  "Lagos State University",
  "University of Ilorin",
  "Bayero University Kano",
] as const;
