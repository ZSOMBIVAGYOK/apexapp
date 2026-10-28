import { describe, it, expect } from "vitest";
import { lttbDownsample, downsampleSessionTimeSeries } from "./lttb";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";

describe("LTTB Downsampling Algorithm Suite", () => {
  it("preserves start and end points and downsamples to exact target count", () => {
    const rawData = Array.from({ length: 1000 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 10) * 50 + 100
    }));

    const target = 100;
    const sampled = lttbDownsample(rawData, target);

    expect(sampled).toHaveLength(target);
    expect(sampled[0]!.x).toBe(0);
    expect(sampled[sampled.length - 1]!.x).toBe(999);
  });

  it("preserves prominent local extrema (peaks and troughs)", () => {
    // Flat baseline with a sharp spike
    const points: Array<{ x: number; y: number }> = Array.from({ length: 500 }, (_, i) => ({
      x: i,
      y: 100
    }));

    // Insert sharp spike at x = 250
    points[250]!.y = 210;

    const sampled = lttbDownsample(points, 50);

    // The peak at 210 must be preserved
    const peakPoint = sampled.find((p) => p.y === 210);
    expect(peakPoint).toBeDefined();
    expect(peakPoint?.x).toBe(250);
  });

  it("downsamples session time-series points preserving HR surges", () => {
    const sessionPoints: SessionTimeSeriesPoint[] = Array.from({ length: 800 }, (_, i) => ({
      timeOffsetSeconds: i,
      heartRate: 130 + (i % 20),
      speedMps: 3.5,
      powerWatts: 200
    }));

    // Sprint surge at second 400
    sessionPoints[400]!.heartRate = 188;

    const downsampled = downsampleSessionTimeSeries(sessionPoints, 200);
    expect(downsampled).toHaveLength(200);

    // Peak HR 188 must be retained in the sampled series
    const hasMaxHr = downsampled.some((p) => p.heartRate === 188);
    expect(hasMaxHr).toBe(true);
  });

  it("returns original array safely if points <= targetCount", () => {
    const fewPoints: SessionTimeSeriesPoint[] = [
      { timeOffsetSeconds: 0, heartRate: 120 },
      { timeOffsetSeconds: 10, heartRate: 130 }
    ];
    expect(downsampleSessionTimeSeries(fewPoints, 100)).toHaveLength(2);
    expect(downsampleSessionTimeSeries([], 100)).toHaveLength(0);
  });
});
