import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light royal-blue brand scale
        royal: {
          50: "#F0F5FF",
          100: "#E1EAFF",
          200: "#C7D6FB",
          300: "#A6C0FA",
          400: "#7B9CF5",
          500: "#4F77EE",
          600: "#2F54EB", // primary
          700: "#1D39C4",
          800: "#10239E",
          900: "#0A1873",
        },
        ink: {
          DEFAULT: "#1B2559",
          muted: "#5A6794",
          soft: "#8A95B8",
        },
        surface: {
          page: "#F4F7FF",
          card: "#FFFFFF",
          line: "#DCE5FB",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(16,35,158,0.06), 0 8px 24px -12px rgba(16,35,158,0.12)",
        card: "0 1px 2px rgba(16,35,158,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
