import { Eye, EyeOff, KeyRound } from "lucide-react";

export function ViewingKeyExplainer() {
  const items = [
    {
      icon: Eye,
      title: "Sponsors can audit every payout",
      body: "The reward fund is a shielded wallet. Its viewing key lets sponsors and auditors check every reward that left it: amount, time and the memo that ties it to a claim ID.",
    },
    {
      icon: EyeOff,
      title: "The public sees totals only",
      body: "This page shows aggregates. No student's name, address or individual payment is ever published, and vendor sales stay between the student and the vendor.",
    },
    {
      icon: KeyRound,
      title: "A viewing key cannot spend",
      body: "It is read-only. Sharing it with an auditor gives them visibility, never control of the funds. The fund's spending keys never touch this website.",
    },
  ];
  return (
    <section aria-labelledby="vk-heading" className="rounded-lg border border-line bg-surface p-6 md:p-8">
      <p className="eyebrow">How these figures are verified</p>
      <h2 id="vk-heading" className="mt-2 text-xl">
        Privacy with accountability
      </h2>
      <p className="mt-3 max-w-prose text-ink-muted">
        These figures are verified with the reward fund&apos;s viewing key. Sponsors can audit every payout; the public cannot
        see any individual transaction. A viewing key cannot spend funds.
      </p>
      <ul className="mt-8 grid gap-8 md:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-zec-soft text-zec-ink">
              <Icon aria-hidden className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base">{title}</h3>
            <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
