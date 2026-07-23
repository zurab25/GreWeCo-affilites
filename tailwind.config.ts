import type { Config } from "tailwindcss";

/**
 * GreWeCo Arena Affiliate — Tailwind entry.
 * Canonical colors, radii, and glow tokens live in `app/globals.css` (`@theme inline`)
 * so they stay aligned with Tailwind v4 CSS-first config.
 */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          noir: "#050508",
          ink: "#06060c",
          panel: "#080910",
          cyan: "#22d3ee",
          violet: "#a855f7",
        },
      },
      boxShadow: {
        "glow-cyan": "0 0 28px rgba(34, 211, 238, 0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glow-violet":
          "0 0 32px rgba(168, 85, 247, 0.18), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      backdropBlur: {
        arena: "20px",
      },
    },
  },
  plugins: [],
} satisfies Config;
