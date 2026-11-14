// Upserts lessons and quiz questions. Safe to run repeatedly.
// Usage: npm run seed   (reads .env.local)
import { createClient } from "@supabase/supabase-js";
import { LESSONS } from "./content/lessons";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main(): Promise<void> {
  for (const lesson of LESSONS) {
    const { data, error } = await supabase
      .from("lessons")
      .upsert(
        {
          slug: lesson.slug,
          position: lesson.position,
          title: lesson.title,
          summary: lesson.summary,
          content: lesson.content,
          estimated_minutes: lesson.estimatedMinutes,
          checkpoints: lesson.checkpoints,
          reward_eligible: lesson.rewardEligible,
          published: true,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (error || !data) throw new Error(`Lesson ${lesson.slug}: ${error?.message ?? "no row returned"}`);

    // Replace questions so edits to content are reflected exactly.
    const del = await supabase.from("quiz_questions").delete().eq("lesson_id", data.id);
    if (del.error) throw new Error(`Clearing questions for ${lesson.slug}: ${del.error.message}`);

    const ins = await supabase.from("quiz_questions").insert(
      lesson.questions.map((q, i) => ({
        lesson_id: data.id,
        position: i + 1,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation,
      })),
    );
    if (ins.error) throw new Error(`Questions for ${lesson.slug}: ${ins.error.message}`);

    // Drop cached Pidgin translations; they are regenerated on demand from the new text.
    await supabase.from("lesson_translations").delete().eq("lesson_id", data.id);

    console.log(`Seeded lesson ${lesson.position}: ${lesson.title} (${lesson.questions.length} questions)`);
  }
  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
