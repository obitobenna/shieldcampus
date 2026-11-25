import "server-only";
import { z } from "zod";

// Server-side environment, validated once on first use.
// Missing optional values fall back to safe defaults; missing required values throw a clear error.
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, "SUPABASE_SERVICE_ROLE_KEY is missing"),
  ZCASH_NETWORK: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(["mainnet", "testnet"]).default("testnet"),
  ),

  // Zcash node JSON-RPC (Zebra-compatible: getblockcount, getblockchaininfo). Optional.
  // A hosted provider URL, or a local Zebra (http://127.0.0.1:18232 on testnet).
  ZCASH_RPC_URL: z.string().url("ZCASH_RPC_URL must be a full http(s) URL").optional(),
  // Per-network node endpoints, used when an admin switches networks. ZCASH_RPC_URL is the fallback for both.
  ZCASH_RPC_URL_MAINNET: z.string().url("ZCASH_RPC_URL_MAINNET must be a full http(s) URL").optional(),
  ZCASH_RPC_URL_TESTNET: z.string().url("ZCASH_RPC_URL_TESTNET must be a full http(s) URL").optional(),
  ZCASH_RPC_API_KEY: z.string().optional(),
  // Header the provider expects the key in. Leave the default unless your provider says otherwise.
  ZCASH_RPC_API_KEY_HEADER: z.string().min(1).default("x-api-key"),
  ZCASH_RPC_USER: z.string().optional(),
  ZCASH_RPC_PASSWORD: z.string().optional(),
  ZCASH_RPC_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(6000),

  // Optional Level 2 verification through a Zallet wallet you run yourself. Server-side only.
  PAYMENT_VERIFIER: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(["manual", "zallet"]).default("manual"),
  ),
  ZALLET_RPC_URL: z.string().url("ZALLET_RPC_URL must be a full http(s) URL").optional(),
  ZALLET_RPC_USER: z.string().optional(),
  ZALLET_RPC_PASSWORD: z.string().optional(),

  // The reward fund's public address and its VIEW-ONLY key. Never a spending key or seed phrase.
  REWARD_FUND_ADDRESS: z.string().trim().optional(),
  // Per-network reward fund addresses. REWARD_FUND_ADDRESS is used for whichever network it belongs to.
  REWARD_FUND_ADDRESS_MAINNET: z.string().trim().optional(),
  REWARD_FUND_ADDRESS_TESTNET: z.string().trim().optional(),
  REWARD_FUND_VIEWING_KEY: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || !/^(secret-extended-key|secret-|usk|zxsk)/i.test(v) && v.split(/\s+/).length < 12,
      "REWARD_FUND_VIEWING_KEY looks like a SPENDING key or seed phrase. Remove it now: only a viewing key (uview… / uviewtest…) belongs here.",
    ),

  REWARD_ZEC: z.coerce.number().positive().max(10).default(0.01),
  DAILY_REWARD_CAP: z.coerce.number().int().positive().default(50),
  FALLBACK_ZEC_USD: z.coerce.number().positive().default(900),
  FALLBACK_ZEC_NGN: z.coerce.number().positive().default(1220000),
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
