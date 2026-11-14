import { Logo } from "@/components/logo";
import { EVENT_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="page grid gap-8 py-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-muted">
            Every Nigerian student&apos;s first private payment. Built on Zcash shielded payments.
          </p>
        </div>
        <div className="space-y-2 text-sm text-ink-muted md:col-span-6 md:col-start-7">
          <p>
            ShieldCampus never asks for your recovery phrase or private keys. If anyone claiming to be us does, it is a
            scam.
          </p>
          <p>Nothing on this site is investment advice.</p>
          <p className="pt-2 text-xs">Built at {EVENT_NAME}, University of Nigeria, Nsukka.</p>
        </div>
      </div>
    </footer>
  );
}
