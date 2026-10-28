/**
 * Apex Design System - Radii & Shape Tokens
 * Concentric radii system: innerRadius = max(0, outerRadius - padding)
 */

export const radii = {
  none: "0px",
  xs: "6px",
  sm: "10px",
  controlSm: "14px",     // small controls, chips, small inputs
  md: "16px",            // standard controls, badges
  lg: "20px",            // nested cards, popovers
  xl: "24px",            // standard cards
  card: "28px",          // primary content cards
  sheet: "32px",         // bottom sheet top corners, dialogs
  capsule: "9999px",     // pill buttons, tab bars, tags
} as const;

/**
 * Calculates concentric inner border radius for perfectly aligned nested cards/pills
 */
export function calcConcentricRadius(outerPx: number, paddingPx: number): number {
  return Math.max(0, outerPx - paddingPx);
}
