import { AlertTriangle } from "lucide-react";
import { NetworkBadge } from "@/components/zcash/network-badge";

// Shown at the top of Lesson 3 ("Set up your Zcash wallet") while ShieldCampus runs on testnet.
// The lesson body (stored in the database) describes mainnet wallets; this box overrides it for the demo.
export function TestnetWalletGuide() {
  return (
    <section aria-labelledby="testnet-guide" className="mb-8 rounded-lg border border-warning/30 bg-warning-soft p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <NetworkBadge />
        <h2 id="testnet-guide" className="text-base font-semibold">
          For this demo, use a testnet wallet
        </h2>
      </div>
      <p className="mt-2 text-ink-muted">
        ShieldCampus is running on the Zcash <strong className="text-ink">testnet</strong>. Rewards are paid in{" "}
        <strong className="text-ink">TAZ</strong>, practice coins with <strong className="text-ink">no real value</strong>. Follow
        these steps instead of the Zodl steps below.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5">
        <li>
          Install <strong>Zingo</strong> or <strong>Zkool</strong> (both have mobile and desktop apps). Check the publisher and
          avoid look-alike apps.
        </li>
        <li>
          Before creating a wallet, switch the app to <strong>testnet</strong> (look for a network or server setting, usually on the
          first screen or in Settings).
        </li>
        <li>Create a new wallet and write the recovery phrase on paper, exactly as the lesson explains.</li>
        <li>
          Tap <strong>Receive</strong> and copy your shielded address. On testnet it starts with{" "}
          <code className="font-mono">utest1</code>. An address starting with <code className="font-mono">u1</code> means the wallet is
          still on mainnet; one starting with <code className="font-mono">tm</code> is transparent and won&apos;t be accepted.
        </li>
      </ol>
      <p className="mt-4 flex items-start gap-2 font-medium">
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" />
        Never share your seed phrase, not even a testnet one. Treat every recovery phrase as if it guarded real money.
      </p>
    </section>
  );
}

/** Testnet wording for Lesson 3's checkpoint labels. Ids stay the same, so saved progress is unaffected. */
export const TESTNET_CHECKPOINT_LABELS: Record<string, string> = {
  installed: "I installed Zingo or Zkool and switched it to testnet",
  address: "I found my shielded receive address (starts with utest1)",
};
