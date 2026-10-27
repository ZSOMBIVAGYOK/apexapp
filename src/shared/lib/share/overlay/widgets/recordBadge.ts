import { FONT_STACK } from "../theme";

export interface RecordBadgeOptions {
  x: number;
  y: number;
  recordTitle?: string;
  locale?: "hu" | "en";
}

/**
 * Draw an eye-catching gold personal record badge
 */
export function drawRecordBadge(
  ctx: CanvasRenderingContext2D,
  options: RecordBadgeOptions
): number {
  const { x, y, recordTitle, locale = "hu" } = options;

  const defaultTitle = locale === "hu" ? "ÚJ EGYÉNI REKORD" : "NEW PERSONAL RECORD";
  const badgeText = recordTitle ? `${defaultTitle}: ${recordTitle.toUpperCase()}` : defaultTitle;

  ctx.save();
  ctx.font = `800 18px ${FONT_STACK}`;
  const textW = ctx.measureText(badgeText).width;

  const padX = 18;
  const chipH = 36;
  const chipW = textW + padX * 2 + 20;

  const chipX = x - chipW / 2;
  const chipY = y;

  // Gold gradient background
  const grad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
  grad.addColorStop(0, "rgba(245, 158, 11, 0.95)");
  grad.addColorStop(1, "rgba(217, 119, 6, 0.95)");

  ctx.shadowColor = "rgba(245, 158, 11, 0.45)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(254, 243, 199, 0.70)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Star symbol (★)
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 16px ${FONT_STACK}`;
  ctx.fillText("★", chipX + padX, chipY + chipH / 2);

  // Text
  ctx.font = `800 16px ${FONT_STACK}`;
  ctx.textAlign = "left";
  ctx.fillText(badgeText, chipX + padX + 16, chipY + chipH / 2 + 1);

  ctx.restore();
  return y + chipH;
}
