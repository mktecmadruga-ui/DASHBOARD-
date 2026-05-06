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
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "#F5F7FB",
        primary: { DEFAULT: "#7B61FF", light: "#9B8CFF" },
        success: "#22C55E",
        danger: "#FF5A5F",
        warning: "#FFB800",
        info: "#3B82F6",
        card: "#FFFFFF",
        text: {
          dark: "#0F172A",
          medium: "#475569",
          light: "#94A3B8",
        },
      },
      borderRadius: {
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.04)",
        "glass-hover": "0 16px 48px rgba(123,97,255,0.10)",
        card: "0 4px 24px rgba(0,0,0,0.04)",
        "card-hover": "0 12px 40px rgba(123,97,255,0.14)",
      },
    },
  },
  plugins: [],
};
export default config;
