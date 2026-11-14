import { z } from "zod";

export const VENDOR_CATEGORIES = [
  "food",
  "printing",
  "data",
  "barber",
  "fashion",
  "stationery",
  "transport",
  "other",
] as const;

export const profileUpdateSchema = z.object({
  name: z.string({ required_error: "Enter your name." }).trim().min(2, "Enter your full name.").max(80, "Use 80 characters or fewer."),
  university: z
    .string({ required_error: "Enter your university." })
    .trim()
    .min(2, "Enter your university.")
    .max(120, "Use 120 characters or fewer."),
  preferredLanguage: z.enum(["en", "pcm"], { errorMap: () => ({ message: "Choose English or Pidgin." }) }),
});

// The address itself is checked with checkShieldedAddress() (checksum + network) after this.
export const addressUpdateSchema = z.object({
  zcashAddress: z.string({ required_error: "Paste your shielded address." }).max(1200, "That's too long to be an address."),
});

export const shopSchema = z.object({
  businessName: z
    .string({ required_error: "Enter your business name." })
    .trim()
    .min(2, "Enter your business name.")
    .max(80, "Use 80 characters or fewer."),
  category: z.enum(VENDOR_CATEGORIES, { errorMap: () => ({ message: "Choose what you sell." }) }),
  location: z
    .string({ required_error: "Tell students where to find you." })
    .trim()
    .min(2, "Tell students where to find you.")
    .max(120, "Use 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(280, "Keep it under 280 characters.")
    .optional()
    .transform((v) => (v ? v : undefined)),
  zcashAddress: z.string({ required_error: "Paste your shop's shielded address." }).max(1200, "That's too long to be an address."),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type ShopInput = z.input<typeof shopSchema>;
