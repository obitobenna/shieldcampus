"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { ImpactDay } from "@/lib/impact";

// Chart palette, validated (dataviz validate_palette.js, light mode): green #13875A and
// amber #B98008 pass lightness, chroma, contrast and normal-vision checks; colour-blind
// separation is in the 6–8 floor band, so every chart also carries a legend, 2px gaps
// and a table view (secondary encoding).
const GREEN = "#13875A";
const AMBER = "#B98008";
const GRID = "#E4E1D8";
const MUTED = "#5E6670";

const axisProps = {
  tick: { fill: MUTED, fontSize: 12, fontFamily: "var(--font-mono)" },
  tickLine: false,
  axisLine: { stroke: GRID },
} as const;

function TooltipCard({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-sm">
      <p className="font-medium">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: String(p.color) }} />
            <span className="text-ink-muted">{p.name}</span>
            <span className="ml-auto pl-4 font-mono">{Number(p.value).toLocaleString("en-NG")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudentsChart({ days }: { days: ImpactDay[] }) {
  const last = days[days.length - 1]?.students ?? 0;
  return (
    <figure>
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="text-sm font-semibold">Students registered</figcaption>
        <span className="font-mono text-sm text-ink-muted">{last.toLocaleString("en-NG")} total</span>
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">Running total, last 14 days</p>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...axisProps} allowDecimals={false} width={48} />
            <Tooltip content={(p) => <TooltipCard {...(p as TooltipContentProps<number, string>)} />} cursor={{ stroke: MUTED, strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="students"
              name="Students"
              stroke={GREEN}
              strokeWidth={2}
              fill={GREEN}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 5, stroke: "#FFFFFF", strokeWidth: 2, fill: GREEN }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function RoundedTopBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  if (height <= 0 || width <= 0) return null;
  const r = Math.min(4, width / 2, height);
  // 4px rounded data-end, square at the baseline.
  return <path d={`M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`} fill={fill} />;
}

export function PaymentsChart({ days }: { days: ImpactDay[] }) {
  const totals = days.reduce((t, d) => ({ rewards: t.rewards + d.rewards, sales: t.sales + d.sales }), { rewards: 0, sales: 0 });
  return (
    <figure>
      <figcaption className="text-sm font-semibold">Shielded payments per day</figcaption>
      <p className="mt-0.5 text-xs text-ink-muted">Last 14 days</p>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: AMBER }} />
          Rewards paid <span className="font-mono text-ink-muted">{totals.rewards}</span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: GREEN }} />
          Vendor payments <span className="font-mono text-ink-muted">{totals.sales}</span>
        </li>
      </ul>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...axisProps} allowDecimals={false} width={48} />
            <Tooltip content={(p) => <TooltipCard {...(p as TooltipContentProps<number, string>)} />} cursor={{ fill: "rgba(17,20,24,0.04)" }} />
            <Bar dataKey="rewards" name="Rewards paid" fill={AMBER} maxBarSize={24} shape={<RoundedTopBar />} isAnimationActive={false} />
            <Bar dataKey="sales" name="Vendor payments" fill={GREEN} maxBarSize={24} shape={<RoundedTopBar />} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
