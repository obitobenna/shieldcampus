import type { ReactNode } from "react";

// Two-column auth layout: form on the left, a quiet reassurance panel on the right (desktop only).
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="page grid gap-12 py-10 md:py-16 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <h1 className="text-xl md:text-2xl">{title}</h1>
        <p className="mt-2 max-w-prose text-ink-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      <aside className="hidden lg:col-span-6 lg:col-start-7 lg:block">
        <div className="rounded-lg border border-line bg-surface p-8">
          <p className="eyebrow">What you get</p>
          <ol className="mt-6 space-y-6">
            {[
              ["01", "Learn", "Five short lessons on money privacy and Zcash, in English or Pidgin, with an AI tutor."],
              ["02", "Earn", "Pass the wallet lessons and receive a small shielded ZEC reward, often your first private transaction."],
              ["03", "Spend", "Pay campus vendors who accept ZEC, with prices shown in naira."],
            ].map(([n, title, body]) => (
              <li key={n} className="grid grid-cols-[40px_1fr] gap-2">
                <span className="font-mono text-sm text-ink-muted">{n}</span>
                <div>
                  <p className="font-display text-lg font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-line pt-6 text-sm text-ink-muted">
            We will never ask for your wallet&apos;s recovery phrase or private keys. Anyone who does is a scammer.
          </p>
        </div>
      </aside>
    </div>
  );
}
