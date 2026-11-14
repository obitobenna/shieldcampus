"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page py-16 md:py-24">
      <div className="max-w-lg">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-warning-soft text-warning-ink">
          <TriangleAlert aria-hidden className="h-5 w-5" />
        </span>
        <h1 className="mt-6 text-xl md:text-2xl">Something went wrong on our side</h1>
        <p className="mt-3 text-ink-muted">
          This is usually a brief network problem. Nothing you did caused it, and your progress is saved.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-ink-muted">Reference {error.digest}</p> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>
            <RotateCcw aria-hidden className="h-4 w-4" />
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary">
            Home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
