import { drawBrandingLockup, LockupBounds, DrawLockupOptions } from "../../branding";
import { RenderDimensions } from "../types";

export { drawBrandingLockup };
export type { LockupBounds, DrawLockupOptions };

/**
 * Draw the brand wordmark lockup according to branding.ts rules.
 * Maintained for backward compatibility.
 */
export function drawWordmark(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  colorScheme: "light" | "dark" | "accent",
  customY?: number
): void {
  const y = customY ?? (dimensions.height - 120);
  drawBrandingLockup(ctx, {
    containerX: 0,
    containerWidth: dimensions.width,
    startY: y,
    align: "center",
    colorScheme
  });
}
