import { drawTitleBlock } from "../widgets/titleBlock";
import { drawBrandingLockup } from "../../branding";
import { drawRouteOutline } from "../widgets/routeOutline";
import { drawStatsRow } from "../widgets/statBlock";
import { drawRecordBadge } from "../widgets/recordBadge";
import { BoundingBox, OverlayData, RenderOptions } from "../types";
import { THEME_COLORS } from "../theme";

/**
 * ROUTE LAYOUT:
 * Route outline as the central hero element, flanked by sport title above and key stats below.
 * (Only available when GPS trackpoints exist).
 */
export function renderRouteLayout(
  ctx: CanvasRenderingContext2D,
  data: OverlayData,
  options: RenderOptions
): BoundingBox {
  const { dimensions, resolvedTextColor, cardBackground, activeMetrics, hideStartEndGps = true } = options;
  const colors = THEME_COLORS[resolvedTextColor];
  const activeSet = new Set(activeMetrics);

  const centerX = dimensions.width / 2;
  const contentWidth = Math.min(900, dimensions.width - 120);
  const startX = centerX - contentWidth / 2;

  let baseStartY =
    dimensions.aspectRatio === "9:16"
      ? dimensions.height * 0.28
      : dimensions.height * 0.15;

  if (options.position) {
    baseStartY += options.position.offsetY * (dimensions.height * 0.35);
  }

  const paddingX = cardBackground !== "none" ? 44 : 0;
  const paddingY = cardBackground !== "none" ? 40 : 0;
  const innerWidth = contentWidth - paddingX * 2;

  let curY = baseStartY + paddingY;

  // 1. APEX Brand Lockup (Always present above route data block, centered)
  const lockup = drawBrandingLockup(ctx, {
    containerX: startX + paddingX,
    containerWidth: innerWidth,
    startY: curY,
    layout: "route",
    colorScheme: resolvedTextColor
  });
  curY = lockup.bottomY;

  // 2. Title Block
  const showSport = activeSet.has("sportTitle");
  const showDate = activeSet.has("date");
  if (showSport || showDate) {
    curY = drawTitleBlock(ctx, data, {
      x: centerX,
      y: curY,
      maxWidth: innerWidth,
      align: "center",
      showSport,
      showTitle: showSport,
      showDate,
      colorScheme: resolvedTextColor
    });
    curY += 20;
  }

  // 2. Route Hero Outline
  if (data.routePoints && data.routePoints.length >= 2) {
    const routeBoxHeight = dimensions.aspectRatio === "9:16" ? 420 : 320;
    drawRouteOutline(ctx, data.routePoints, {
      x: startX + paddingX,
      y: curY,
      width: innerWidth,
      height: routeBoxHeight,
      padding: 24,
      lineWidth: 6,
      colorScheme: resolvedTextColor,
      hideStartEnd: hideStartEndGps
    });
    curY += routeBoxHeight + 24;
  }

  // 3. Key Stats Row (Distance, Time, Pace / Speed)
  const keyMetrics = data.metrics.filter(
    (m) =>
      (m.key === "distance" || m.key === "duration" || m.key === "paceSpeed" || m.key === "elevation") &&
      activeSet.has(m.key)
  ).slice(0, 3);

  if (keyMetrics.length > 0) {
    curY = drawStatsRow(
      ctx,
      keyMetrics,
      startX + paddingX,
      curY,
      innerWidth,
      "medium",
      resolvedTextColor
    );
    curY += 12;
  }

  // 4. Record Badge
  if (data.isRecord && activeSet.has("recordBadge")) {
    curY = drawRecordBadge(ctx, {
      x: centerX,
      y: curY + 6,
      recordTitle: data.recordTitle
    });
    curY += 8;
  }

  const totalHeight = curY - baseStartY + paddingY;
  const box: BoundingBox = {
    x: startX,
    y: baseStartY,
    width: contentWidth,
    height: totalHeight
  };

  // Card background
  if (cardBackground !== "none") {
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = colors.cardBg;
    ctx.strokeStyle = colors.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.width, box.height, 36);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  return box;
}
