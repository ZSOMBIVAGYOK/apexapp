import { drawTitleBlock } from "../widgets/titleBlock";
import { drawBrandingLockup } from "../../branding";
import { drawStatsRow } from "../widgets/statBlock";
import { drawHeartRateChip } from "../widgets/heartRateChip";
import { drawRecordBadge } from "../widgets/recordBadge";
import { BoundingBox, OverlayData, RenderOptions, ShareMetricKey } from "../types";
import { THEME_COLORS } from "../theme";

/**
 * COMPACT LAYOUT:
 * Sport title + 2-3 big hero numbers + secondary pill badges.
 * Looks punchy and clean on stories or stickers with no tweaking.
 */
export function renderCompactLayout(
  ctx: CanvasRenderingContext2D,
  data: OverlayData,
  options: RenderOptions
): BoundingBox {
  const { dimensions, resolvedTextColor, cardBackground, activeMetrics } = options;
  const colors = THEME_COLORS[resolvedTextColor];
  const activeSet = new Set(activeMetrics);

  // Position calculation
  const centerX = dimensions.width / 2;
  const contentWidth = Math.min(880, dimensions.width - 140);
  const startX = centerX - contentWidth / 2;

  // Vertical placement: default in lower half for 9:16 story (e.g. y = 1100), or centered for 1:1 / 4:5
  let baseStartY =
    dimensions.aspectRatio === "9:16"
      ? dimensions.height * 0.58
      : dimensions.height * 0.35;

  // Apply custom offset if present
  if (options.position) {
    baseStartY += options.position.offsetY * (dimensions.height * 0.5);
  }

  // Measure content bounds
  const paddingX = cardBackground !== "none" ? 44 : 0;
  const paddingY = cardBackground !== "none" ? 40 : 0;
  const innerWidth = contentWidth - paddingX * 2;

  let curY = baseStartY + paddingY;

  // 1. APEX Brand Lockup (Always present above data block, centered)
  const lockup = drawBrandingLockup(ctx, {
    containerX: startX + paddingX,
    containerWidth: innerWidth,
    startY: curY,
    layout: "compact",
    colorScheme: resolvedTextColor
  });
  curY = lockup.bottomY;

  // 2. Title Block (Sport + Title + Date)
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
    curY += 12;
  }

  // 2. Main Hero Stats (Pick 2 or 3 primary metrics: distance, duration, paceSpeed, power, load)
  const primaryKeys: ShareMetricKey[] = ["distance", "duration", "paceSpeed", "power", "load"];
  const heroMetrics = data.metrics.filter(
    (m) => primaryKeys.includes(m.key) && activeSet.has(m.key)
  ).slice(0, 3);

  // If no primary found, take any first 2-3 active metrics
  const displayHeroes =
    heroMetrics.length > 0
      ? heroMetrics
      : data.metrics.filter((m) => activeSet.has(m.key)).slice(0, 3);

  if (displayHeroes.length > 0) {
    curY = drawStatsRow(
      ctx,
      displayHeroes,
      startX + paddingX,
      curY,
      innerWidth,
      displayHeroes.length <= 2 ? "hero" : "medium",
      resolvedTextColor
    );
    curY += 8;
  }

  // 3. Secondary Chips (Avg HR, Record badge)
  if (activeSet.has("avgHr")) {
    const avgHrMetric = data.metrics.find((m) => m.key === "avgHr");
    const maxHrMetric = data.metrics.find((m) => m.key === "maxHr" && activeSet.has("maxHr"));
    if (avgHrMetric) {
      curY = drawHeartRateChip(ctx, {
        x: centerX,
        y: curY + 6,
        avgHr: parseInt(avgHrMetric.value, 10),
        maxHr: maxHrMetric ? parseInt(maxHrMetric.value, 10) : undefined,
        colorScheme: resolvedTextColor
      });
      curY += 12;
    }
  }

  // Record Badge
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

  // Draw card background if requested
  if (cardBackground !== "none") {
    ctx.save();
    ctx.globalCompositeOperation = "destination-over"; // Draw behind text
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
