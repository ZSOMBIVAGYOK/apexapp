import { BRANDING } from "../../branding";
import { FONT_STACK, THEME_COLORS } from "../theme";
import { RenderDimensions } from "../types";

/**
 * Draw the brand wordmark or custom logo image according to branding.ts rules.
 */
export function drawWordmark(
  ctx: CanvasRenderingContext2D,
  dimensions: RenderDimensions,
  colorScheme: "light" | "dark" | "accent",
  customY?: number
): void {
  const colors = THEME_COLORS[colorScheme];

  ctx.save();
  ctx.shadowColor = colors.shadowColor;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // If a custom logo image URL is configured, we could draw it here when loaded
  // For now, draw pristine tracked text wordmark
  ctx.fillStyle = colors.primary;
  ctx.font = `800 24px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const x = dimensions.width / 2;
  const y = customY ?? (dimensions.height - 120);

  // Simulate letter spacing for wordmark
  const text = BRANDING.wordmark;
  const letterSpacing = BRANDING.letterSpacing;

  const totalWidth =
    ctx.measureText(text).width + (text.length - 1) * letterSpacing;
  let startX = x - totalWidth / 2;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    ctx.fillText(char, startX, y);
    startX += ctx.measureText(char).width + letterSpacing;
  }

  // Draw tiny tagline if configured
  if (BRANDING.tagline) {
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillStyle = colors.secondary;
    ctx.fillText(BRANDING.tagline.toUpperCase(), x, y + 26);
  }

  ctx.restore();
}
