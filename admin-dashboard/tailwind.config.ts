import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        navy: {
          DEFAULT: "#0D1B2A",
          mid:     "#1A2F45",
          light:   "#243B55",
        },
        gold: {
          DEFAULT: "#F5A623",
          light:   "#FDB94A",
          dark:    "#E8880A",
        },
        brand: {
          teal:    "#00B4D8",
          emerald: "#10B981",
          rose:    "#F43F5E",
          violet:  "#8B5CF6",
          amber:   "#F59E0B",
        },
      },
      boxShadow: {
        card:  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.08)",
        modal: "0 24px 80px rgba(0,0,0,0.18)",
      },
      animation: {
        "spin-slow": "spin 1.2s linear infinite",
        "fade-in":   "fadeIn 0.3s ease",
        "slide-in":  "slideIn 0.25s ease",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideIn: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
