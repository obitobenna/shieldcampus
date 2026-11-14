"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { fetchJson } from "@/lib/fetch-json";

export function AuditGate() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetchJson("/api/impact/audit", { method: "POST", json: { pin } });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setPin("");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm rounded-lg border border-line bg-surface p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
        <Lock aria-hidden className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-lg">Sponsor audit view</h2>
      <p className="mt-1 text-sm text-ink-muted">Enter the audit PIN shared with sponsors. Access lasts 12 hours on this device.</p>
      <div className="mt-5">
        <Field id="pin" label="Audit PIN">
          <Input
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="font-mono tracking-[0.3em]"
            maxLength={32}
          />
        </Field>
      </div>
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
      <Button type="submit" className="mt-5 w-full" loading={loading} disabled={pin.trim().length < 4}>
        Unlock
      </Button>
    </form>
  );
}

export function AuditLock() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await fetchJson("/api/impact/audit", { method: "DELETE" });
        router.refresh();
      }}
    >
      Lock
    </Button>
  );
}
