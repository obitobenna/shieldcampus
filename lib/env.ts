import "server-only";
import { z } from "zod";

// Server-side environment, validated once on first use.
// Missing optional values fall back to safe defaults; missing required values throw a clear error.
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY is missing"),
  ZCASH_NETWORK: z.enum(["mainnet", "testnet"]).default("mainnet"),
  REWARD_ZEC: z.coerce.number().positive().max(10).default(0.01),
  DAILY_REWARD_CAP: z.coerce.number().int().positive().default(50),
  FALLBACK_ZEC_USD: z.coerce.number().positive().default(40),
  FALLBACK_ZEC_NGN: z.coerce.number().positive().default(60000),
  AUDIT_PIN: z.string().default(""),
  LLM_API_KEY: z.string().default(""),
  LLM_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  LLM_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const blankToUndefined = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
  );
  const parsed = schema.safeParse(blankToUndefined);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
