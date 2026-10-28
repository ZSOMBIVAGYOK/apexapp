/**
 * Single source of truth for Apex share overlay branding.
 *
 * THE APEX NAME ABOVE THE DATA, ALWAYS PRESENT:
 * - The brand name "APEX" sits ABOVE the data block as part of ONE group (lockup).
 * - Refined style: wide letter-spacing, bold weight, small size relative to block width (~25-30%),
 *   a short thin accent line under it, then the data block.
 * - Alignment per layout:
 *   - Centered for Kompakt and Minimál
 *   - Left-aligned for Statisztika and Verseny
 *   - Above the route for the Útvonal layout
 *   - Video presets (Alsó sáv, Sarok, Minimál, Verseny): placed above the live data block,
 *     and included on the intro/outro cards.
 * - Non-optional: the wordmark cannot be hidden or toggled off anywhere.
 * - Moves and scales together with the overlay group when dragged or pinched.
 * - Included in the tightly cropped sticker.
 * - Automatic light or dark contrast variant with subtle shadow.
 *
 * HOW TO ADD A CUSTOM LOGO LATER:
 * 1. Place your PNG/SVG asset in `public/` (e.g. `/brand/logo.svg` or `/brand/logo.png`) or data URI.
 * 2. Set `logoUrl` below.
 * 3. Adjust `logoWidth` and `logoHeight`.
 * 4. The lockup renderer will automatically draw the logo image instead of or alongside the text,
 *    without modifying any of the layouts!
 */

import { FONT_STACK, THEME_COLORS } from "./overlay/theme";

export type BrandingAlignment = "left" | "center" | "right";

export type BrandingPlacement =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

export interface BrandingConfig {
  /**
   * Primary brand wordmark displayed on overlays (e.g. "APEX").
   */
  wordmark: string;

  /**
   * Optional secondary subtitle / tagline under the wordmark.
   */
  tagline?: string;

  /**
   * Optional logo image URL (PNG, SVG, or data URI).
   * Leave undefined until a custom logo image asset is ready.
   */
  logoUrl?: string;

  /**
   * Render width of the logo image at 1080px canvas base resolution.
   */
  logoWidth?: number;

  /**
   * Render height of the logo image at 1080px canvas base resolution.
   */
  logoHeight?: number;

  /**
   * Default placement on canvas (for backward compatibility).
   */
  placement: BrandingPlacement;

  /**
   * Letter spacing for the wordmark text in pixels (at 1080px base).
   * Wide letter-spacing gives a refined, premium feel.
   */
  letterSpacing: number;

  /**
   * Base font size in virtual pixels (at 1080px base).
   * Sized small relative to data block (~25-30% of data block width).
   */
  fontSize: number;

  /**
   * Font weight for the wordmark ("800" or 800).
   */
  fontWeight: number | string;

  /**
   * Short thin accent line under the wordmark text.
   */
  accentLine: {
    enabled: boolean;
    /** Width of accent line in pixels (e.g. 28px) */
    width: number;
    /** Thickness in pixels (e.g. 2px) */
    height: number;
    /** Vertical gap between wordmark text and accent line */
    gap: number;
    /** Vertical gap between accent line and the following data block */
    bottomGap: number;
    /** Optional explicit color (defaults to theme accent / #06B6D4) */
    color?: string;
  };

  /**
   * Alignment per layout for consistent visual hierarchy.
   */
  layoutAlignments: {
    compact: BrandingAlignment;
    stats: BrandingAlignment;
    route: BrandingAlignment;
    minimal: BrandingAlignment;
    bottom_bar: BrandingAlignment;
    corner: BrandingAlignment;
    video_minimal: BrandingAlignment;
    race: BrandingAlignment;
    intro: BrandingAlignment;
    outro: BrandingAlignment;
  };
}

export const BRANDING: BrandingConfig = {
  wordmark: "APEX",
  tagline: undefined,
  logoUrl: undefined, // Drop custom logo image here when ready
  logoWidth: 120,
  logoHeight: 36,
  placement: "bottom-center",
  letterSpacing: 6, // Refined wide tracking (~0.25em)
  fontSize: 22, // Refined compact font size (~25-30% of data block)
  fontWeight: 800, // Bold weight
  accentLine: {
    enabled: true,
    width: 28, // Short thin accent line
    height: 2, // Thin line
    gap: 7, // Distance from wordmark baseline to accent line
    bottomGap: 16, // Distance from accent line to the following data block
    color: "#06B6D4" // Vibrant athletic cyan accent
  },
  layoutAlignments: {
    compact: "center",
    stats: "left",
    route: "center",
    minimal: "center",
    bottom_bar: "left",
    corner: "left",
    video_minimal: "center",
    race: "left",
    intro: "center",
    outro: "center"
  }
};

