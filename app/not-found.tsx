import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page py-16 md:py-24">
      <div className="max-w-lg">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Compass aria-hidden className="h-5 w-5" />
        </span>
        <p className="mt-6 font-mono text-sm text-ink-muted">404</p>
        <h1 className="mt-2 text-xl md:text-2xl">We can&apos;t find that page</h1>
        <p className="mt-3 text-ink-muted">The link may be old, or the page may have moved. Your lessons and rewards are safe.</p>
        <ButtonLink href="/" className="mt-8">
          Go to the home page
        </ButtonLink>
      </div>
    </div>
  );
}
