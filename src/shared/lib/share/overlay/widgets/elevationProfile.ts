import { THEME_COLORS } from "../theme";

export interface ElevationProfileOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  colorScheme?: "light" | "dark" | "accent";
}

/**
 * Draw an elevation profile silhouette from sampled points
 */
export function drawElevationProfile(
  ctx: CanvasRenderingContext2D,
  elevations: number[],
  options: ElevationProfileOptions
): void {
  const { x, y, width, height, colorScheme = "light" } = options;
  if (!elevations || elevations.length < 2) return;

  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const range = Math.max(1, max - min);

  const colors = THEME_COLORS[colorScheme];

  ctx.save();
  const stepX = width / (elevations.length - 1);

  // Build profile path
  ctx.beginPath();
  ctx.moveTo(x, y + height);

  for (let i = 0; i < elevations.length; i++) {
    const val = elevations[i]!;
    const px = x + i * stepX;
    const py = y + height - ((val - min) / range) * (height * 0.85);
    ctx.lineTo(px, py);
  }

  ctx.lineTo(x + width, y + height);
  ctx.closePath();

  // Fill gradient
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, colors.secondary);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fill();

  // Stroke top line
  ctx.beginPath();
  for (let i = 0; i < elevations.length; i++) {
    const val = elevations[i]!;
    const px = x + i * stepX;
    const py = y + height - ((val - min) / range) * (height * 0.85);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();
}
