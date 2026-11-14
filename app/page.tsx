import { Suspense } from "react";
import { CampusPhoto } from "@/components/campus-photo";
import { ArrowRight, Eye, KeyRound, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { PaymentPreview } from "@/components/landing/payment-preview";
import { ImpactStrip, ImpactStripSkeleton } from "@/components/landing/impact-strip";
import { VendorStrip, VendorStripSkeleton } from "@/components/landing/vendor-strip";
import { SiteFooter } from "@/components/site-footer";
import { env } from "@/lib/env";
import { formatZec } from "@/lib/format";
import { getZecRates } from "@/lib/rates";
import { CAMPUS_PHOTOS } from "@/lib/site";

export default async function HomePage() {
  const reward = formatZec(env().REWARD_ZEC);
  const rates = await getZecRates();

  const steps = [
    {
      n: "01",
      title: "Learn",
      body: "Five short lessons on money privacy, Zcash and wallet safety. Read in English or Pidgin, and ask the AI tutor anything.",
      meta: "5 lessons · about 30 minutes",
    },
    {
      n: "02",
      title: "Earn",
      body: "Set up a shielded wallet, pass the quizzes, and claim a small ZEC reward. For most students, it is their first private transaction.",
      meta: `${reward} ZEC per eligible lesson`,
    },
    {
      n: "03",
      title: "Spend",
      body: "Pay for food, printing, data or a haircut at campus vendors who accept ZEC. Prices are shown in naira.",
      meta: "Scan, check, pay",
    },
  ];

  const reasons = [
    {
      icon: Eye,
      title: "Your payments tell your story",
      body: "Every transfer shows where you eat, who your friends are, and roughly how much you have. On a transparent blockchain, anyone can read that forever.",
    },
    {
      icon: ShieldCheck,
      title: "Visible money attracts trouble",
      body: "Scammers, pressure from people who can see what you receive, and companies profiling your spending all start with visible payments.",
    },
    {
      icon: KeyRound,
      title: "Private, but still accountable",
      body: "Viewing keys let you prove payments to someone you choose, like a sponsor or auditor, without exposing them to everyone.",
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="page grid items-center gap-12 pb-16 pt-12 md:pt-20 lg:grid-cols-12 lg:pb-24">
        <div className="lg:col-span-7">
          <p className="eyebrow">For Nigerian university students</p>
          <h1 className="mt-4 max-w-[14ch] text-2xl font-bold md:text-3xl">Your first private payment starts here.</h1>
          <p className="mt-6 max-w-[52ch] text-lg text-ink-muted">
            Learn why your money deserves privacy, set up a Zcash wallet with a tutor who speaks your language, and earn
            a little ZEC you can spend at vendors on campus.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg">
              Start learning
              <ArrowRight aria-hidden className="h-5 w-5" />
            </ButtonLink>
            <ButtonLink href="/signup?as=vendor" size="lg" variant="secondary">
              Accept ZEC at your shop
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-ink-muted">Free to join. English or Pidgin. No bank account needed.</p>
        </div>

        <div className="lg:col-span-5">
          {CAMPUS_PHOTOS.hero ? (
            <div>
              <CampusPhoto
                photo={CAMPUS_PHOTOS.hero}
                aspect="aspect-[4/3]"
                sizes="(min-width: 1024px) 480px, 100vw"
                priority
              />
              <div className="mt-6">
                <PaymentPreview ngnPerZec={rates.ngn} />
              </div>
            </div>
          ) : (
            <PaymentPreview ngnPerZec={rates.ngn} />
          )}
        </div>
      </section>

      {/* Learn -> Earn -> Spend */}
      <section aria-labelledby="how-heading" className="border-y border-line bg-surface">
        <div className="page py-16 md:py-20">
          <SectionHeading id="how-heading" eyebrow="How it works" title="Learn, earn, spend" />
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
            {steps.map((s, i) => (
              <li key={s.n} className="flex flex-col md:px-8 md:first:pl-0 md:last:pr-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-ink-muted">{s.n}</span>
                  {i < steps.length - 1 ? (
                    <ArrowRight aria-hidden className="h-4 w-4 text-ink-muted md:hidden" />
                  ) : null}
                </div>
                <h3 className="mt-3 text-xl">{s.title}</h3>
                <p className="mt-3 max-w-prose text-ink-muted">{s.body}</p>
                <p className="mt-auto pt-5 font-mono text-sm text-ink">{s.meta}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Live impact */}
      <section aria-labelledby="impact-heading" className="page py-16 md:py-20">
        <SectionHeading
          id="impact-heading"
          eyebrow="Live from our database"
          title="Real students. Real shielded payments."
          body="These numbers update every minute. Totals only: no individual student or payment is ever shown publicly."
        />
        <div className="mt-8">
          <Suspense fallback={<ImpactStripSkeleton />}>
            <ImpactStrip />
          </Suspense>
        </div>
      </section>

      {/* Vendors */}
      <section id="vendors" aria-labelledby="vendors-heading" className="page scroll-mt-4 border-t border-line py-16 md:py-20">
        <SectionHeading id="vendors-heading" eyebrow="Spend it on campus" title="Vendors who accept ZEC" />
        <div className="mt-8">
          <Suspense fallback={<VendorStripSkeleton />}>
            <VendorStrip />
          </Suspense>
        </div>
      </section>

      {/* Why privacy matters */}
      <section aria-labelledby="why-heading" className="page border-t border-line py-16 md:py-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">Why privacy matters</p>
            <h2 id="why-heading" className="mt-2 text-xl">
              Closing the door is not the same as hiding something.
            </h2>
            <p className="mt-4 max-w-prose text-ink-muted">
              You don&apos;t post your bank statement on your WhatsApp status. Your payments deserve the same respect,
              and you should decide who sees them.
            </p>
            {CAMPUS_PHOTOS.privacy ? (
              <CampusPhoto
                photo={CAMPUS_PHOTOS.privacy}
                aspect="aspect-[16/9]"
                sizes="(min-width: 1024px) 440px, 100vw"
                className="mt-8"
              />
            ) : null}
          </div>
          <ul className="space-y-8 lg:col-span-6 lg:col-start-7">
            {reasons.map(({ icon: Icon, title, body }) => (
              <li key={title} className="grid grid-cols-[40px_1fr] gap-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg">{title}</h3>
                  <p className="mt-2 max-w-prose text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="page">
        <div className="flex flex-col gap-6 rounded-lg bg-brand px-6 py-10 text-white md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <h2 className="text-xl text-white">Lesson one takes four minutes.</h2>
            <p className="mt-2 max-w-prose text-white/80">
              Start with why your money needs privacy. Your first shielded ZEC comes with lesson three, when you set up your wallet.
            </p>
          </div>
          <ButtonLink href="/signup" size="lg" variant="secondary" className="shrink-0 border-transparent">
            Start learning
          </ButtonLink>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
