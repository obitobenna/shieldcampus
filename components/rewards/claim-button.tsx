"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/fetch-json";
import type { ClaimResponse } from "@/app/api/rewards/claim/route";

export function ClaimButton({ lessonSlug, label = "Claim reward" }: { lessonSlug: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setLoading(true);
    setError(null);
    const res = await fetchJson<ClaimResponse>("/api/rewards/claim", { method: "POST", json: { lessonSlug } });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Button variant="zec" onClick={claim} loading={loading}>
        {label}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
