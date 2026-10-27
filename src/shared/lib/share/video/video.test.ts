// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";
import {
  getLiveWorkoutData,
  getHeartRateZone,
  formatTabularDuration,
  formatTabularPace
} from "./liveDataEngine";
import { parseMp4Buffer } from "./mp4MetaParser";
import { getExportDimensions, getSupportedExportMimeType } from "./videoExporter";
import { drawVideoOverlay } from "../overlay/widgets/videoHud";
import { OverlayData } from "../overlay/types";

function createMockContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  return {
    canvas,
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
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
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn()
  } as unknown as CanvasRenderingContext2D;
}

describe("liveDataEngine", () => {
  const samplePoints: SessionTimeSeriesPoint[] = [
    {
      timeOffsetSeconds: 0,
      heartRate: 120,
      speedMps: 5.0, // 18.0 km/h
      distanceMeters: 0,
      elevationMeters: 100,
      lat: 47.4979,
      lon: 19.0402
    },
    {
      timeOffsetSeconds: 10,
      heartRate: 140,
      speedMps: 6.0, // 21.6 km/h
      distanceMeters: 55,
      elevationMeters: 102,
      lat: 47.4985,
      lon: 19.0410
    },
    {
      timeOffsetSeconds: 20,
      heartRate: 160,
      speedMps: 7.0, // 25.2 km/h
      distanceMeters: 120,
      elevationMeters: 105,
      lat: 47.4990,
      lon: 19.0420
    }
  ];

  it("formats tabular duration with zero padding", () => {
    expect(formatTabularDuration(0)).toBe("00:00");
    expect(formatTabularDuration(65)).toBe("01:05");
    expect(formatTabularDuration(3665)).toBe("01:01:05");
  });

  it("formats tabular pace with zero padding", () => {
    expect(formatTabularPace(300)).toBe("05:00");
    expect(formatTabularPace(272)).toBe("04:32");
    expect(formatTabularPace(0)).toBe("--:--");
  });

  it("calculates 5 HR zones accurately", () => {
    // maxHr 200
    // Z1: < 120
    // Z2: 120 - 140
    // Z3: 140 - 160
    // Z4: 160 - 180
    // Z5: >= 180
    expect(getHeartRateZone(110, 200).zone).toBe(1);
    expect(getHeartRateZone(130, 200).zone).toBe(2);
    expect(getHeartRateZone(150, 200).zone).toBe(3);
    expect(getHeartRateZone(170, 200).zone).toBe(4);
    expect(getHeartRateZone(190, 200).zone).toBe(5);
  });

  it("interpolates exactly at point timestamps", () => {
    const data0 = getLiveWorkoutData(samplePoints, 0);
    expect(data0.heartRateFormatted).toBe("120");
    expect(data0.elevationFormatted).toBe("100");
    expect(data0.distanceFormatted).toBe("0.00");

    const data10 = getLiveWorkoutData(samplePoints, 10);
    expect(data10.heartRateFormatted).toBe("140");
    expect(data10.elevationFormatted).toBe("102");
  });

  it("smoothly interpolates between points", () => {
    // Offset 5s is halfway between t=0 (hr 120) and t=10 (hr 140) -> expected 130
    const data5 = getLiveWorkoutData(samplePoints, 5);
    expect(data5.heartRateFormatted).toBe("130");
    expect(data5.rawElevationMeters).toBeCloseTo(101, 1);
    expect(data5.routePointFraction).toBe(0.25); // 5s out of 20s
  });

  it("handles clamp before start and after end gracefully", () => {
    const dataBefore = getLiveWorkoutData(samplePoints, -5);
    expect(dataBefore.heartRateFormatted).toBe("120");

    const dataAfter = getLiveWorkoutData(samplePoints, 50);
    expect(dataAfter.heartRateFormatted).toBe("160");
    expect(dataAfter.routePointFraction).toBe(1.0);
  });

  it("handles empty points array gracefully", () => {
    const dataEmpty = getLiveWorkoutData([], 15);
    expect(dataEmpty.elapsedTimeFormatted).toBe("00:15");
    expect(dataEmpty.speedFormatted).toBeUndefined();
    expect(dataEmpty.heartRateFormatted).toBeUndefined();
  });
});

