// Number formatting shared by server and client. Fixed locale so SSR and the browser agree.
const LOCALE = "en-NG";

export function formatCount(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(n);
}

export function formatNaira(n: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? !Number.isInteger(n);
  return `₦${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(n)}`;
}

// Up to 8 decimals, trailing zeros trimmed.
export function formatZec(n: number, maxDecimals = 8): string {
  const fixed = n.toFixed(maxDecimals).replace(/\.?0+$/, "");
  const [whole, frac] = fixed.split(".");
  const grouped = new Intl.NumberFormat(LOCALE).format(Number(whole));
  return frac ? `${grouped}.${frac}` : grouped;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(
    new Date(iso),
  );
}