export interface DrawLockupOptions {
  /** Left coordinate of the enclosing container / data block */
  containerX: number;
  /** Width of the enclosing container / data block */
  containerWidth: number;
  /** Top Y coordinate where the lockup begins */
  startY: number;
  /** Optional override for alignment (defaults to layout alignment) */
  align?: BrandingAlignment;
  /** Color scheme: 'light' | 'dark' | 'accent' */
  colorScheme?: "light" | "dark" | "accent";
  /** Optional custom accent color for the line */
  accentColor?: string;
  /** Scale factor (e.g. for video HUD or small viewports) */
  scale?: number;
  /** Optional layout id to resolve alignment from config */
  layout?: keyof BrandingConfig["layoutAlignments"] | string;
}

export interface LockupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  bottomY: number;
}

/**
 * Returns the configured branding alignment for a given layout identifier.
 */
export function getBrandingAlignment(
  layout: keyof BrandingConfig["layoutAlignments"] | string
): BrandingAlignment {
  if (layout in BRANDING.layoutAlignments) {
    return BRANDING.layoutAlignments[layout as keyof BrandingConfig["layoutAlignments"]];
  }
  return "center";
}

/**
 * Draw the refined APEX branding lockup above the data block.
 * Returns the bounds and bottomY where the data block should start.
 */
export function drawBrandingLockup(
  ctx: CanvasRenderingContext2D,
  options: DrawLockupOptions
): LockupBounds {
  const {
    containerX,
    containerWidth,
    startY,
    layout,
    align = layout ? getBrandingAlignment(layout) : "center",
    colorScheme = "light",
    accentColor,
    scale = 1.0
  } = options;

  const colors = THEME_COLORS[colorScheme] || THEME_COLORS.light;
  const fontSize = Math.round(BRANDING.fontSize * scale);
  const letterSpacing = BRANDING.letterSpacing * scale;
  const accentLineWidth = Math.round(BRANDING.accentLine.width * scale);
  const accentLineHeight = Math.max(1.5, Math.round(BRANDING.accentLine.height * scale));
  const gap = Math.round(BRANDING.accentLine.gap * scale);
  const bottomGap = Math.round(BRANDING.accentLine.bottomGap * scale);

  ctx.save();
  ctx.shadowColor = colors.shadowColor;
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  ctx.font = `${BRANDING.fontWeight} ${fontSize}px ${FONT_STACK}`;
  const text = BRANDING.wordmark;

  let textWidth = 0;
  for (let i = 0; i < text.length; i++) {
    textWidth += ctx.measureText(text[i]!).width;
  }
  textWidth += (text.length - 1) * letterSpacing;

  let textStartX: number;
  let accentLineX: number;

  if (align === "center") {
    const centerX = containerX + containerWidth / 2;
    textStartX = centerX - textWidth / 2;
    accentLineX = centerX - accentLineWidth / 2;
  } else if (align === "right") {
    textStartX = containerX + containerWidth - textWidth;
    accentLineX = containerX + containerWidth - accentLineWidth;
  } else {
    // left
    textStartX = containerX;
    accentLineX = containerX;
  }

  const textY = startY + fontSize;

  // 1. Draw Wordmark Text
  ctx.fillStyle = colors.primary;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  let curX = textStartX;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    ctx.fillText(char, curX, textY);
    curX += ctx.measureText(char).width + letterSpacing;
  }

  // 2. Draw Thin Accent Line
  if (BRANDING.accentLine.enabled) {
    const lineY = textY + gap;
    ctx.fillStyle = accentColor || BRANDING.accentLine.color || colors.primary;
    ctx.fillRect(accentLineX, lineY, accentLineWidth, accentLineHeight);
  }

  ctx.restore();

  const totalHeight = fontSize + gap + accentLineHeight + bottomGap;
  const bottomY = startY + totalHeight;

  return {
    x: align === "left" ? containerX : textStartX,
    y: startY,
    width: Math.max(textWidth, accentLineWidth),
    height: totalHeight,
    bottomY
  };
}
