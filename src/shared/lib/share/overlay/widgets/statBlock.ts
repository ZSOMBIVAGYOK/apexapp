import { FONT_STACK, THEME_COLORS } from "../theme";
import { FormattedMetric } from "../types";

export interface StatItemOptions {
  x: number;
  y: number;
  width: number;
  metric: FormattedMetric;
  size?: "hero" | "medium" | "compact";
  align?: "left" | "center";
  colorScheme?: "light" | "dark" | "accent";
}

/**
 * Draw a single stat metric (Number + Unit + Label)
 */
export function drawStatItem(
  ctx: CanvasRenderingContext2D,
  options: StatItemOptions
): number {
  const {
    x,
    y,
    width,
    metric,
    size = "medium",
    align = "center",
    colorScheme = "light"
  } = options;

  const colors = THEME_COLORS[colorScheme];
  let curY = y;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.shadowColor = colors.shadowColor;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  const posX = align === "center" ? x + width / 2 : x;

  // Font sizes by size tier
  const numFontSize = size === "hero" ? 84 : size === "medium" ? 54 : 38;
  const unitFontSize = size === "hero" ? 32 : size === "medium" ? 24 : 18;
  const labelFontSize = size === "hero" ? 22 : size === "medium" ? 18 : 15;

  // 1. Draw Value & Unit
  ctx.font = `800 ${numFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = colors.primary;

  const valText = metric.value;
  const valWidth = ctx.measureText(valText).width;

  if (metric.unit) {
    ctx.font = `600 ${unitFontSize}px ${FONT_STACK}`;
    const unitWidth = ctx.measureText(metric.unit).width;
    const spacing = 8;
    const combinedWidth = valWidth + spacing + unitWidth;

    if (align === "center") {
      const startX = posX - combinedWidth / 2;
      // Draw Value
      ctx.textAlign = "left";
      ctx.font = `800 ${numFontSize}px ${FONT_STACK}`;
      ctx.fillStyle = colors.primary;
      ctx.fillText(valText, startX, curY);

      // Draw Unit (aligned slightly above baseline)
      ctx.font = `600 ${unitFontSize}px ${FONT_STACK}`;
      ctx.fillStyle = colors.secondary;
      ctx.fillText(metric.unit, startX + valWidth + spacing, curY + (numFontSize - unitFontSize) * 0.7);
    } else {
      ctx.textAlign = "left";
      ctx.fillText(valText, posX, curY);
      ctx.font = `600 ${unitFontSize}px ${FONT_STACK}`;
      ctx.fillStyle = colors.secondary;
      ctx.fillText(metric.unit, posX + valWidth + spacing, curY + (numFontSize - unitFontSize) * 0.7);
    }
  } else {
    ctx.textAlign = align;
    ctx.fillText(valText, posX, curY);
  }

  curY += numFontSize + 8;

  // 2. Draw Label
  ctx.textAlign = align;
  ctx.font = `700 ${labelFontSize}px ${FONT_STACK}`;
  ctx.fillStyle = colors.tertiary;

  // Letter spacing simulation for uppercase label
  const labelText = metric.label.toUpperCase();
  ctx.fillText(labelText, posX, curY);

  curY += labelFontSize + 12;

  ctx.restore();
  return curY;
}

/**
 * Draw a row of metrics side by side
 */
export function drawStatsRow(
  ctx: CanvasRenderingContext2D,
  metrics: FormattedMetric[],
  x: number,
  y: number,
  totalWidth: number,
  size: "hero" | "medium" | "compact" = "medium",
  colorScheme: "light" | "dark" | "accent" = "light"
): number {
  if (metrics.length === 0) return y;

  const colWidth = totalWidth / metrics.length;
  let maxY = y;

  for (let i = 0; i < metrics.length; i++) {
    const m = metrics[i]!;
    const itemX = x + i * colWidth;
    const endY = drawStatItem(ctx, {
      x: itemX,
      y,
      width: colWidth,
      metric: m,
      size,
      align: "center",
      colorScheme
    });
    if (endY > maxY) maxY = endY;
  }

  return maxY;
}
