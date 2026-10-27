import { drawWordmark } from "./widgets/wordmark";
import { renderCompactLayout } from "./layouts/compact";
import { renderStatsLayout } from "./layouts/stats";
import { renderRouteLayout } from "./layouts/route";
import { renderMinimalLayout } from "./layouts/minimal";
import { calculateAreaLuminance } from "./formatters";
import { drawSafeZoneGuides } from "./theme";
import { BoundingBox, OverlayData, RenderOptions, ShareLayoutId } from "./types";

/**
 * Draw background photo scaled, panned, and zoomed to cover the canvas.
 */
function drawCoverPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  targetWidth: number,
  targetHeight: number,
  panX = 0,
  panY = 0,
  zoom = 1.0
): void {
  const imgW = img.width;
  const imgH = img.height;

  // Aspect fill scale
  const baseScale = Math.max(targetWidth / imgW, targetHeight / imgH);
  const effectiveScale = baseScale * Math.max(1, zoom);

  const drawW = imgW * effectiveScale;
  const drawH = imgH * effectiveScale;

  // Center plus pan offset
  const dx = (targetWidth - drawW) / 2 + panX;
  const dy = (targetHeight - drawH) / 2 + panY;

  ctx.drawImage(img, dx, dy, drawW, drawH);
}

/**
 * Draw soft gradient scrim behind overlay to maximize legibility.
 */
function drawScrim(
  ctx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number,
  dimming = 0.3
): void {
  if (dimming <= 0) return;

  ctx.save();
  const clamped = Math.min(0.85, Math.max(0, dimming));

  // Soft vertical gradient from transparent top to darkened bottom
  const grad = ctx.createLinearGradient(0, 0, 0, targetHeight);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.05)");
  grad.addColorStop(0.35, `rgba(0, 0, 0, ${clamped * 0.4})`);
  grad.addColorStop(1, `rgba(0, 0, 0, ${clamped})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.restore();
}

/**
 * Pure, framework-free canvas renderer that draws an overlay onto any 2D canvas context.
 *
 * @param ctx 2D Canvas context (works with HTML5 Canvas or OffscreenCanvas)
 * @param layout Layout type ('compact' | 'stats' | 'route' | 'minimal')
 * @param data Pure plain object of already formatted values
 * @param options Rendering configuration options
 * @returns Bounding box of the rendered overlay content
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  layout: ShareLayoutId,
  data: OverlayData,
  options: RenderOptions
): BoundingBox {
  const { dimensions, photoImage, photoPan, photoZoom, dimming = 0, isDragging } = options;
  const { width, height } = dimensions;

  // 1. Clear Canvas
  ctx.clearRect(0, 0, width, height);

  // 2. Draw Background Photo (if provided in Photo Mode)
  if (photoImage) {
    drawCoverPhoto(
      ctx,
      photoImage,
      width,
      height,
      photoPan?.x ?? 0,
      photoPan?.y ?? 0,
      photoZoom ?? 1.0
    );

    // 3. Draw Soft Scrim behind overlay
    drawScrim(ctx, width, height, dimming);
  }

  // 4. Resolve Text Color if set to Auto
  let resolvedColor = options.resolvedTextColor;
  if (!resolvedColor || (resolvedColor as string) === "auto") {
    if (photoImage) {
      // Estimate rough overlay box position (lower center) to sample luminance
      const sampleX = width * 0.15;
      const sampleY = height * 0.45;
      const sampleW = width * 0.7;
      const sampleH = height * 0.4;
      const lum = calculateAreaLuminance(ctx, sampleX, sampleY, sampleW, sampleH);
      resolvedColor = lum > 130 ? "dark" : "light";
    } else {
      resolvedColor = "light";
    }
  }

  const effectiveOptions: RenderOptions = {
    ...options,
    resolvedTextColor: resolvedColor
  };

  // 5. Render Layout
  let box: BoundingBox;
  switch (layout) {
    case "stats":
      box = renderStatsLayout(ctx, data, effectiveOptions);
      break;
    case "route":
      // Fallback to compact if session lacks GPS points
      if (data.hasGps && data.routePoints && data.routePoints.length >= 2) {
        box = renderRouteLayout(ctx, data, effectiveOptions);
      } else {
        box = renderCompactLayout(ctx, data, effectiveOptions);
      }
      break;
    case "minimal":
      box = renderMinimalLayout(ctx, data, effectiveOptions);
      break;
    case "compact":
    default:
      box = renderCompactLayout(ctx, data, effectiveOptions);
      break;
  }

  // 6. Draw Brand Wordmark
  if (options.showBranding) {
    drawWordmark(ctx, dimensions, resolvedColor);
  }

  // 7. Draw Safe-Zone Guides while actively dragging
  if (isDragging) {
    drawSafeZoneGuides(ctx, dimensions);
  }

  return box;
}
