import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/site-header";
import { NetworkProvider } from "@/components/network-context";
import { getNetwork } from "@/lib/active-network";
import "./globals.css";

// Self-hosted variable fonts (from @fontsource-variable) so builds never depend on Google Fonts.
// Each family has a latin file plus a latin-ext fallback that covers the naira sign.

const display = localFont({
  src: "../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-display",
  display: "swap",
});
const displayExt = localFont({
  src: "../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-ext-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-display-ext",
  display: "swap",
  preload: false,
});
const sans = localFont({
  src: "../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});
const sansExt = localFont({
  src: "../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-ext-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sans-ext",
  display: "swap",
  preload: false,
});
const mono = localFont({
  src: "../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-mono",
  display: "swap",
});
const monoExt = localFont({
  src: "../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-mono-ext",
  display: "swap",
  preload: false,
});

const fontVars = [display, displayExt, sans, sansExt, mono, monoExt].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "ShieldCampus — your first private payment", template: "%s · ShieldCampus" },
  description:
    "Learn how financial privacy works, earn your first shielded Zcash, and spend it with vendors on campus.",
};

export const viewport: Viewport = {
  themeColor: "#0F3D2E",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const network = await getNetwork();
  return (
    // suppressHydrationWarning: browser extensions (e.g. Grammarly) inject attributes on
    // <html>/<body> before React hydrates. This only ignores attribute diffs on these two tags.
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <NetworkProvider network={network}>
          <SiteHeader />
          <main id="main">{children}</main>
        </NetworkProvider>
      </body>
    </html>
  );
}
