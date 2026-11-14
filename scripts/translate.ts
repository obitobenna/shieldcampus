// Pre-generates and caches the Nigerian Pidgin version of every lesson, so nobody waits
// during a live demo. Safe to re-run: lessons whose cached copy is current are skipped.
// Usage: npm run translate          (add -- --force to regenerate everything)
import { createClient } from "@supabase/supabase-js";
import { sourceHash, translateToPidgin } from "../lib/translate";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const force = process.argv.includes("--force");

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!process.env.LLM_API_KEY) {
  console.error("Missing LLM_API_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function main(): Promise<void> {
  const { data: lessons, error } = await db.from("lessons").select("id, slug, position, title, summary, content").order("position");
  if (error) throw new Error(error.message);

  let failures = 0;
  for (const lesson of lessons ?? []) {
    const hash = sourceHash(lesson);
    if (!force) {
      const { data: cached } = await db
        .from("lesson_translations")
        .select("source_hash")
        .eq("lesson_id", lesson.id)
        .eq("language", "pcm")
        .maybeSingle();
      if (cached?.source_hash === hash) {
        console.log(`Lesson ${lesson.position}: already translated, skipping`);
        continue;
      }
    }
    const started = Date.now();
    try {
      const out = await translateToPidgin(lesson);
      const { error: saveError } = await db
        .from("lesson_translations")
        .upsert({ lesson_id: lesson.id, language: "pcm", ...out, source_hash: hash }, { onConflict: "lesson_id,language" });
      if (saveError) throw new Error(saveError.message);
      console.log(`Lesson ${lesson.position}: "${out.title}" (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    } catch (err) {
      failures++;
      console.error(`Lesson ${lesson.position}: FAILED, ${err instanceof Error ? err.message : err}`);
    }
  }
  if (failures) {
    console.error(`${failures} lesson(s) failed. Re-run to retry; the app will also translate them on demand.`);
    process.exit(1);
  }
  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
