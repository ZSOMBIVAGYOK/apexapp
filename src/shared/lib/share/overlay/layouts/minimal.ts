import { BoundingBox, OverlayData, RenderOptions } from "../types";
import { drawBrandingLockup } from "../../branding";
import { FONT_STACK, THEME_COLORS } from "../theme";

/**
 * MINIMAL LAYOUT:
 * One massive hero number plus an understated elegant caption.
 */
export function renderMinimalLayout(
  ctx: CanvasRenderingContext2D,
  data: OverlayData,
  options: RenderOptions
): BoundingBox {
  const { dimensions, resolvedTextColor, cardBackground, activeMetrics } = options;
  const colors = THEME_COLORS[resolvedTextColor];
  const activeSet = new Set(activeMetrics);

  const centerX = dimensions.width / 2;
  const contentWidth = Math.min(840, dimensions.width - 140);
  const startX = centerX - contentWidth / 2;

  let baseStartY =
    dimensions.aspectRatio === "9:16"
      ? dimensions.height * 0.65
      : dimensions.height * 0.42;

  if (options.position) {
    baseStartY += options.position.offsetY * (dimensions.height * 0.4);
  }

  const paddingY = cardBackground !== "none" ? 36 : 0;

  // Pick the single most significant hero metric: distance -> duration -> load
  const heroMetric =
    data.metrics.find((m) => m.key === "distance" && activeSet.has("distance")) ||
    data.metrics.find((m) => m.key === "duration" && activeSet.has("duration")) ||
    data.metrics.find((m) => m.key === "load" && activeSet.has("load")) ||
    data.metrics[0];

  let curY = baseStartY + paddingY;

  // 1. APEX Brand Lockup (Always present above hero metric, centered)
  const lockup = drawBrandingLockup(ctx, {
    containerX: startX,
    containerWidth: contentWidth,
    startY: curY,
    layout: "minimal",
    colorScheme: resolvedTextColor
  });
  curY = lockup.bottomY;

  ctx.save();
  ctx.shadowColor = colors.shadowColor;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;

  if (heroMetric) {
    // 1. Massive Hero Number (e.g. 108px font)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `800 110px ${FONT_STACK}`;
    ctx.fillStyle = colors.primary;

    const valText = heroMetric.value;
    const valWidth = ctx.measureText(valText).width;

    if (heroMetric.unit) {
      ctx.font = `700 36px ${FONT_STACK}`;
      const unitWidth = ctx.measureText(heroMetric.unit).width;
      const combined = valWidth + 12 + unitWidth;
      const startTextX = centerX - combined / 2;

      ctx.textAlign = "left";
      ctx.font = `800 110px ${FONT_STACK}`;
      ctx.fillText(valText, startTextX, curY);

      ctx.font = `700 36px ${FONT_STACK}`;
      ctx.fillStyle = colors.secondary;
      ctx.fillText(heroMetric.unit, startTextX + valWidth + 12, curY + 54);
    } else {
      ctx.fillText(valText, centerX, curY);
    }

    curY += 122;
  }

  // 2. Caption Line: Sport · Date · (Secondary stat)
  const captionParts: string[] = [];
  if (activeSet.has("sportTitle") && data.sportName) {
    captionParts.push(data.sportName);
  }
  if (activeSet.has("date") && data.dateFormatted) {
    captionParts.push(data.dateFormatted);
  }

  // Add secondary stat if available (e.g. pace or avg HR)
  const secondary = data.metrics.find(
    (m) =>
      (m.key === "paceSpeed" || m.key === "avgHr" || m.key === "duration") &&
      m.key !== heroMetric?.key &&
      activeSet.has(m.key)
  );
  if (secondary) {
    captionParts.push(`${secondary.value} ${secondary.unit || ""}`.trim());
  }

  if (captionParts.length > 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `600 24px ${FONT_STACK}`;
    ctx.fillStyle = colors.secondary;
    ctx.fillText(captionParts.join("  ·  "), centerX, curY);
    curY += 34;
  }

  ctx.restore();

  const totalHeight = curY - baseStartY + paddingY;
  const box: BoundingBox = {
    x: startX,
    y: baseStartY,
    width: contentWidth,
    height: totalHeight
  };

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
