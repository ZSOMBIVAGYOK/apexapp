import { FONT_STACK, THEME_COLORS } from "../theme";

export interface HeartRateChipOptions {
  x: number;
  y: number;
  avgHr: number;
  maxHr?: number;
  colorScheme?: "light" | "dark" | "accent";
}

/**
 * Draw a compact heart rate pill chip with red heart indicator
 */
export function drawHeartRateChip(
  ctx: CanvasRenderingContext2D,
  options: HeartRateChipOptions
): number {
  const { x, y, avgHr, maxHr, colorScheme = "light" } = options;
  const colors = THEME_COLORS[colorScheme];

  const text = maxHr ? `${avgHr} / ${maxHr} bpm` : `${avgHr} bpm`;

  ctx.save();
  ctx.font = `700 20px ${FONT_STACK}`;
  const textWidth = ctx.measureText(text).width;

  const padX = 14;
  const chipH = 34;
  const chipW = textWidth + padX * 2 + 22; // extra room for heart icon

  // Background
  ctx.fillStyle = colors.badgeBg;
  ctx.beginPath();
  ctx.roundRect(x - chipW / 2, y, chipW, chipH, chipH / 2);
  ctx.fill();

  ctx.strokeStyle = colors.badgeBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - chipW / 2, y, chipW, chipH, chipH / 2);
  ctx.stroke();

  // Heart icon (rose/crimson dot)
  const iconX = x - chipW / 2 + padX + 6;
  const iconY = y + chipH / 2;
  ctx.fillStyle = "#F43F5E";
  ctx.beginPath();
  ctx.arc(iconX, iconY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = colors.primary;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, iconX + 10, iconY + 1);

  ctx.restore();
  return y + chipH;
}
