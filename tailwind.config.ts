import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        steel: {
          50: "#f4f6f8",
          100: "#e4e9ee",
          200: "#c8d3dc",
          300: "#a1b4c2",
          400: "#748fa3",
          500: "#537186",
          600: "#425a6d",
          700: "#37495a",
          800: "#2f3d4b",
          900: "#1c2530",
          950: "#11161d"
        },
        signal: {
          green: "#1f7a4d",
          blue: "#1d5fa8",
          orange: "#b4661c",
          red: "#b3261e",
          grey: "#6b7280"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      }
    }
  },
  plugins: []
};
export default config;
