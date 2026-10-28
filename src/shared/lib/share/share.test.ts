// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  formatDurationSeconds,
  formatDistance,
  formatPaceOrSpeed,
  formatSessionDate,
  buildOverlayData,
  calculateAreaLuminance
} from "./overlay/formatters";
import {
  calculateHaversineMeters,
  trimRoutePrivacy
} from "./overlay/widgets/routeOutline";
import { snapToSafeZones, CANVAS_DIMENSIONS } from "./overlay/theme";
import {
  getArchetypeForSport,
  getInitialActiveMetrics
} from "./overlay/defaults";
import { drawOverlay } from "./overlay/renderer";
import { exportSessionImage, copyImageToClipboard } from "./imageExporter";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import { OverlayGpsPoint, RenderOptions, ShareMetricKey } from "./overlay/types";

function createMockContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return {
    canvas,
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    measureText: (text: string) => ({ width: text.length * 12 }),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    roundRect: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(400) })
  } as unknown as CanvasRenderingContext2D;
}

describe("Share Overlay Subsystem", () => {
  describe("Formatters", () => {
    it("formats duration correctly in mm:ss and h:mm:ss", () => {
      expect(formatDurationSeconds(45)).toBe("0:45");
      expect(formatDurationSeconds(245)).toBe("4:05");
      expect(formatDurationSeconds(3600)).toBe("1:00:00");
      expect(formatDurationSeconds(3725)).toBe("1:02:05");
    });

    it("formats distance with metric and imperial units and Hungarian comma", () => {
      const metricHu = formatDistance(10450, "metric", "hu");
      expect(metricHu.value).toBe("10,45");
      expect(metricHu.unit).toBe("km");

      const metricEn = formatDistance(10450, "metric", "en");
      expect(metricEn.value).toBe("10.45");

      const imperial = formatDistance(1609.344 * 5, "imperial", "en");
      expect(imperial.value).toBe("5.00");
      expect(imperial.unit).toBe("mi");
    });

    it("formats pace or speed adapting dynamically to the sport", () => {
      // Running: 10 km in 50 min -> 5:00 /km
      const runPace = formatPaceOrSpeed(10000, 3000, "running", "metric", "hu");
      expect(runPace.value).toBe("5:00");
      expect(runPace.unit).toBe("/km");

      // Cycling: 30 km in 60 min -> 30,0 km/h
      const bikeSpeed = formatPaceOrSpeed(30000, 3600, "cycling", "metric", "hu");
      expect(bikeSpeed.value).toBe("30,0");
      expect(bikeSpeed.unit).toBe("km/h");

      // Swimming: 1000m in 15 min (900s) -> 1:30 /100m
      const swimPace = formatPaceOrSpeed(1000, 900, "swimming", "metric", "hu");
      expect(swimPace.value).toBe("1:30");
      expect(swimPace.unit).toBe("/100m");
    });

    it("formats session dates with locale", () => {
      const huDate = formatSessionDate("2026-10-27", "hu");
      expect(huDate).toContain("2026");
      expect(huDate).toContain("27");
    });

    it("computes luminance correctly to choose light or dark text", () => {
      const darkCtx = {
        canvas: { width: 100, height: 100 },
        getImageData: () => ({
          data: new Uint8ClampedArray(400).fill(30)
        })
      } as unknown as CanvasRenderingContext2D;
      expect(calculateAreaLuminance(darkCtx, 0, 0, 10, 10)).toBeLessThan(128);

      const brightCtx = {
        canvas: { width: 100, height: 100 },
        getImageData: () => ({
          data: new Uint8ClampedArray(400).fill(240)
        })
      } as unknown as CanvasRenderingContext2D;
      expect(calculateAreaLuminance(brightCtx, 0, 0, 10, 10)).toBeGreaterThan(128);
    });
  });

  describe("Route Privacy and Haversine Math", () => {
    it("accurately calculates Haversine distance between known coordinates", () => {
      // Budapest: Parliament (47.5071, 19.0456) to Chain Bridge (47.4984, 19.0437) ~ 1 km
      const distance = calculateHaversineMeters(47.5071, 19.0456, 47.4984, 19.0437);
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1100);
    });

    it("trims approximately 200m from start and finish for privacy protection", () => {
      // Generate 20 points along a ~2000m route
      const points: OverlayGpsPoint[] = [];
      const baseLat = 47.5000;
      const baseLon = 19.0400;

      for (let i = 0; i < 20; i++) {
        // ~100m per point (~0.0009 deg lat)
        points.push({
          lat: baseLat + i * 0.0009,
          lon: baseLon
        });
      }

      const totalDist = calculateHaversineMeters(
        points[0]!.lat,
        points[0]!.lon,
        points[points.length - 1]!.lat,
        points[points.length - 1]!.lon
      );
      expect(totalDist).toBeGreaterThan(1500);

      const trimmed = trimRoutePrivacy(points, 200);

      // Should have trimmed points from both start and end
      expect(trimmed.length).toBeLessThan(points.length);
      expect(trimmed[0]!.lat).toBeGreaterThan(points[0]!.lat);
      expect(trimmed[trimmed.length - 1]!.lat).toBeLessThan(points[points.length - 1]!.lat);
    });

    it("handles short routes and edge cases gracefully without throwing", () => {
      expect(trimRoutePrivacy([])).toEqual([]);
      const twoPts: OverlayGpsPoint[] = [{ lat: 47.5, lon: 19.0 }, { lat: 47.51, lon: 19.01 }];
      expect(trimRoutePrivacy(twoPts)).toHaveLength(2);
    });
  });

  describe("Safe-Zone Snapping", () => {
    const dimensions = CANVAS_DIMENSIONS["9:16"]; // 1080 x 1920

    it("snaps overlay top edge to top safe zone (250px) within snap threshold", () => {
      const boxHeight = 400;
      // Close to 250 (e.g. 260)
      const res = snapToSafeZones(260, boxHeight, dimensions, 28);
      expect(res.snappedTop).toBe(true);
      expect(res.y).toBe(250);
    });

    it("snaps overlay bottom edge to bottom safe line (1920 - 340 = 1580px)", () => {
      const boxHeight = 300;
      // Bottom at 1570 (y = 1270) -> within 28px of 1580
      const res = snapToSafeZones(1270, boxHeight, dimensions, 28);
      expect(res.snappedBottom).toBe(true);
      expect(res.y).toBe(1580 - boxHeight);
    });

    it("snaps to vertical center of safe zone", () => {
      const boxHeight = 200;
      const safeTop = 250;
      const safeBottom = 1580;
      const safeCenterY = safeTop + (safeBottom - safeTop) / 2; // 915
      const idealY = safeCenterY - boxHeight / 2; // 815

      const res = snapToSafeZones(820, boxHeight, dimensions, 28);
      expect(res.snappedCenter).toBe(true);
      expect(res.y).toBe(idealY);
    });

    it("does not snap when position is outside the threshold", () => {
      const boxHeight = 300;
      const res = snapToSafeZones(500, boxHeight, dimensions, 20);
      expect(res.snappedTop).toBe(false);
      expect(res.snappedBottom).toBe(false);
      expect(res.snappedCenter).toBe(false);
      expect(res.y).toBe(500);
    });
  });

  describe("Smart Defaults per Sport", () => {
    it("maps running, cycling, and strength to correct archetypes", () => {
      expect(getArchetypeForSport("running")).toBe("endurance_running");
      expect(getArchetypeForSport("futas_maraton")).toBe("endurance_running");
      expect(getArchetypeForSport("cycling_road")).toBe("endurance_cycling");
      expect(getArchetypeForSport("strength_hypertrophy")).toBe("strength");
    });

    it("picks initial active metrics tailored to session data and sport", () => {
      const mockSession: CompletedSessionDocument = {
        sessionId: "sess-1",
        athleteId: "ath-1",
        date: "2026-10-27",
        sport: "running",
        title: "10k Tempo Run",
        startTime: "09:00",
        durationMinutes: 48,
        durationSeconds: 2880,
        rpe: 8,
        targetIntensityRpe: 8,
        trainingLoad: 68,
        metrics: {
          distanceMeters: 10000,
          avgHeartRate: 162
        },
        completed: true,
        source: "manual",
        confidence: 0.95,
        createdAt: "2026-10-27T09:00:00Z",
        updatedAt: "2026-10-27T09:00:00Z",
        updatedBy: "ath-1"
      };

      const overlayData = buildOverlayData(mockSession, { isRecord: true, recordTitle: "10K PB" });
      const availableKeys: ShareMetricKey[] = ["sportTitle", "date", "duration", "distance", "paceSpeed", "avgHr", "load", "rpe", "recordBadge"];

      const initial = getInitialActiveMetrics(overlayData, availableKeys);

      expect(initial.has("sportTitle")).toBe(true);
      expect(initial.has("date")).toBe(true);
      expect(initial.has("distance")).toBe(true);
      expect(initial.has("duration")).toBe(true);
      expect(initial.has("recordBadge")).toBe(true);
    });
  });

  describe("Canvas drawOverlay and Edge Cases", () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
        return createMockContext2D(this);
      } as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toDataURL = function (type = "image/png") {
        return `data:${type};base64,mockImageContent`;
      };
      HTMLCanvasElement.prototype.toBlob = function (callback, type = "image/png") {
        callback(new Blob(["mock-binary-data"], { type }));
      };

      canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      ctx = canvas.getContext("2d")!;
    });

    const mockSession: CompletedSessionDocument = {
      sessionId: "sess-manual-edge-case",
      athleteId: "ath-1",
      date: "2026-10-27",
      sport: "strength",
      title: "Leg Day Squats & Mobility Work with a Very Long Title That Needs Ellipsis Truncation",
      startTime: "10:00",
      durationMinutes: 60,
      rpe: 9,
      targetIntensityRpe: 9,
      trainingLoad: 80,
      completed: true,
      source: "manual",
      confidence: 0.95,
      createdAt: "2026-10-27T10:00:00Z",
      updatedAt: "2026-10-27T10:00:00Z",
      updatedBy: "ath-1"
    };

    it("renders compact, stats, and minimal layouts without errors on manual workouts lacking GPS", () => {
      const overlayData = buildOverlayData(mockSession);
      const options: RenderOptions = {
        dimensions: CANVAS_DIMENSIONS["9:16"],
        layout: "compact",
        activeMetrics: ["sportTitle", "date", "duration", "load", "rpe"],
        resolvedTextColor: "light",
        cardBackground: "dark",
        showBranding: true
      };

      // Compact layout
      const box1 = drawOverlay(ctx, "compact", overlayData, options);
      expect(box1.width).toBeGreaterThan(0);
      expect(box1.height).toBeGreaterThan(0);

      // Stats layout
      const box2 = drawOverlay(ctx, "stats", overlayData, { ...options, layout: "stats" });
      expect(box2.width).toBeGreaterThan(0);

      // Minimal layout
      const box3 = drawOverlay(ctx, "minimal", overlayData, { ...options, layout: "minimal" });
      expect(box3.width).toBeGreaterThan(0);

      // Route layout fallback (when session lacks GPS)
      const box4 = drawOverlay(ctx, "route", overlayData, { ...options, layout: "route" });
      expect(box4.width).toBeGreaterThan(0);
    });

    it("renders route layout cleanly when GPS points are present", () => {
      const gpsSession: CompletedSessionDocument = {
        ...mockSession,
        sport: "running",
        timeSeries: {
          points: [
            { timeOffsetSeconds: 0, lat: 47.500, lon: 19.040, heartRate: 140 },
            { timeOffsetSeconds: 100, lat: 47.505, lon: 19.045, heartRate: 155 },
            { timeOffsetSeconds: 200, lat: 47.510, lon: 19.050, heartRate: 165 },
            { timeOffsetSeconds: 300, lat: 47.515, lon: 19.055, heartRate: 170 }
          ]
        }
      };

      const overlayData = buildOverlayData(gpsSession);
      expect(overlayData.hasGps).toBe(true);

      const options: RenderOptions = {
        dimensions: CANVAS_DIMENSIONS["9:16"],
        layout: "route",
        activeMetrics: ["sportTitle", "date", "duration", "distance", "avgHr"],
        resolvedTextColor: "accent",
        cardBackground: "none",
        showBranding: true,
        hideStartEndGps: true
      };

      const box = drawOverlay(ctx, "route", overlayData, options);
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    });

    it("exports session overlay to non-empty Blob and data URL in PNG and JPEG formats", async () => {
      const overlayData = buildOverlayData(mockSession);
      const options: RenderOptions = {
        dimensions: CANVAS_DIMENSIONS["1:1"],
        layout: "compact",
        activeMetrics: ["sportTitle", "date", "duration", "load"],
        resolvedTextColor: "light",
        cardBackground: "none",
        showBranding: true,
        tightCrop: false
      };

      // Mock toBlob and toDataURL if in test environment without full canvas binary implementation
      if (!HTMLCanvasElement.prototype.toBlob) {
        HTMLCanvasElement.prototype.toBlob = function (callback, type = "image/png") {
          callback(new Blob(["mock-binary-data"], { type }));
        };
      }

      const pngResult = await exportSessionImage(overlayData, options, "image/png");
      expect(pngResult.blob).toBeDefined();
      expect(pngResult.blob.type).toBe("image/png");
      expect(pngResult.dataUrl).toContain("data:image/png");
      expect(pngResult.filename).toContain(".png");

      const jpegResult = await exportSessionImage(overlayData, options, "image/jpeg", 0.92);
      expect(jpegResult.blob).toBeDefined();
      expect(jpegResult.filename).toContain(".jpg");
    });

    it("handles tight cropping in sticker mode to crop tightly to content", async () => {
      const overlayData = buildOverlayData(mockSession);
      const options: RenderOptions = {
        dimensions: CANVAS_DIMENSIONS["9:16"],
        layout: "compact",
        activeMetrics: ["sportTitle", "date", "duration"],
        resolvedTextColor: "light",
        cardBackground: "none",
        showBranding: false,
        tightCrop: true
      };

      const result = await exportSessionImage(overlayData, options, "image/png");
      expect(result.blob).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });
  });

  describe("copyImageToClipboard", () => {
    const originalClipboard = navigator.clipboard;
    const originalClipboardItem = globalThis.ClipboardItem;

    beforeEach(() => {
      // Clean mock state
    });

    it("successfully copies image to clipboard using promise-based ClipboardItem", async () => {
      let writtenItems: unknown[] = [];
      const writeMock = vi.fn().mockImplementation(async (items) => {
        writtenItems = items;
      });

      // Mock ClipboardItem constructor
      class MockClipboardItem {
        types: string[];
        items: Record<string, unknown>;
        constructor(items: Record<string, unknown>) {
          this.items = items;
          this.types = Object.keys(items);
        }
      }
      globalThis.ClipboardItem = MockClipboardItem as unknown as typeof ClipboardItem;

      Object.defineProperty(navigator, "clipboard", {
        value: { write: writeMock },
        writable: true,
        configurable: true
      });

      const testBlob = new Blob(["png-data"], { type: "image/png" });
      const result = await copyImageToClipboard(Promise.resolve(testBlob));

      expect(result.copied).toBe(true);
      expect(writeMock).toHaveBeenCalled();
      expect(writtenItems.length).toBe(1);

      // Restore
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        writable: true,
        configurable: true
      });
      globalThis.ClipboardItem = originalClipboardItem;
    });

    it("returns helpful fallback message when Clipboard API is unsupported", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true
      });

      const testBlob = new Blob(["png-data"], { type: "image/png" });
      const result = await copyImageToClipboard(testBlob);

      expect(result.copied).toBe(false);
      expect(result.message).toContain("nem támogatja");

      // Restore
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        writable: true,
        configurable: true
      });
    });

    it("handles touch device context with appropriate advice", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true
      });
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 5,
        writable: true,
        configurable: true
      });

      const testBlob = new Blob(["png-data"], { type: "image/png" });
      const result = await copyImageToClipboard(testBlob);

      expect(result.copied).toBe(false);
      expect(result.isTouch).toBe(true);
      expect(result.message).toContain("Érintőkijelzőn tartsd nyomva");

      // Restore
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        writable: true,
        configurable: true
      });
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: 0,
        writable: true,
        configurable: true
      });
    });
  });
});
