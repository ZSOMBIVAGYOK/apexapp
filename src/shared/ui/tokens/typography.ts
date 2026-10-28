/**
 * Apex Design System - Typography Tokens
 * Apple-like fluid clamp() scales, tabular numbers, and balance/pretty wrapping.
 */

export const fontFamilies = {
  sans: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"SF Pro Display"',
    '"SF Pro Text"',
    "Inter",
    "system-ui",
    "sans-serif",
  ],
  mono: [
    '"SF Mono"',
    "Menlo",
    "Monaco",
    "Consolas",
    "monospace",
  ],
};

export const typography = {
  // Fluid font size scale with clamp()
  caption: "clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)",       // 12-13px
  footnote: "clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)",     // 13-14px
  body: "clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)",               // 15-16px
  headline: "clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)",          // 16-17px semibold
  title3: "clamp(1.1875rem, 1.14rem + 0.25vw, 1.3125rem)",      // 19-21px
  title2: "clamp(1.375rem, 1.3rem + 0.4vw, 1.625rem)",          // 22-26px
  title1: "clamp(1.75rem, 1.6rem + 0.75vw, 2.125rem)",          // 28-34px
  largeTitle: "clamp(2rem, 1.8rem + 1vw, 2.5rem)",              // 32-40px
  heroMetric: "clamp(3.5rem, 3rem + 2.5vw, 4.5rem)",            // 56-72px, weight 600

  // Line heights
  lineHeights: {
    hero: 1.08,
    title: 1.15,
    heading: 1.25,
    body: 1.45,
    loose: 1.6,
  },

  // Font weights
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },

  // Letter spacing
  letterSpacing: {
    tight: "-0.025em",
    hero: "-0.035em",
    normal: "0em",
    wide: "0.05em",
    widest: "0.1em",
  }
} as const;