describe("mp4MetaParser", () => {
  it("returns default values for empty or non-mp4 buffer without crashing", () => {
    const buffer = new ArrayBuffer(64);
    const meta = parseMp4Buffer(buffer);
    expect(meta.creationDate).toBeUndefined();
    expect(meta.rotation).toBe(0);
  });

  it("parses QuickTime mvhd creation time correctly", () => {
    // Construct a minimal ISO BMFF buffer with 'moov' and 'mvhd'
    // moov box: 4 bytes size, 4 bytes 'moov'
    // mvhd box: 4 bytes size, 4 bytes 'mvhd', 1 byte version (0), 3 bytes flags, 4 bytes creation_time, 4 bytes mod_time, 4 bytes timescale, 4 bytes duration
    const buffer = new ArrayBuffer(120);
    const view = new DataView(buffer);

    // Box 1: moov (size: 120)
    view.setUint32(0, 120);
    view.setUint8(4, "m".charCodeAt(0));
    view.setUint8(5, "o".charCodeAt(0));
    view.setUint8(6, "o".charCodeAt(0));
    view.setUint8(7, "v".charCodeAt(0));

    // Box 2: mvhd inside moov (at offset 8, size: 40)
    view.setUint32(8, 40);
    view.setUint8(12, "m".charCodeAt(0));
    view.setUint8(13, "v".charCodeAt(0));
    view.setUint8(14, "h".charCodeAt(0));
    view.setUint8(15, "d".charCodeAt(0));
    view.setUint8(16, 0); // version 0

    // QuickTime creation time: 2082844800 (1970-01-01) + 1700000000 seconds
    const targetUnixSec = 1710000000;
    const qtTime = 2082844800 + targetUnixSec;
    view.setUint32(20, qtTime); // creation_time at offset 20
    view.setUint32(28, 1000); // timescale
    view.setUint32(32, 60000); // duration (60s)

    const meta = parseMp4Buffer(buffer);
    expect(meta.creationDate).toBeDefined();
    expect(meta.creationDate?.getTime()).toBe(targetUnixSec * 1000);
    expect(meta.duration).toBe(60);
  });
});

describe("videoExporter dimensions and format", () => {
  it("computes 9:16 export dimensions correctly", () => {
    const dim1080 = getExportDimensions(1920, 1080, "1080p", "9:16");
    expect(dim1080.width).toBe(1080);
    expect(dim1080.height).toBe(1920);

    const dim720 = getExportDimensions(1920, 1080, "720p", "9:16");
    expect(dim720.width).toBe(720);
    expect(dim720.height).toBe(1280);
  });

  it("preserves aspect ratio for original framing with even dimensions", () => {
    const dimLandscape = getExportDimensions(1920, 1080, "1080p", "original");
    expect(dimLandscape.width).toBe(1920);
    expect(dimLandscape.height).toBe(1080);
    // Must be even
    expect(dimLandscape.width % 2).toBe(0);
    expect(dimLandscape.height % 2).toBe(0);
  });

  it("returns fallback mime type when MediaRecorder is undefined or mocked", () => {
    const res = getSupportedExportMimeType("video/mp4");
    expect(["mp4", "webm"]).toContain(res.extension);
  });
});

