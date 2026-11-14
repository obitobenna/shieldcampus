import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Lesson } from "@/lib/lessons";
import { sourceHash, translateToPidgin, type LessonText } from "@/lib/translate";

/** Cached Pidgin version, only if it was made from the current English text. */
export async function getCachedPidgin(lesson: Lesson): Promise<LessonText | null> {
  const { data, error } = await createAdminClient()
    .from("lesson_translations")
    .select("title, summary, content, source_hash")
    .eq("lesson_id", lesson.id)
    .eq("language", "pcm")
    .maybeSingle();
  if (error) {
    console.error("[translations] read failed", error.message);
    return null;
  }
  if (!data || data.source_hash !== sourceHash(lesson)) return null;
  return { title: data.title, summary: data.summary, content: data.content };
}

/** Generates and caches the Pidgin version. Throws on failure. */
export async function generatePidgin(lesson: Lesson): Promise<LessonText> {
  const translated = await translateToPidgin(lesson);
  const { error } = await createAdminClient()
    .from("lesson_translations")
    .upsert(
      { lesson_id: lesson.id, language: "pcm", ...translated, source_hash: sourceHash(lesson) },
      { onConflict: "lesson_id,language" },
    );
  if (error) throw new Error(`Saving translation failed: ${error.message}`);
  return translated;
}
