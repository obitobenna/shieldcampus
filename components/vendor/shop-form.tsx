"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { AddressField } from "@/components/zcash/address-field";
import { fetchJson } from "@/lib/fetch-json";
import type { VendorCategory, VendorStatus } from "@/lib/database.types";
import { VENDOR_CATEGORY_LABEL } from "@/lib/vendor-categories";
import { VENDOR_CATEGORIES } from "@/lib/validation/account";
import { checkShieldedAddress, type ZcashNetwork } from "@/lib/zcash";
import type { ShopResponse } from "@/app/api/vendor/shop/route";
import { useNetwork } from "@/components/network-context";

interface ShopValues {
  businessName: string;
  category: VendorCategory | "";
  location: string;
  description: string;
  zcashAddress: string;
}

export function ShopForm({
  initial,
  status,
  network,
}: {
  initial: ShopValues | null;
  status: VendorStatus | null;
  network: ZcashNetwork;
}) {
  const { isTestnet: IS_TESTNET, unifiedPrefix: UNIFIED_PREFIX } = useNetwork();
  const router = useRouter();
  const [v, setV] = useState<ShopValues>(
    initial ?? { businessName: "", category: "", location: "", description: "", zcashAddress: "" },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<ShopResponse | null>(null);

  const addressChanged = !!initial && v.zcashAddress.trim().toLowerCase() !== initial.zcashAddress;
  const set = <K extends keyof ShopValues>(key: K, value: ShopValues[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const { [key]: _omit, ...rest } = prev;
      return rest;
    });
    setSaved(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const local: Record<string, string> = {};
    if (v.businessName.trim().length < 2) local.businessName = "Enter your business name.";
    if (!v.category) local.category = "Choose what you sell.";
    if (v.location.trim().length < 2) local.location = "Tell students where to find you.";
    const addr = checkShieldedAddress(v.zcashAddress, network);
    if (!addr.ok) local.zcashAddress = addr.message;
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setSaving(true);
    const res = await fetchJson<ShopResponse>("/api/vendor/shop", { method: "PUT", json: v });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.fields ?? {});
      if (!res.fields) setFormError(res.error);
      return;
    }
    setSaved(res.data);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="businessName" label="Business name" error={errors.businessName}>
        <Input
          id="businessName"
          value={v.businessName}
          onChange={(e) => set("businessName", e.target.value)}
          placeholder="Mama Nkechi's Kitchen"
          invalid={!!errors.businessName}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label="What do you sell?" error={errors.category}>
          <Select
            id="category"
            value={v.category}
            onChange={(e) => set("category", e.target.value as VendorCategory)}
            invalid={!!errors.category}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {VENDOR_CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="location" label="Where on campus?" error={errors.location}>
          <Input
            id="location"
            value={v.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Beside Nkrumah Hall"
            invalid={!!errors.location}
          />
        </Field>
      </div>

      <Field
        id="description"
        label="Short description (optional)"
        hint={`${v.description.length}/280. What students should know, e.g. opening hours.`}
        error={errors.description}
      >
        <Input
          id="description"
          value={v.description}
          maxLength={280}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Jollof, fried rice and swallow. Open 8am to 8pm, Monday to Saturday."
          invalid={!!errors.description}
        />
      </Field>

      <AddressField
        id="zcashAddress"
        label="Shop's shielded address (where customers pay you)"
        value={v.zcashAddress}
        onChange={(val) => set("zcashAddress", val)}
        network={network}
        serverError={errors.zcashAddress}
        hint={`Use a wallet you control${IS_TESTNET ? " (Zingo or Zkool, switched to testnet)" : ""}. Open it, tap Receive, copy the ${UNIFIED_PREFIX} address and paste it here.`}
      />

      {addressChanged && status === "approved" ? (
        <Alert tone="warning" title="Changing your address needs re-approval">
          To protect your customers, a new receiving address must be approved again before your till reopens.
        </Alert>
      ) : null}
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      {saved ? (
        <Alert tone="success" title={initial ? "Shop updated" : "Shop submitted for approval"}>
          {saved.needsReapproval
            ? "Your new address is waiting for approval. We'll reopen your till once it's checked."
            : saved.status === "approved"
              ? "Your changes are live."
              : "The ShieldCampus team will review your shop shortly."}
        </Alert>
      ) : null}

      <Button type="submit" loading={saving}>
        {initial ? "Save shop details" : "Submit for approval"}
      </Button>
    </form>
  );
}