describe("drawVideoOverlay", () => {
  let ctx: CanvasRenderingContext2D;

  const sampleOverlayData: OverlayData = {
    sportId: "running",
    sportName: "Futás",
    title: "Reggeli Duna-parti futás",
    dateFormatted: "2026. okt. 27.",
    hasGps: true,
    metrics: [
      { key: "distance", label: "Távolság", value: "10.5", unit: "km" },
      { key: "duration", label: "Időtartam", value: "48:20" },
      { key: "avgHr", label: "Átlagpulzus", value: "152", unit: "bpm" }
    ],
    routePoints: [
      { lat: 47.49, lon: 19.04 },
      { lat: 47.50, lon: 19.05 }
    ]
  };

  const sampleLiveData = {
    timeOffsetSec: 30,
    speedFormatted: "12.4",
    speedUnit: "km/h",
    heartRateFormatted: "154",
    heartRateZone: { zone: 3 as const, name: "Z3 Tempó", color: "#facc15", minHr: 140, maxHr: 160 },
    distanceFormatted: "1.25",
    distanceUnit: "km",
    elapsedTimeFormatted: "00:05:30",
    gradeFormatted: "+2.5%",
    routePointFraction: 0.2
  };

  const sampleMetrics = {
    speedPace: true,
    heartRate: true,
    distance: true,
    elapsedTime: true,
    elevation: true,
    grade: true,
    power: true,
    cadence: true,
    routeDot: true,
    elevationDot: true
  };

  beforeEach(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    ctx = createMockContext2D(canvas);
  });

  it("renders bottom_bar layout without errors", () => {
    expect(() => {
      drawVideoOverlay(ctx, {
        dimensions: { width: 1080, height: 1920, aspectRatio: "9:16" },
        layout: "bottom_bar",
        liveData: sampleLiveData,
        overlayData: sampleOverlayData,
        metrics: sampleMetrics,
        videoTimeSec: 10,
        clipDurationSec: 60,
        introCard: false,
        outroCard: false,
        dimming: 0.3,
        showBranding: true
      });
    }).not.toThrow();
  });

  it("renders corner layout without errors", () => {
    expect(() => {
      drawVideoOverlay(ctx, {
        dimensions: { width: 1080, height: 1920, aspectRatio: "9:16" },
        layout: "corner",
        liveData: sampleLiveData,
        overlayData: sampleOverlayData,
        metrics: sampleMetrics,
        videoTimeSec: 10,
        clipDurationSec: 60,
        introCard: false,
        outroCard: false,
        dimming: 0.3,
        showBranding: true
      });
    }).not.toThrow();
  });

  it("renders minimal layout without errors", () => {
    expect(() => {
      drawVideoOverlay(ctx, {
        dimensions: { width: 1080, height: 1920, aspectRatio: "9:16" },
        layout: "minimal",
        liveData: sampleLiveData,
        overlayData: sampleOverlayData,
        metrics: sampleMetrics,
        videoTimeSec: 10,
        clipDurationSec: 60,
        introCard: false,
        outroCard: false,
        dimming: 0,
        showBranding: false
      });
    }).not.toThrow();
  });

  it("renders race layout with moving route dot without errors", () => {
    expect(() => {
      drawVideoOverlay(ctx, {
        dimensions: { width: 1080, height: 1920, aspectRatio: "9:16" },
        layout: "race",
        liveData: sampleLiveData,
        overlayData: sampleOverlayData,
        metrics: sampleMetrics,
        videoTimeSec: 10,
        clipDurationSec: 60,
        introCard: false,
        outroCard: false,
        dimming: 0.3,
        showBranding: true
      });
    }).not.toThrow();
  });

  it("renders intro card in first 1.5s and outro card in last 2.0s without errors", () => {
    // Intro card
    expect(() => {
      drawVideoOverlay(ctx, {
        dimensions: { width: 1080, height: 1920, aspectRatio: "9:16" },
        layout: "bottom_bar",
        liveData: sampleLiveData,
        overlayData: sampleOverlayData,
        metrics: sampleMetrics,
        videoTimeSec: 0.5,
        clipDurationSec: 30,
        introCard: true,
        outroCard: true,
        dimming: 0.3,
        showBranding: true
      });
    }).not.toThrow();

    // Outro card
    expect(() => {
      drawVideoOverlay(ctx, {
        dimensions: { width: 1080, height: 1920, aspectRatio: "9:16" },
        layout: "bottom_bar",
        liveData: sampleLiveData,
        overlayData: sampleOverlayData,
        metrics: sampleMetrics,
        videoTimeSec: 29.5,
        clipDurationSec: 30,
        introCard: true,
        outroCard: true,
        dimming: 0.3,
        showBranding: true
      });
    }).not.toThrow();
  });
});
