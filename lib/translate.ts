// Rewrites a lesson into Nigerian Pidgin with the configured LLM, keeping Markdown structure.
// Used by the translate API route and by `npm run translate` (pre-warms the cache before a demo).
import { createHash } from "node:crypto";
import { complete } from "@/lib/llm";

export interface LessonText {
  title: string;
  summary: string;
  content: string;
}

export function sourceHash(text: LessonText): string {
  return createHash("sha256").update(`${text.title}\n${text.summary}\n${text.content}`).digest("hex");
}

const SYSTEM = `You translate short educational lessons into Nigerian Pidgin English (Naija), the way Nigerian university students speak it.

Rules:
- Natural, warm and clear Pidgin. Not comic, not exaggerated, not "broken English". Keep the exact meaning and every fact.
- Keep ALL Markdown structure: headings (##), lists, numbered steps, bold, tables (same columns and rows), and blockquotes.
- Blockquotes that start with "**Warning**" or "**Tip**" must still start with exactly "**Warning**" or "**Tip**" (English word, bold), then continue in Pidgin.
- Do not translate or change: anything inside backticks, addresses, numbers, amounts, and the names Zcash, ZEC, Zodl, Zashi, Ywallet, Zingo, ShieldCampus, ZIP-321, Sapling, Orchard.
- Technical terms like "recovery phrase", "shielded address", "viewing key" and "memo" stay in English, explained in Pidgin where useful.
- Never add new advice, prices or opinions.

Reply in exactly this format and nothing else:
<<<TITLE>>>
(title in Pidgin)
<<<SUMMARY>>>
(summary in Pidgin)
<<<CONTENT>>>
(full lesson content in Pidgin Markdown)`;

export class TranslationError extends Error {}

function parse(raw: string): LessonText | null {
  const m = raw.match(/<<<TITLE>>>\s*([\s\S]*?)\s*<<<SUMMARY>>>\s*([\s\S]*?)\s*<<<CONTENT>>>\s*([\s\S]*)$/);
  if (!m) return null;
  const strip = (s: string) => s.replace(/^```(?:markdown)?\s*|\s*```$/g, "").trim();
  return { title: strip(m[1]!), summary: strip(m[2]!), content: strip(m[3]!) };
}

function validate(source: LessonText, out: LessonText): string | null {
  if (out.title.length < 3 || out.summary.length < 10) return "missing title or summary";
  if (out.content.length < source.content.length * 0.5) return "content too short";
  for (const marker of ["**Warning**", "**Tip**"]) {
    const want = source.content.split(marker).length - 1;
    const got = out.content.split(marker).length - 1;
    if (want > 0 && got < want) return `lost ${marker} callout`;
  }
  const tables = (s: string) => (s.match(/^\|.*\|$/gm) ?? []).length;
  if (tables(out.content) < tables(source.content)) return "table rows lost";
  return null;
}

export async function translateToPidgin(source: LessonText): Promise<LessonText> {
  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await complete(
      [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `<<<TITLE>>>\n${source.title}\n<<<SUMMARY>>>\n${source.summary}\n<<<CONTENT>>>\n${source.content}`,
        },
      ],
      { maxTokens: 6000, temperature: 0.3, timeoutMs: 90_000 },
    );
    const parsed = parse(raw);
    if (!parsed) {
      lastProblem = "unexpected format";
      continue;
    }
    const problem = validate(source, parsed);
    if (!problem) return parsed;
    lastProblem = problem;
  }
  throw new TranslationError(`Pidgin translation failed validation (${lastProblem}).`);
}
