import { describe, it, expect } from "vitest";
import { cleanTimeSeries } from "./seriesCleaner";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";

describe("Series Cleaner & Quality Validation Suite", () => {
  it("drops impossible heart rate values (0, 255, and spikes > 30 bpm jump)", () => {
    const rawPoints: SessionTimeSeriesPoint[] = [
      { timeOffsetSeconds: 0, heartRate: 140 },
      { timeOffsetSeconds: 1, heartRate: 142 },
      { timeOffsetSeconds: 2, heartRate: 0 },    // Dropout (sensor lost contact)
      { timeOffsetSeconds: 3, heartRate: 255 },  // FIT invalid uint8 marker
      { timeOffsetSeconds: 4, heartRate: 0 },    // Dropout
      { timeOffsetSeconds: 5, heartRate: 144 },  // Normal again
      { timeOffsetSeconds: 6, heartRate: 220 },  // Spike (> 30 bpm jump from 144)
      { timeOffsetSeconds: 7, heartRate: 146 }
    ];

    const result = cleanTimeSeries(rawPoints);
    const cleanedHr = result.cleanedPoints.map((p) => p.heartRate);

    // Expect valid point count
    expect(result.report.validHrPoints).toBe(5);
    // Dropout / spike points detected
    expect(result.report.hrDropoutCount).toBe(4);
    // Values at indices 2 and 3 should not be 0 or 255
    expect(cleanedHr[2]).toBeUndefined();
    expect(cleanedHr[3]).toBeUndefined();
    // Index 6 spike was clamped to previous valid (144)
    expect(cleanedHr[6]).toBe(144);
    // Hungarian warning about dropouts generated
    expect(result.report.warningsHu.some((w) => w.includes("kiesés") || w.includes("pulzus"))).toBe(true);
  });

  it("detects channel presence correctly (speed, power, cadence, elevation, gps)", () => {
    const pointsWithAllChannels: SessionTimeSeriesPoint[] = [
      {
        timeOffsetSeconds: 0,
        heartRate: 135,
        speedMps: 3.2,
        powerWatts: 210,
        cadence: 88,
        elevationMeters: 150,
        lat: 47.5,
        lon: 19.0
      },
      {
        timeOffsetSeconds: 1,
        heartRate: 136,
        speedMps: 3.3,
        powerWatts: 215,
        cadence: 89,
        elevationMeters: 151,
        lat: 47.5001,
        lon: 19.0001
      }
    ];

    const result = cleanTimeSeries(pointsWithAllChannels);
    expect(result.report.hasSpeed).toBe(true);
    expect(result.report.hasPower).toBe(true);
    expect(result.report.hasCadence).toBe(true);
    expect(result.report.hasElevation).toBe(true);
    expect(result.report.hasGps).toBe(true);
    expect(result.report.warningsHu).toHaveLength(0);
  });

  it("generates clear Hungarian warning when speed is missing", () => {
    const indoorPoints: SessionTimeSeriesPoint[] = [
      { timeOffsetSeconds: 0, heartRate: 120 },
      { timeOffsetSeconds: 10, heartRate: 125 }
    ];

    const result = cleanTimeSeries(indoorPoints);
    expect(result.report.hasSpeed).toBe(false);
    expect(result.report.hasGps).toBe(false);
    expect(result.report.warningsHu.some((w) => w.includes("sebesség"))).toBe(true);
  });

  it("smooths visual series with median smoothing without altering raw peak values", () => {
    const noisyPoints: SessionTimeSeriesPoint[] = [
      { timeOffsetSeconds: 0, heartRate: 140 },
      { timeOffsetSeconds: 1, heartRate: 150 },
      { timeOffsetSeconds: 2, heartRate: 142 }
    ];

    const result = cleanTimeSeries(noisyPoints);
    expect(result.smoothedPoints).toHaveLength(3);
    // Median of [140, 150, 142] is 142
    expect(result.smoothedPoints[1]!.heartRate).toBe(142);
    // But original cleaned points preserved 150
    expect(result.cleanedPoints[1]!.heartRate).toBe(150);
  });
});
