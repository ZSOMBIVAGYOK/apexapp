/**
 * Single source of truth for Apex share overlay branding.
 *
 * HOW TO ADD A CUSTOM LOGO LATER:
 * 1. Place your PNG/SVG asset in `public/` (e.g. `/brand/logo.svg` or `/brand/logo.png`) or import it.
 * 2. Set `logoUrl` below to the asset path or an inline SVG data URL.
 * 3. Adjust `logoWidth` and `logoHeight` (in canvas virtual pixels, base width 1080px).
 * 4. Choose your preferred placement: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'.
 * The overlay renderer will automatically draw the logo image instead of (or alongside) the wordmark.
 */

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
   * Default placement on the canvas.
   */
  placement: BrandingPlacement;

  /**
   * Letter spacing for the wordmark text in pixels (at 1080px base).
   */
  letterSpacing: number;
}

export const BRANDING: BrandingConfig = {
  wordmark: "APEX",
  tagline: undefined,
  logoUrl: undefined, // Currently unset; drop in custom logo asset here when ready
  logoWidth: 120,
  logoHeight: 40,
  placement: "bottom-center",
  letterSpacing: 6
};
