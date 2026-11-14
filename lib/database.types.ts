// Types mirroring supabase/migrations. Keep in sync when the schema changes
// (or regenerate with: npx supabase gen types typescript --linked > lib/database.types.ts).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "student" | "vendor" | "admin";
export type ProgressStatus = "in_progress" | "completed";
export type ClaimStatus = "submitted" | "approved" | "paid" | "rejected";
export type VendorStatus = "pending" | "approved" | "suspended";
export type VendorCategory =
  | "food"
  | "printing"
  | "data"
  | "barber"
  | "fashion"
  | "stationery"
  | "transport"
  | "other";
export type SaleStatus = "pending" | "paid" | "cancelled";
export type VerificationMethod = "manual" | "viewing_key";
export type Language = "en" | "pcm";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  name: string;
  university: string;
  role: UserRole;
  zcash_address: string | null;
  preferred_language: Language;
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: string;
  slug: string;
  position: number;
  title: string;
  summary: string;
  content: string;
  estimated_minutes: number;
  checkpoints: Json;
  reward_eligible: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type LessonTranslationRow = {
  lesson_id: string;
  language: "pcm";
  title: string;
  summary: string;
  content: string;
  source_hash: string;
  created_at: string;
};

export type QuizQuestionRow = {
  id: string;
  lesson_id: string;
  position: number;
  question: string;
  options: Json;
  correct_index: number;
  explanation: string;
};

export type LessonProgressRow = {
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  checkpoints_done: Json;
  attempts: number;
  best_score: number;
  last_score: number | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type RewardClaimRow = {
  id: number;
  user_id: string;
  lesson_id: string;
  zcash_address: string;
  amount_zec: number;
  memo: string;
  zip321_uri: string | null;
  status: ClaimStatus;
  txid: string | null;
  verified_by: VerificationMethod | null;
  verified_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type VendorRow = {
  id: string;
  owner_id: string;
  business_name: string;
  slug: string;
  category: VendorCategory;
  location: string;
  description: string | null;
  zcash_address: string;
  status: VendorStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SaleRow = {
  id: number;
  vendor_id: string;
  amount_ngn: number;
  amount_zec: number;
  rate_ngn_per_zec: number;
  rate_source: "coingecko" | "fallback";
  memo: string;
  note: string | null;
  zip321_uri: string | null;
  status: SaleStatus;
  txid: string | null;
  verified_by: VerificationMethod | null;
  verified_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TutorMessageRow = {
  id: number;
  user_id: string;
  lesson_id: string | null;
  role: "user" | "assistant";
  content: string;
  language: Language;
  created_at: string;
};

export type SettingRow = {
  key: string;
  value: Json;
  updated_at: string;
};

export type RateLimitRow = {
  key: string;
  window_start: string;
  count: number;
};

type Opt<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Opt<ProfileRow, "role" | "zcash_address" | "preferred_language" | "created_at" | "updated_at">>;
      lessons: Table<
        LessonRow,
        Opt<LessonRow, "id" | "estimated_minutes" | "checkpoints" | "reward_eligible" | "published" | "created_at" | "updated_at">
      >;
      lesson_translations: Table<LessonTranslationRow, Opt<LessonTranslationRow, "created_at">>;
      quiz_questions: Table<QuizQuestionRow, Opt<QuizQuestionRow, "id">>;
      lesson_progress: Table<
        LessonProgressRow,
        Opt<
          LessonProgressRow,
          "status" | "checkpoints_done" | "attempts" | "best_score" | "last_score" | "started_at" | "completed_at" | "updated_at"
        >
      >;
      reward_claims: Table<
        RewardClaimRow,
        Opt<
          Omit<RewardClaimRow, "id">,
          | "memo"
          | "zip321_uri"
          | "status"
          | "txid"
          | "verified_by"
          | "verified_at"
          | "approved_by"
          | "approved_at"
          | "paid_at"
          | "rejection_reason"
          | "created_at"
          | "updated_at"
        >,
        Partial<Omit<RewardClaimRow, "id">>
      >;
      vendors: Table<
        VendorRow,
        Opt<VendorRow, "id" | "description" | "status" | "approved_by" | "approved_at" | "created_at" | "updated_at">
      >;
      sales: Table<
        SaleRow,
        Opt<
          Omit<SaleRow, "id">,
          "memo" | "note" | "zip321_uri" | "status" | "txid" | "verified_by" | "verified_at" | "paid_at" | "created_at" | "updated_at"
        >,
        Partial<Omit<SaleRow, "id">>
      >;
      tutor_messages: Table<
        TutorMessageRow,
        Opt<Omit<TutorMessageRow, "id">, "lesson_id" | "language" | "created_at">,
        Partial<Omit<TutorMessageRow, "id">>
      >;
      settings: Table<SettingRow, Opt<SettingRow, "updated_at">>;
      rate_limits: Table<RateLimitRow, Opt<RateLimitRow, "window_start" | "count">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_shielded_zcash_address: { Args: { addr: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      progress_status: ProgressStatus;
      claim_status: ClaimStatus;
      vendor_status: VendorStatus;
      vendor_category: VendorCategory;
      sale_status: SaleStatus;
      verification_method: VerificationMethod;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
