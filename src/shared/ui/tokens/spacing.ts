/**
 * Apex Design System - Spacing & Breakpoint Tokens
 * Strict 4pt grid system: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
 */

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const breakpoints = {
  xs: 320,      // Smallest supported phones
  sm: 360,      // Modern phones
  md: 640,      // Large phones & small tablets
  lg: 1024,     // Laptops & desktops (Sidebar navigation enters here)
  xl: 1440,     // Wide desktop displays
} as const;

export const containerWidths = {
  contentMax: "1120px",
  contentMaxWide: "1280px",
  cardMin: "280px",
  chartMin: "320px",
} as const;
