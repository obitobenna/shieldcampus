"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LessonMarkdown } from "@/components/lesson/lesson-markdown";
import { fetchJson } from "@/lib/fetch-json";

// Shown when a lesson has no cached Pidgin version yet: asks the server to prepare it,
// then re-renders the page. Falls back to English if the AI is unavailable.
export function PidginLoader({ slug, englishContent }: { slug: string; englishContent: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void fetchJson<{ ready: boolean }>(`/api/lessons/${slug}/translate`, { method: "POST" }).then((res) => {
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }, [router, slug]);

  if (error) {
    return (
      <div className="space-y-6">
        <Alert tone="warning" title="Pidgin version no ready">
          {error}{" "}
          <Link href={`/learn/${slug}?lang=en`} replace className="font-medium text-brand underline underline-offset-4">
            Switch to English
          </Link>
        </Alert>
        <LessonMarkdown content={englishContent} />
      </div>
    );
  }

  return (
    <div aria-busy="true" aria-live="polite">
      <p className="mb-6 text-sm text-ink-muted">We dey prepare this lesson for Pidgin. E go take few seconds, only the first time.</p>
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-6 h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
      </div>
    </div>
  );
}
