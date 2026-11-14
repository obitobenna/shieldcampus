import Link from "next/link";

// Wordmark: a solid shield mark in brand green with a gold notch for Zcash.
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-sm" aria-label="ShieldCampus home">
      <svg width="24" height="28" viewBox="0 0 24 28" aria-hidden>
        <path d="M12 0 24 4.5V13c0 7.2-5 12.6-12 15C5 25.6 0 20.2 0 13V4.5L12 0Z" fill="rgb(var(--brand))" />
        <path d="M7 9h10v2.4l-6.2 6.2H17V20H7v-2.4l6.2-6.2H7V9Z" fill="rgb(var(--zec))" />
      </svg>
      <span className={`font-display text-lg font-bold tracking-[-0.02em] text-ink ${compact ? "hidden sm:inline" : ""}`}>ShieldCampus</span>
    </Link>
  );
}
