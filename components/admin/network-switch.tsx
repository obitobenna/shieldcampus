"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/components/network-context";
import { fetchJson } from "@/lib/fetch-json";
import type { ZcashNetwork } from "@/lib/network";
import type { SetNetworkResponse } from "@/app/api/admin/network/route";

const WARNING: Record<ZcashNetwork, string> = {
  mainnet:
    "Switch ShieldCampus to MAINNET? Rewards and vendor payments become real ZEC with real value. Every student and vendor must save a mainnet (u1…) address before they can claim or take payments. Make sure the reward fund wallet is funded.",
  testnet:
    "Switch ShieldCampus to TESTNET? Rewards and vendor payments become practice TAZ coins with no real value. Students and vendors must save a testnet (utest1…) address. /impact keeps mainnet and testnet numbers separate.",
};

// Admin control for the active Zcash network. Changes apply to everyone on their next page load.
export function NetworkSwitch() {
  const router = useRouter();
  const { network, label } = useNetwork();
  const [saving, setSaving] = useState<ZcashNetwork | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(target: ZcashNetwork) {
    if (target === network || !window.confirm(WARNING[target])) return;
    setSaving(target);
    setError(null);
    const res = await fetchJson<SetNetworkResponse>("/api/admin/network", { method: "POST", json: { network: target } });
    setSaving(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <section aria-labelledby="network-switch" className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="network-switch" className="text-base font-semibold">
            Zcash network
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            The whole site runs on one network. Switching takes effect immediately, with no redeploy.
          </p>
        </div>
        <Badge tone={network === "testnet" ? "warning" : "success"} dot>
          Live: {label}
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="group" aria-label="Choose network">
        {(["testnet", "mainnet"] as const).map((n) => (
          <Button
            key={n}
            variant={network === n ? "primary" : "secondary"}
            onClick={() => switchTo(n)}
            loading={saving === n}
            disabled={saving !== null}
            aria-pressed={network === n}
          >
            {n === "testnet" ? "Testnet · practice TAZ" : "Mainnet · real ZEC"}
          </Button>
        ))}
      </div>
      {error ? (
        <Alert tone="danger" title="Couldn't switch network" className="mt-4">
          {error}
        </Alert>
      ) : null}
    </section>
  );
}
