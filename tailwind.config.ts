import type { Config } from "tailwindcss";

// ShieldCampus design tokens. Colours are CSS variables defined in app/globals.css.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1200px" },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      paper: "rgb(var(--paper) / <alpha-value>)",
      surface: "rgb(var(--surface) / <alpha-value>)",
      ink: { DEFAULT: "rgb(var(--ink) / <alpha-value>)", muted: "rgb(var(--ink-muted) / <alpha-value>)" },
      line: "rgb(var(--line) / <alpha-value>)",
      brand: { DEFAULT: "rgb(var(--brand) / <alpha-value>)", hover: "rgb(var(--brand-hover) / <alpha-value>)", soft: "rgb(var(--brand-soft) / <alpha-value>)" },
      zec: { DEFAULT: "rgb(var(--zec) / <alpha-value>)", soft: "rgb(var(--zec-soft) / <alpha-value>)", ink: "rgb(var(--zec-ink) / <alpha-value>)" },
      success: { DEFAULT: "rgb(var(--success) / <alpha-value>)", soft: "rgb(var(--success-soft) / <alpha-value>)" },
      warning: {
        DEFAULT: "rgb(var(--warning) / <alpha-value>)",
        soft: "rgb(var(--warning-soft) / <alpha-value>)",
        ink: "rgb(var(--warning-ink) / <alpha-value>)",
      },
      danger: { DEFAULT: "rgb(var(--danger) / <alpha-value>)", soft: "rgb(var(--danger-soft) / <alpha-value>)" },
    },
    fontFamily: {
      display: ["var(--font-display)", "var(--font-display-ext)", "system-ui", "sans-serif"],
      sans: ["var(--font-sans)", "var(--font-sans-ext)", "system-ui", "sans-serif"],
      mono: ["var(--font-mono)", "var(--font-mono-ext)", "ui-monospace", "monospace"],
    },
    // Type scale: 12 / 14 / 16 / 20 / 28 / 40 / 56
    fontSize: {
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "1.6" }],
      lg: ["20px", { lineHeight: "28px" }],
      xl: ["28px", { lineHeight: "34px", letterSpacing: "-0.02em" }],
      "2xl": ["40px", { lineHeight: "44px", letterSpacing: "-0.02em" }],
      "3xl": ["56px", { lineHeight: "58px", letterSpacing: "-0.02em" }],
    },
    // Nothing above 10px except full circles (avatars, status dots).
    borderRadius: {
      none: "0",
      sm: "4px",
      DEFAULT: "6px",
      md: "8px",
      lg: "10px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      sm: "0 1px 2px rgba(17, 20, 24, 0.06)",
    },
    extend: {
      maxWidth: { page: "1200px", prose: "65ch" },
      transitionTimingFunction: { out: "cubic-bezier(0.16, 1, 0.3, 1)" },
      transitionDuration: { DEFAULT: "150ms" },
      keyframes: {
        shimmer: { "0%": { opacity: "1" }, "50%": { opacity: "0.55" }, "100%": { opacity: "1" } },
        "sheet-in": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
      },
      animation: {
        shimmer: "shimmer 1.4s ease-in-out infinite",
        "sheet-in": "sheet-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
