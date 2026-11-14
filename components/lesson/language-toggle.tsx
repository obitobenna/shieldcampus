import Link from "next/link";
import { cn } from "@/lib/cn";

export function LanguageToggle({ slug, current }: { slug: string; current: "en" | "pcm" }) {
  const options = [
    { value: "en", label: "English" },
    { value: "pcm", label: "Pidgin" },
  ] as const;
  return (
    <nav aria-label="Lesson language" className="inline-grid grid-cols-2 rounded-md border border-line bg-surface p-1">
      {options.map((o) => (
        <Link
          key={o.value}
          href={`/learn/${slug}?lang=${o.value}`}
          scroll={false}
          replace
          aria-current={current === o.value ? "true" : undefined}
          className={cn(
            "rounded px-3 py-1.5 text-center text-sm font-medium transition-colors duration-150 ease-out",
            current === o.value ? "bg-brand text-white" : "text-ink-muted hover:text-ink",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
