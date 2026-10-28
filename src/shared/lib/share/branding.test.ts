// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import {
  BRANDING,
  drawBrandingLockup,
  getBrandingAlignment,
  DrawLockupOptions
} from "./branding";
import { THEME_COLORS } from "./overlay/theme";

function createMockContext(): CanvasRenderingContext2D & { fillStyleHistory: string[] } {
  const history: string[] = [];
  let _fillStyle = "";
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    measureText: vi.fn((str: string) => ({ width: str.length * 12 })),
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    get fillStyle() {
      return _fillStyle;
    },
    set fillStyle(val: string) {
      _fillStyle = val;
      history.push(val);
    },
    font: "",
    textAlign: "",
    textBaseline: ""
  };
  return Object.assign(ctx, { fillStyleHistory: history }) as unknown as CanvasRenderingContext2D & {
    fillStyleHistory: string[];
  };
}

describe("Apex Branding Lockup Subsystem", () => {
  describe("1. Alignment per Layout", () => {
    it("maps alignments correctly for all photo, sticker, and video presets", () => {
      // Centered layouts
      expect(getBrandingAlignment("compact")).toBe("center");
      expect(getBrandingAlignment("minimal")).toBe("center");
      expect(getBrandingAlignment("route")).toBe("center");
      expect(getBrandingAlignment("video_minimal")).toBe("center");
      expect(getBrandingAlignment("intro")).toBe("center");
      expect(getBrandingAlignment("outro")).toBe("center");

      // Left-aligned layouts
      expect(getBrandingAlignment("stats")).toBe("left");
      expect(getBrandingAlignment("race")).toBe("left");
      expect(getBrandingAlignment("bottom_bar")).toBe("left");
      expect(getBrandingAlignment("corner")).toBe("left");
    });

    it("positions text and accent line at container left when align is left", () => {
      const ctx = createMockContext();
      const options: DrawLockupOptions = {
        containerX: 100,
        containerWidth: 600,
        startY: 200,
        align: "left"
      };

      const bounds = drawBrandingLockup(ctx, options);
      expect(bounds.x).toBe(100);

      // Verify fillRect for accent line was called at X = 100
      expect(ctx.fillRect).toHaveBeenCalledWith(
        100, // accentLineX
        expect.any(Number),
        BRANDING.accentLine.width,
        BRANDING.accentLine.height
      );
    });

    it("centers text and accent line within container when align is center", () => {
      const ctx = createMockContext();
      const options: DrawLockupOptions = {
        containerX: 100,
        containerWidth: 600,
        startY: 200,
        align: "center"
      };

      const bounds = drawBrandingLockup(ctx, options);
      const expectedCenterX = 100 + 600 / 2; // 400
      const expectedAccentLineX = expectedCenterX - BRANDING.accentLine.width / 2; // 400 - 14 = 386

      expect(ctx.fillRect).toHaveBeenCalledWith(
        expectedAccentLineX,
        expect.any(Number),
        BRANDING.accentLine.width,
        BRANDING.accentLine.height
      );
      expect(bounds.x).toBeLessThan(400);
      expect(bounds.x + bounds.width).toBeGreaterThan(400);
    });
  });

  describe("2. Scaling with Overlay", () => {
    it("scales font size, letter-spacing, and accent line dimensions proportionally", () => {
      const ctx1 = createMockContext();
      const bounds1 = drawBrandingLockup(ctx1, {
        containerX: 0,
        containerWidth: 800,
        startY: 100,
        scale: 1.0
      });

      const ctx2 = createMockContext();
      const bounds2 = drawBrandingLockup(ctx2, {
        containerX: 0,
        containerWidth: 800,
        startY: 100,
        scale: 1.5
      });

      // Height should scale by ~1.5x
      expect(bounds2.height).toBeGreaterThan(bounds1.height);
      expect(Math.abs(bounds2.height - bounds1.height * 1.5)).toBeLessThanOrEqual(1);

      // Check scaled accent line in ctx2
      expect(ctx2.fillRect).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        Math.round(BRANDING.accentLine.width * 1.5),
        Math.round(BRANDING.accentLine.height * 1.5)
      );
    });

    it("scales cleanly with fractional scales in video HUDs (e.g. 0.9x)", () => {
      const ctx = createMockContext();
      const bounds = drawBrandingLockup(ctx, {
        containerX: 50,
        containerWidth: 400,
        startY: 300,
        scale: 0.9
      });

      expect(bounds.bottomY).toBeGreaterThan(300);
      expect(bounds.height).toBeLessThan(BRANDING.fontSize + BRANDING.accentLine.gap + BRANDING.accentLine.height + BRANDING.accentLine.bottomGap + 2);
    });
  });

  describe("3. Safe Zones and Layout Boundaries", () => {
    it("returns correct bottomY for consecutive data block placement", () => {
      const ctx = createMockContext();
      const startY = 260; // 9:16 safe zone top inset is 250px
      const bounds = drawBrandingLockup(ctx, {
        containerX: 70,
        containerWidth: 940,
        startY,
        layout: "compact"
      });

      expect(bounds.y).toBe(startY);
      expect(bounds.bottomY).toBe(startY + bounds.height);
      // Ensure bottomY leaves room for subsequent data block
      expect(bounds.bottomY).toBeGreaterThan(startY + 30);
    });

    it("keeps width constrained to ~25-30% of data block width", () => {
      const ctx = createMockContext();
      const containerWidth = 880; // typical card width
      const bounds = drawBrandingLockup(ctx, {
        containerX: 100,
        containerWidth,
        startY: 200,
        align: "center"
      });

      // Wordmark + accent line is compact (~25-30% of 880 is ~220-264px max)
      const ratio = bounds.width / containerWidth;
      expect(ratio).toBeLessThan(0.35);
    });
  });

  describe("4. Contrast Variant Choice", () => {
    it("applies light theme colors and subtle shadow by default", () => {
      const ctx = createMockContext();
      drawBrandingLockup(ctx, {
        containerX: 0,
        containerWidth: 500,
        startY: 100,
        colorScheme: "light"
      });

      expect(ctx.shadowColor).toBe(THEME_COLORS.light.shadowColor);
      expect(ctx.fillStyleHistory[0]).toBe(THEME_COLORS.light.primary);
      expect(ctx.fillStyleHistory[1]).toBe(BRANDING.accentLine.color);
    });

    it("applies dark theme colors when luminance indicates light background", () => {
      const ctx = createMockContext();
      drawBrandingLockup(ctx, {
        containerX: 0,
        containerWidth: 500,
        startY: 100,
        colorScheme: "dark"
      });

      expect(ctx.shadowColor).toBe(THEME_COLORS.dark.shadowColor);
      expect(ctx.fillStyleHistory[0]).toBe(THEME_COLORS.dark.primary);
    });

    it("applies accent theme color when requested", () => {
      const ctx = createMockContext();
      drawBrandingLockup(ctx, {
        containerX: 0,
        containerWidth: 500,
        startY: 100,
        colorScheme: "accent"
      });

      expect(ctx.fillStyleHistory[0]).toBe(THEME_COLORS.accent.primary);
    });
  });

  describe("5. Central Branding Configuration Integrity", () => {
    it("has 'APEX' wordmark, tracking, and accent line configured centrally in branding.ts", () => {
      expect(BRANDING.wordmark).toBe("APEX");
      expect(BRANDING.letterSpacing).toBeGreaterThan(4);
      expect(BRANDING.fontWeight).toBe(800);
      expect(BRANDING.accentLine.enabled).toBe(true);
      expect(BRANDING.accentLine.width).toBe(28);
      expect(BRANDING.accentLine.height).toBe(2);
      expect(BRANDING.accentLine.color).toBe("#06B6D4");
    });

    it("provides custom logo slot (logoUrl, logoWidth, logoHeight) without changing layout callers", () => {
      expect(BRANDING).toHaveProperty("logoUrl");
      expect(BRANDING).toHaveProperty("logoWidth");
      expect(BRANDING).toHaveProperty("logoHeight");
    });
  });
});
