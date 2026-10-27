import { drawTitleBlock } from "../widgets/titleBlock";
import { drawStatItem } from "../widgets/statBlock";
import { drawRecordBadge } from "../widgets/recordBadge";
import { BoundingBox, OverlayData, RenderOptions } from "../types";
import { THEME_COLORS } from "../theme";

/**
 * STATS LAYOUT:
 * Title, date and an elegant 2-column grid of all chosen metrics.
 */
export function renderStatsLayout(
  ctx: CanvasRenderingContext2D,
  data: OverlayData,
  options: RenderOptions
): BoundingBox {
  const { dimensions, resolvedTextColor, cardBackground, activeMetrics } = options;
  const colors = THEME_COLORS[resolvedTextColor];
  const activeSet = new Set(activeMetrics);

  const centerX = dimensions.width / 2;
  const contentWidth = Math.min(900, dimensions.width - 120);
  const startX = centerX - contentWidth / 2;

  let baseStartY =
    dimensions.aspectRatio === "9:16"
      ? dimensions.height * 0.42
      : dimensions.height * 0.22;

  if (options.position) {
    baseStartY += options.position.offsetY * (dimensions.height * 0.4);
  }

  const paddingX = cardBackground !== "none" ? 44 : 0;
  const paddingY = cardBackground !== "none" ? 44 : 0;
  const innerWidth = contentWidth - paddingX * 2;

  let curY = baseStartY + paddingY;

  // 1. Title Block
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
    curY += 16;
  }

  // 2. Filter active metrics for grid
  const gridMetrics = data.metrics.filter(
    (m) => activeSet.has(m.key) && m.key !== "sportTitle" && m.key !== "date" && m.key !== "recordBadge"
  );

  if (gridMetrics.length > 0) {
    const cols = gridMetrics.length === 1 ? 1 : 2;
    const colWidth = innerWidth / cols;
    const rowHeight = 90;

    for (let i = 0; i < gridMetrics.length; i++) {
      const m = gridMetrics[i]!;
      const col = i % cols;
      const row = Math.floor(i / cols);

      const itemX = startX + paddingX + col * colWidth;
      const itemY = curY + row * rowHeight;

      drawStatItem(ctx, {
        x: itemX,
        y: itemY,
        width: colWidth,
        metric: m,
        size: "compact",
        align: "center",
        colorScheme: resolvedTextColor
      });
    }

    const totalRows = Math.ceil(gridMetrics.length / cols);
    curY += totalRows * rowHeight + 10;
  }

  // 3. Record Badge
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
