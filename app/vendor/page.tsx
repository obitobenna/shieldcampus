import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Store } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Steps, type Step } from "@/components/ui/steps";
import { ShopForm } from "@/components/vendor/shop-form";
import { requirePageSession } from "@/lib/auth";
import type { VendorStatus } from "@/lib/database.types";
import { env } from "@/lib/env";
import { getUserProgress, listLessons } from "@/lib/lessons";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-categories";
import { getShopForOwner } from "@/lib/vendors";

export const metadata: Metadata = { title: "Your shop" };

const STATUS: Record<VendorStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Awaiting approval", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  suspended: { label: "Suspended", tone: "danger" },
};

// Lessons a vendor should finish before taking payments.
const VENDOR_LESSONS = ["wallet-setup", "send-receive-privately", "viewing-keys"];

export default async function VendorHomePage() {
  const session = await requirePageSession(["vendor"], "/vendor");
  const [shop, lessons, progress] = await Promise.all([
    getShopForOwner(session.userId),
    listLessons(),
    getUserProgress(session.userId),
  ]);
  const network = env().ZCASH_NETWORK;
  const recommended = lessons.filter((l) => VENDOR_LESSONS.includes(l.slug));
  const recommendedDone = recommended.filter((l) => progress.get(l.id)?.status === "completed").length;

  const steps: Step[] = [
    { title: "Create your account", detail: `Signed in as ${session.email}`, state: "done" },
    {
      title: "Learn to receive ZEC safely",
      detail: `${recommendedDone} of ${recommended.length} recommended lessons done. Recommended, not required.`,
      state: recommendedDone === recommended.length ? "done" : "current",
      href: recommended.find((l) => progress.get(l.id)?.status !== "completed")
        ? `/learn/${recommended.find((l) => progress.get(l.id)?.status !== "completed")!.slug}`
        : undefined,
      action: recommendedDone === recommended.length ? undefined : "Continue learning",
    },
    {
      title: "Add your shop details",
      detail: shop ? `${shop.business_name} · ${VENDOR_CATEGORY_LABEL[shop.category]}` : "Name, location and your shop's shielded address.",
      state: shop ? "done" : "current",
      href: shop ? undefined : "#shop",
      action: shop ? undefined : "Add details",
    },
    {
      title: "Get approved",
      detail: !shop
        ? "The ShieldCampus team checks every shop before it appears to students."
        : shop.status === "approved"
          ? "Your shop is listed for students."
          : shop.status === "suspended"
            ? "Your shop is paused. Contact the ShieldCampus team."
            : "Usually within a few hours during the conference.",
      state: !shop ? "upcoming" : shop.status === "approved" ? "done" : "blocked",
    },
    {
      title: "Take your first payment",
      detail:
        shop?.status === "approved"
          ? "Type an amount in naira, show the QR code, and confirm when it lands in your wallet."
          : "Your till opens once your shop is approved.",
      state: shop?.status === "approved" ? "current" : "upcoming",
    },
  ];

  return (
    <div className="page py-10 md:py-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your shop</p>
          <h1 className="mt-2 text-xl md:text-2xl">{shop ? shop.business_name : "Set up your shop"}</h1>
          {shop ? (
            <p className="mt-2 text-ink-muted">
              {VENDOR_CATEGORY_LABEL[shop.category]} · {shop.location}
            </p>
          ) : (
            <p className="mt-2 max-w-prose text-ink-muted">
              Accept private ZEC payments from students with a QR till on your phone. Prices stay in naira.
            </p>
          )}
        </div>
        {shop ? (
          <Badge tone={STATUS[shop.status].tone} dot className="self-start sm:self-auto">
            {STATUS[shop.status].label}
          </Badge>
        ) : null}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-7">
          <section aria-labelledby="setup-heading" className="rounded-lg border border-line bg-surface p-5 sm:p-6">
            <h2 id="setup-heading" className="text-lg">
              Getting ready to sell
            </h2>
            <Steps steps={steps} className="mt-5" />
          </section>

          <section id="shop" aria-labelledby="shop-heading" className="scroll-mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-zec-soft text-zec-ink">
                <Store aria-hidden className="h-5 w-5" />
              </span>
              <h2 id="shop-heading" className="text-lg">
                Shop details
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-muted">Students see your name, category and location in the vendor directory.</p>
            <div className="mt-6">
              <ShopForm
                network={network}
                status={shop?.status ?? null}
                initial={
                  shop
                    ? {
                        businessName: shop.business_name,
                        category: shop.category,
                        location: shop.location,
                        description: shop.description ?? "",
                        zcashAddress: shop.zcash_address,
                      }
                    : null
                }
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:col-span-5">
          <div className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <p className="font-semibold">Before you take payments</p>
              <p className="mt-1 text-sm text-ink-muted">Three short lessons, about 20 minutes in total.</p>
            </div>
            <ol className="divide-y divide-line">
              {recommended.map((l) => {
                const done = progress.get(l.id)?.status === "completed";
                return (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${l.slug}`}
                      className="flex items-start gap-3 px-5 py-4 transition-colors duration-150 ease-out hover:bg-paper"
                    >
                      <span className="w-5 shrink-0 pt-0.5 font-mono text-xs text-ink-muted">
                        {done ? <CheckCircle2 aria-label="Completed" className="h-4 w-4 text-success" /> : l.position}
                      </span>
                      <span className="text-sm">
                        <span className="font-medium">{l.title}</span>
                        <span className="block text-ink-muted">{l.estimated_minutes} min</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="font-semibold">How getting paid works</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-muted marker:font-mono">
              <li>Type the price in naira. ShieldCampus converts it to ZEC at the live rate.</li>
              <li>The student scans your QR code and pays from their wallet.</li>
              <li>When the payment shows in your wallet, tap Paid.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-danger/30 bg-danger-soft p-5">
            <p className="text-sm font-semibold">Protect your shop wallet</p>
            <p className="mt-2 text-sm text-ink/80">
              Never share your recovery phrase, not even with ShieldCampus staff. Anyone who has it can empty your wallet.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
