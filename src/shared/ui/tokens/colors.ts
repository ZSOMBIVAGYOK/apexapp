/**
 * Apex Design System - Color Tokens
 * Single source of truth for dark, light, brand and semantic palettes.
 */

export const colors = {
  dark: {
    base: "#07080B",
    surface: "rgba(255, 255, 255, 0.05)",
    surfaceSolid: "#14161B",
    elevated: "#1C1F26",
    textPrimary: "#F5F6F8",
    textSecondary: "#A3AAB6",
    textTertiary: "#6F7785",
    separator: "rgba(255, 255, 255, 0.08)",
    borderHairline: "rgba(255, 255, 255, 0.08)",
    borderSubtle: "rgba(255, 255, 255, 0.14)",
  },
  light: {
    base: "#F2F4F8",
    surface: "#FFFFFF",
    surfaceSolid: "#FFFFFF",
    elevated: "#FFFFFF",
    textPrimary: "#0B0C0F",
    textSecondary: "#4F5663",
    textTertiary: "#7C8493",
    separator: "rgba(11, 12, 15, 0.08)",
    borderHairline: "rgba(11, 12, 15, 0.08)",
    borderSubtle: "rgba(11, 12, 15, 0.14)",
  },
  accent: {
    brand: "#3D7BFF",
    brandHoverDark: "#528BFF",
    brandHoverLight: "#2B69EC",
    brandPressed: "#1E56D0",
    brandSubtleDark: "rgba(61, 123, 255, 0.16)",
    brandSubtleLight: "rgba(61, 123, 255, 0.08)",
  },
  semantic: {
    ready: "#34D399",
    readySubtle: "rgba(52, 211, 153, 0.14)",
    caution: "#FBBF24",
    cautionSubtle: "rgba(251, 191, 36, 0.14)",
    rest: "#F87171",
    restSubtle: "rgba(248, 113, 113, 0.14)",
    info: "#3D7BFF",
    infoSubtle: "rgba(61, 123, 255, 0.14)",
  },
  ambient: {
    dark: {
      blue: "rgba(61, 123, 255, 0.09)",
      violet: "rgba(124, 92, 255, 0.08)",
      teal: "rgba(20, 184, 166, 0.07)",
    },
    light: {
      blue: "rgba(61, 123, 255, 0.05)",
      violet: "rgba(124, 92, 255, 0.05)",
      teal: "rgba(20, 184, 166, 0.04)",
    }
  }
} as const;

export type ThemeName = "dark" | "light";
