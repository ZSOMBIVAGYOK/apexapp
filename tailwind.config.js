/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core Cockpit Canvas
        bg: {
          primary: "var(--bg-primary)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
        },
        // Borders
        border: {
          hairline: "var(--border-hairline)",
          subtle: "var(--border-subtle)",
        },
        // Typography
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        // Brand Accent
        brand: {
          DEFAULT: "var(--accent-brand)",
          hover: "var(--accent-brand-hover)",
          subtle: "var(--accent-brand-subtle)",
        },
        // Semantic Status Colors (Used ONLY for readiness, alerts, load status)
        status: {
          ready: "var(--status-ready)",
          "ready-subtle": "var(--status-ready-subtle)",
          caution: "var(--status-caution)",
          "caution-subtle": "var(--status-caution-subtle)",
          rest: "var(--status-rest)",
          "rest-subtle": "var(--status-rest-subtle)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        // Strict 12/14/16/20/28/40/64 Scale
        "12": ["12px", { lineHeight: "16px", letterSpacing: "0" }],
        "14": ["14px", { lineHeight: "20px", letterSpacing: "-0.006em" }],
        "16": ["16px", { lineHeight: "24px", letterSpacing: "-0.011em" }],
        "20": ["20px", { lineHeight: "28px", letterSpacing: "-0.017em" }],
        "28": ["28px", { lineHeight: "36px", letterSpacing: "-0.022em" }],
        "40": ["40px", { lineHeight: "48px", letterSpacing: "-0.028em" }],
        "64": ["64px", { lineHeight: "72px", letterSpacing: "-0.035em" }],
      },
      borderRadius: {
        "12": "12px",
        "20": "20px",
        "28": "28px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        elevated: "var(--shadow-elevated)",
        sheet: "var(--shadow-sheet)",
      },
      transitionTimingFunction: {
        "apex-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "200": "200ms",
      },
    },
  },
  plugins: [],
};
