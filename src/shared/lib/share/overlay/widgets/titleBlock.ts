import { FONT_STACK, THEME_COLORS } from "../theme";
import { OverlayData } from "../types";

export interface TitleBlockOptions {
  x: number;
  y: number;
  maxWidth: number;
  align?: "left" | "center";
  showSport?: boolean;
  showTitle?: boolean;
  showDate?: boolean;
  colorScheme?: "light" | "dark" | "accent";
}

/**
 * Draw title, sport tag, and date with graceful ellipsis truncation for long titles.
 * Returns the bottom Y coordinate of the block.
 */
export function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  data: OverlayData,
  options: TitleBlockOptions
): number {
  const {
    x,
    y,
    maxWidth,
    align = "center",
    showSport = true,
    showTitle = true,
    showDate = true,
    colorScheme = "light"
  } = options;

  const colors = THEME_COLORS[colorScheme];
  let curY = y;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.shadowColor = colors.shadowColor;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;

  // 1. Sport Chip / Badge
  if (showSport && data.sportName) {
    const sportText = data.sportName.toUpperCase();
    ctx.font = `700 20px ${FONT_STACK}`;
    const textMetrics = ctx.measureText(sportText);
    const chipPadX = 16;
    const chipW = textMetrics.width + chipPadX * 2;
    const chipH = 34;

    const chipX = align === "center" ? x - chipW / 2 : x;
    const chipY = curY;

    // Draw Pill Background
    ctx.fillStyle = colors.badgeBg;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fill();

    ctx.strokeStyle = colors.badgeBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, chipH / 2);
    ctx.stroke();

    // Text inside chip
    ctx.fillStyle = colors.badgeText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sportText, chipX + chipW / 2, chipY + chipH / 2 + 1);

    curY += chipH + 16;
  }

  // 2. Main Title (with ellipsis truncation)
  if (showTitle && data.title) {
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.font = `800 42px ${FONT_STACK}`;
    ctx.fillStyle = colors.primary;

    let displayTitle = data.title;
    if (ctx.measureText(displayTitle).width > maxWidth) {
      while (
        displayTitle.length > 0 &&
        ctx.measureText(displayTitle + "…").width > maxWidth
      ) {
        displayTitle = displayTitle.slice(0, -1).trim();
      }
      displayTitle = displayTitle + "…";
    }

    ctx.fillText(displayTitle, x, curY);
    curY += 52;
  }

  // 3. Date
  if (showDate && data.dateFormatted) {
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.font = `500 22px ${FONT_STACK}`;
    ctx.fillStyle = colors.secondary;
    ctx.fillText(data.dateFormatted, x, curY);
    curY += 34;
  }

  ctx.restore();
  return curY;
}
