/**
 * Apex Design System - Glass Material Tokens
 * Liquid glass specifications for thin, regular, and thick functional surfaces.
 */

export type GlassLevel = "thin" | "regular" | "thick";

export interface GlassSpec {
  background: {
    dark: string;
    light: string;
    solidDark: string;
    solidLight: string;
  };
  blurPx: number;
  saturatePct: number;
  border: {
    dark: string;
    light: string;
  };
  innerHighlight: string;
  innerShade: string;
  shadow: {
    dark: string;
    light: string;
  };
}

export const glassSpecs: Record<GlassLevel, GlassSpec> = {
  // Level 1: Thin (Bars, floating pills, segmented controls)
  thin: {
    background: {
      dark: "rgba(28, 31, 38, 0.55)",
      light: "rgba(255, 255, 255, 0.55)",
      solidDark: "#171A21",
      solidLight: "#F8FAFC",
    },
    blurPx: 20,
    saturatePct: 180,
    border: {
      dark: "rgba(255, 255, 255, 0.14)",
      light: "rgba(0, 0, 0, 0.08)",
    },
    innerHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.22)",
    innerShade: "inset 0 -1px 0 rgba(0, 0, 0, 0.10)",
    shadow: {
      dark: "0 8px 24px -4px rgba(0, 0, 0, 0.35)",
      light: "0 8px 20px -4px rgba(20, 30, 60, 0.10)",
    },
  },

  // Level 2: Regular (Sheets, popovers, floating buttons, toasts)
  regular: {
    background: {
      dark: "rgba(34, 38, 46, 0.62)",
      light: "rgba(255, 255, 255, 0.66)",
      solidDark: "#1C1F26",
      solidLight: "#FFFFFF",
    },
    blurPx: 28,
    saturatePct: 180,
    border: {
      dark: "rgba(255, 255, 255, 0.16)",
      light: "rgba(0, 0, 0, 0.08)",
    },
    innerHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.25)",
    innerShade: "inset 0 -1px 0 rgba(0, 0, 0, 0.14)",
    shadow: {
      dark: "0 12px 32px -4px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.25)",
      light: "0 12px 28px -4px rgba(20, 30, 60, 0.12), 0 4px 8px rgba(20, 30, 60, 0.06)",
    },
  },

  // Level 3: Thick (Modals, menus needing maximum legibility)
  thick: {
    background: {
      dark: "rgba(40, 44, 54, 0.78)",
      light: "rgba(255, 255, 255, 0.80)",
      solidDark: "#22262F",
      solidLight: "#FFFFFF",
    },
    blurPx: 40,
    saturatePct: 190,
    border: {
      dark: "rgba(255, 255, 255, 0.20)",
      light: "rgba(0, 0, 0, 0.10)",
    },
    innerHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.30)",
    innerShade: "inset 0 -1px 0 rgba(0, 0, 0, 0.18)",
    shadow: {
      dark: "0 20px 48px -8px rgba(0, 0, 0, 0.65), 0 8px 16px rgba(0, 0, 0, 0.35)",
      light: "0 20px 40px -8px rgba(20, 30, 60, 0.16), 0 6px 12px rgba(20, 30, 60, 0.08)",
    },
  },
};
