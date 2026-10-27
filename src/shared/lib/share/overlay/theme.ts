import { RenderDimensions, SafeZoneInsets, ShareAspectRatio } from "./types";

export const CANVAS_DIMENSIONS: Record<ShareAspectRatio, RenderDimensions> = {
  "9:16": { width: 1080, height: 1920, aspectRatio: "9:16" },
  "4:5": { width: 1080, height: 1350, aspectRatio: "4:5" },
  "1:1": { width: 1080, height: 1080, aspectRatio: "1:1" }
};

export const SAFE_ZONE_INSETS: Record<ShareAspectRatio, SafeZoneInsets> = {
  "9:16": {
    top: 250, // Avoid Instagram/TikTok top profile & progress bars
    bottom: 340, // Avoid bottom message/reply and action bars
    left: 70,
    right: 70
  },
  "4:5": {
    top: 80,
    bottom: 80,
    left: 70,
    right: 70
  },
  "1:1": {
    top: 70,
    bottom: 70,
    left: 70,
    right: 70
  }
};

export const THEME_COLORS = {
  light: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.72)",
    tertiary: "rgba(255, 255, 255, 0.48)",
    badgeBg: "rgba(255, 255, 255, 0.16)",
    badgeBorder: "rgba(255, 255, 255, 0.28)",
    badgeText: "#FFFFFF",
    routeStroke: "#FFFFFF",
    routeGlow: "rgba(255, 255, 255, 0.35)",
    shadowColor: "rgba(0, 0, 0, 0.45)",
    cardBg: "rgba(14, 16, 22, 0.82)",
    cardBorder: "rgba(255, 255, 255, 0.14)"
  },
  dark: {
    primary: "#0B0C0F",
    secondary: "rgba(11, 12, 15, 0.72)",
    tertiary: "rgba(11, 12, 15, 0.48)",
    badgeBg: "rgba(11, 12, 15, 0.08)",
    badgeBorder: "rgba(11, 12, 15, 0.16)",
    badgeText: "#0B0C0F",
    routeStroke: "#0B0C0F",
    routeGlow: "rgba(0, 0, 0, 0.20)",
    shadowColor: "rgba(255, 255, 255, 0.60)",
    cardBg: "rgba(255, 255, 255, 0.92)",
    cardBorder: "rgba(0, 0, 0, 0.10)"
  },
  accent: {
    primary: "#10B981", // Emerald Olympic sprint green
    secondary: "rgba(16, 185, 129, 0.80)",
    tertiary: "rgba(16, 185, 129, 0.55)",
    badgeBg: "rgba(16, 185, 129, 0.18)",
    badgeBorder: "rgba(16, 185, 129, 0.40)",
    badgeText: "#10B981",
    routeStroke: "#10B981",
    routeGlow: "rgba(16, 185, 129, 0.40)",
    shadowColor: "rgba(0, 0, 0, 0.45)",
    cardBg: "rgba(14, 26, 20, 0.86)",
    cardBorder: "rgba(16, 185, 129, 0.30)"
  }
};

export const FONT_STACK =
  'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif';

/**
 * Snap a position to the safe zone boundaries and screen centers.
 * Returns the adjusted position and whether any guide was snapped.
 */
export function snapToSafeZones(
  currentY: number,
  boxHeight: number,
  dimensions: RenderDimensions,
  snapThreshold = 28
): { y: number; snappedTop: boolean; snappedBottom: boolean; snappedCenter: boolean } {
  const insets = SAFE_ZONE_INSETS[dimensions.aspectRatio];
  const safeTop = insets.top;
  const safeBottom = dimensions.height - insets.bottom;
  const safeCenterY = safeTop + (safeBottom - safeTop) / 2;

  const top = currentY;
  const bottom = currentY + boxHeight;
  const centerY = currentY + boxHeight / 2;

  let y = currentY;
  let snappedTop = false;
  let snappedBottom = false;
  let snappedCenter = false;

  // Snap top edge to safe top
  if (Math.abs(top - safeTop) < snapThreshold) {
    y = safeTop;
    snappedTop = true;
  }
  // Snap bottom edge to safe bottom
  else if (Math.abs(bottom - safeBottom) < snapThreshold) {
    y = safeBottom - boxHeight;
    snappedBottom = true;
  }
  // Snap center to safe center
  else if (Math.abs(centerY - safeCenterY) < snapThreshold) {
    y = safeCenterY - boxHeight / 2;
    snappedCenter = true;
  }

  return { y, snappedTop, snappedBottom, snappedCenter };
}

/**
 * Draw faint safe-zone guides when the user is actively dragging the overlay.
 */
export function drawSafeZoneGuides(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions
): void {
  const insets = SAFE_ZONE_INSETS[dimensions.aspectRatio];
  const safeTop = insets.top;
  const safeBottom = dimensions.height - insets.bottom;

  ctx.save();
  ctx.strokeStyle = "rgba(61, 123, 255, 0.55)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);

  // Top guide line
  ctx.beginPath();
  ctx.moveTo(insets.left, safeTop);
  ctx.lineTo(dimensions.width - insets.right, safeTop);
  ctx.stroke();

  // Bottom guide line
  ctx.beginPath();
  ctx.moveTo(insets.left, safeBottom);
  ctx.lineTo(dimensions.width - insets.right, safeBottom);
  ctx.stroke();

  // Center vertical guide
  ctx.strokeStyle = "rgba(61, 123, 255, 0.35)";
  ctx.beginPath();
  ctx.moveTo(dimensions.width / 2, safeTop);
  ctx.lineTo(dimensions.width / 2, safeBottom);
  ctx.stroke();

  ctx.restore();
}
