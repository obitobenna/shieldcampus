import { withApi, ApiError } from "@/lib/api";
import { hasAuditAccess } from "@/lib/audit";
import { getAuditRows } from "@/lib/impact";

export const dynamic = "force-dynamic";

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /api/impact/audit/csv — every paid reward and merchant payment, IDs only.
export const GET = withApi(async () => {
  if (!(await hasAuditAccess())) throw new ApiError(401, "Unlock the audit view with the PIN first.");
  const rows = await getAuditRows();
  const header = ["date_utc", "type", "id", "amount_zec", "amount_ngn", "txid", "verification"];
  const lines = rows.map((r) =>
    [
      r.date,
      r.type === "reward" ? "reward_payout" : "merchant_payment",
      `${r.type === "reward" ? "R" : "S"}${r.id}`,
      r.amountZec.toFixed(8),
      r.amountNgn === null ? null : r.amountNgn.toFixed(2),
      r.txid,
      r.verifiedBy ?? "unverified",
    ]
      .map(csvCell)
      .join(","),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response([header.join(","), ...lines].join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shieldcampus-audit-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
