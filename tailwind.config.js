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
          "surface-solid": "var(--bg-surface-solid)",
          elevated: "var(--bg-elevated)",
        },
        // Borders
        border: {
          hairline: "var(--border-hairline)",
          subtle: "var(--border-subtle)",
          glass: "var(--glass-border)",
        },
        separator: "var(--separator)",
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
          pressed: "var(--accent-brand-pressed)",
          subtle: "var(--accent-brand-subtle)",
          dark: "#1E56D0",
        },
        // Semantic Status Colors (Used ONLY for readiness, alerts, load status)
        status: {
          ready: "var(--status-ready)",
          "ready-subtle": "var(--status-ready-subtle)",
          caution: "var(--status-caution)",
          "caution-subtle": "var(--status-caution-subtle)",
          rest: "var(--status-rest)",
          "rest-subtle": "var(--status-rest-subtle)",
          info: "var(--accent-brand)",
          "info-subtle": "var(--accent-brand-subtle)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          "Inter",
          "system-ui",
          "-apple-system",
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
        // Preserved numeric scale for backward compatibility
        "10": ["10px", { lineHeight: "14px", letterSpacing: "0.02em" }],
        "11": ["11px", { lineHeight: "15px", letterSpacing: "0.01em" }],
        "12": ["12px", { lineHeight: "16px", letterSpacing: "0" }],
        "13": ["13px", { lineHeight: "18px", letterSpacing: "-0.003em" }],
        "14": ["14px", { lineHeight: "20px", letterSpacing: "-0.006em" }],
        "15": ["15px", { lineHeight: "22px", letterSpacing: "-0.009em" }],
        "16": ["16px", { lineHeight: "24px", letterSpacing: "-0.011em" }],
        "18": ["18px", { lineHeight: "26px", letterSpacing: "-0.014em" }],
        "20": ["20px", { lineHeight: "28px", letterSpacing: "-0.017em" }],
        "22": ["22px", { lineHeight: "30px", letterSpacing: "-0.019em" }],
        "24": ["24px", { lineHeight: "32px", letterSpacing: "-0.020em" }],
        "28": ["28px", { lineHeight: "36px", letterSpacing: "-0.022em" }],
        "32": ["32px", { lineHeight: "40px", letterSpacing: "-0.025em" }],
        "40": ["40px", { lineHeight: "48px", letterSpacing: "-0.028em" }],
        "48": ["48px", { lineHeight: "56px", letterSpacing: "-0.032em" }],
        "56": ["56px", { lineHeight: "64px", letterSpacing: "-0.035em" }],
        "64": ["64px", { lineHeight: "72px", letterSpacing: "-0.035em" }],
        "72": ["72px", { lineHeight: "80px", letterSpacing: "-0.040em" }],

        // Fluid typography scale (rem-based, clamps across mobile and laptop)
        caption: ["clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)", { lineHeight: "1.4" }],
        footnote: ["clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)", { lineHeight: "1.4" }],
        body: ["clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)", { lineHeight: "1.45" }],
        headline: ["clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)", { lineHeight: "1.35", fontWeight: "600" }],
        title3: ["clamp(1.1875rem, 1.14rem + 0.25vw, 1.3125rem)", { lineHeight: "1.25", fontWeight: "600" }],
        title2: ["clamp(1.375rem, 1.3rem + 0.4vw, 1.625rem)", { lineHeight: "1.2", fontWeight: "700" }],
        title1: ["clamp(1.75rem, 1.6rem + 0.75vw, 2.125rem)", { lineHeight: "1.15", fontWeight: "700" }],
        largeTitle: ["clamp(2rem, 1.8rem + 1vw, 2.5rem)", { lineHeight: "1.1", fontWeight: "800" }],
        heroMetric: ["clamp(3.5rem, 3rem + 2.5vw, 4.5rem)", { lineHeight: "1.08", fontWeight: "600", letterSpacing: "-0.035em" }],
      },
      borderRadius: {
        "8": "8px",
        "10": "10px",
        "12": "12px",
        "14": "14px",
        "16": "16px",
        "20": "20px",
        "24": "24px",
        "28": "28px",
        "32": "32px",
        card: "28px",
        sheet: "32px",
        capsule: "9999px",
        control: "14px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        elevated: "var(--shadow-elevated)",
        sheet: "var(--shadow-sheet)",
        glassThin: "var(--glass-thin-shadow)",
        glassRegular: "var(--glass-regular-shadow)",
        glassThick: "var(--glass-thick-shadow)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
        "apex-out": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        "120": "120ms",
        "200": "200ms",
        "280": "280ms",
        "420": "420ms",
      },
    },
  },
  plugins: [],
};
