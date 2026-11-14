import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Verification builds use NEXT_DIST_DIR=.next-verify so they never overwrite a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  // The Zcash network is public config, so expose it to client components (TESTNET badge, TAZ ticker).
  env: {
    NEXT_PUBLIC_ZCASH_NETWORK: process.env.ZCASH_NETWORK?.trim().toLowerCase() === "mainnet" ? "mainnet" : "testnet",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
