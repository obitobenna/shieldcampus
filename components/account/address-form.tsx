"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AddressField } from "@/components/zcash/address-field";
import { fetchJson } from "@/lib/fetch-json";
import { checkShieldedAddress, type ZcashNetwork } from "@/lib/zcash";

export function AddressForm({ current, network }: { current: string | null; network: ZcashNetwork }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!current);
  const [value, setValue] = useState("");
  const [serverError, setServerError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const valid = checkShieldedAddress(value, network).ok;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setServerError(undefined);
    setFormError(null);
    const res = await fetchJson("/api/account/address", { method: "PUT", json: { zcashAddress: value } });
    setSaving(false);
    if (!res.ok) {
      if (res.fields?.zcashAddress) setServerError(res.fields.zcashAddress);
      else setFormError(res.error);
      return;
    }
    setJustSaved(true);
    setEditing(false);
    setValue("");
    router.refresh();
  }

  if (!editing && current) {
    return (
      <div className="space-y-4">
        {justSaved ? <Alert tone="success" title="Address saved">Your rewards will be sent here.</Alert> : null}
        <div className="rounded-md border border-line bg-paper p-4">
          <p className="break-all font-mono text-sm leading-6">{current}</p>
        </div>
        <Button variant="secondary" onClick={() => { setEditing(true); setJustSaved(false); }}>
          Change address
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AddressField
        id="zcashAddress"
        label={current ? "New shielded address" : "Your shielded address"}
        value={value}
        onChange={(v) => {
          setValue(v);
          setServerError(undefined);
        }}
        network={network}
        serverError={serverError}
        hint="Open your wallet, tap Receive, then tap the copy button and paste here."
      />
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={saving} disabled={!valid}>
          Save address
        </Button>
        {current ? (
          <Button variant="ghost" onClick={() => { setEditing(false); setValue(""); setServerError(undefined); }}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
