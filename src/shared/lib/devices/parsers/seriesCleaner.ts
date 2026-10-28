/**
 * TIME SERIES CLEANING & VALIDATION PIPELINE
 *
 * Cleans raw biometric and sensor series (FIT, TCX, GPX):
 * - Drops impossible values (HR: 0, 255, spikes > 240 bpm, sudden unphysiological jumps)
 * - Identifies sensor dropouts, pauses, and gaps
 * - Provides lightly smoothed series for visual charts while preserving raw data for metrics
 * - Computes clean summary statistics (avg, max, valid point ratio)
 * - Generates clear Hungarian warnings for user preview
 */

import { SessionTimeSeriesPoint } from "@shared/types/dataModel";

export interface SeriesCleaningReport {
  totalPoints: number;
  validHrPoints: number;
  hrDropoutCount: number;
  hrGaps: Array<{ fromSecond: number; toSecond: number; durationSeconds: number }>;
  cleanedAvgHr?: number;
  cleanedMaxHr?: number;
  hasSpeed: boolean;
  hasPower: boolean;
  hasCadence: boolean;
  hasElevation: boolean;
  hasGps: boolean;
  warningsHu: string[];
}

export interface CleanedTimeSeriesResult {
  cleanedPoints: SessionTimeSeriesPoint[];
  smoothedPoints: SessionTimeSeriesPoint[];
  report: SeriesCleaningReport;
}

/**
 * Validates and cleans raw time series points from an activity file.
 */
export function cleanTimeSeries(points: SessionTimeSeriesPoint[]): CleanedTimeSeriesResult {
  if (!points || points.length === 0) {
    return {
      cleanedPoints: [],
      smoothedPoints: [],
      report: {
        totalPoints: 0,
        validHrPoints: 0,
        hrDropoutCount: 0,
        hrGaps: [],
        hasSpeed: false,
        hasPower: false,
        hasCadence: false,
        hasElevation: false,
        hasGps: false,
        warningsHu: ["A fájl nem tartalmaz mérési pontokat."]
      }
    };
  }

  const warningsHu: string[] = [];
  let validHrSum = 0;
  let validHrCount = 0;
  let cleanedMaxHr = 0;
  let hrDropoutCount = 0;
  const hrGaps: Array<{ fromSecond: number; toSecond: number; durationSeconds: number }> = [];

  let speedPointsCount = 0;
  let powerPointsCount = 0;
  let cadencePointsCount = 0;
  let elevationPointsCount = 0;
  let gpsPointsCount = 0;

  const cleanedPoints: SessionTimeSeriesPoint[] = [];

  // 1. First pass: clean invalid sensor values and unphysiological spikes
  let lastValidHr: number | undefined;
  let inGap = false;
  let gapStartSecond = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    const offset = pt.timeOffsetSeconds ?? i;

    // Heart rate cleaning
    let cleanHr: number | undefined = undefined;
    if (typeof pt.heartRate === "number") {
      const rawHr = pt.heartRate;
      // 255 is FIT uint8 invalid/null value. 0 is sensor dropout.
      if (rawHr > 35 && rawHr <= 235 && rawHr !== 255) {
        // Spike check: if HR jumps more than 30 bpm in 1 second, it's sensor noise
        if (lastValidHr !== undefined && Math.abs(rawHr - lastValidHr) > 30) {
          hrDropoutCount++;
          cleanHr = lastValidHr; // Clamped to previous valid
        } else {
          cleanHr = rawHr;
          lastValidHr = rawHr;
        }

        validHrSum += cleanHr;
        validHrCount++;
        if (cleanHr > cleanedMaxHr) cleanedMaxHr = cleanHr;

        if (inGap) {
          const gapDuration = offset - gapStartSecond;
          if (gapDuration >= 10) {
            hrGaps.push({ fromSecond: gapStartSecond, toSecond: offset, durationSeconds: gapDuration });
          }
          inGap = false;
        }
      } else {
        hrDropoutCount++;
        if (!inGap) {
          inGap = true;
          gapStartSecond = offset;
        }
      }
    } else {
      if (!inGap) {
        inGap = true;
        gapStartSecond = offset;
      }
    }

    // Speed cleaning (m/s)
    let cleanSpeed = pt.speedMps;
    if (typeof cleanSpeed === "number") {
      // Speeds > 45 m/s (~162 km/h) are GPS anomalies for human powered sports
      if (cleanSpeed >= 0 && cleanSpeed < 45) {
        speedPointsCount++;
      } else {
        cleanSpeed = undefined;
      }
    }

    // Power cleaning (Watts)
    let cleanPower = pt.powerWatts;
    if (typeof cleanPower === "number") {
      if (cleanPower >= 0 && cleanPower < 3000 && cleanPower !== 65535) {
        powerPointsCount++;
      } else {
        cleanPower = undefined;
      }
    }

    // Cadence cleaning (rpm)
    let cleanCadence = pt.cadence;
    if (typeof cleanCadence === "number") {
      if (cleanCadence >= 0 && cleanCadence <= 250 && cleanCadence !== 255) {
        cadencePointsCount++;
      } else {
        cleanCadence = undefined;
      }
    }

    // Elevation cleaning (meters)
    let cleanElevation = pt.elevationMeters;
    if (typeof cleanElevation === "number") {
      if (cleanElevation > -500 && cleanElevation < 9000) {
        elevationPointsCount++;
      } else {
        cleanElevation = undefined;
      }
    }

    // GPS coordinate cleaning
    let cleanLat = pt.lat;
    let cleanLon = pt.lon;
    if (typeof cleanLat === "number" && typeof cleanLon === "number") {
      if (Math.abs(cleanLat) <= 90 && Math.abs(cleanLon) <= 180 && (cleanLat !== 0 || cleanLon !== 0)) {
        gpsPointsCount++;
      } else {
        cleanLat = undefined;
        cleanLon = undefined;
      }
    }

    cleanedPoints.push({
      ...pt,
      timeOffsetSeconds: offset,
      heartRate: cleanHr,
      speedMps: cleanSpeed,
      powerWatts: cleanPower,
      cadence: cleanCadence,
      elevationMeters: cleanElevation,
      lat: cleanLat,
      lon: cleanLon
    });
  }

  // Close trailing gap if open
  if (inGap && points.length > 0) {
    const lastOffset = points[points.length - 1]!.timeOffsetSeconds ?? points.length;
    const gapDuration = lastOffset - gapStartSecond;
    if (gapDuration >= 10) {
      hrGaps.push({ fromSecond: gapStartSecond, toSecond: lastOffset, durationSeconds: gapDuration });
    }
  }

  // 2. Light smoothing pass for visual charts (3-point moving median)
  const smoothedPoints: SessionTimeSeriesPoint[] = cleanedPoints.map((pt, idx, arr) => {
    let smoothedHr = pt.heartRate;
    if (typeof smoothedHr === "number" && idx > 0 && idx < arr.length - 1) {
      const pPrev = arr[idx - 1]?.heartRate;
      const pNext = arr[idx + 1]?.heartRate;
      if (typeof pPrev === "number" && typeof pNext === "number") {
        const trio = [pPrev, smoothedHr, pNext].sort((a, b) => a - b);
        smoothedHr = trio[1]; // Median of 3
      }
    }

    let smoothedSpeed = pt.speedMps;
    if (typeof smoothedSpeed === "number" && idx > 0 && idx < arr.length - 1) {
      const sPrev = arr[idx - 1]?.speedMps;
      const sNext = arr[idx + 1]?.speedMps;
      if (typeof sPrev === "number" && typeof sNext === "number") {
        smoothedSpeed = +( (sPrev + smoothedSpeed + sNext) / 3 ).toFixed(2);
      }
    }

    return {
      ...pt,
      heartRate: smoothedHr,
      speedMps: smoothedSpeed
    };
  });

  // 3. Compile warnings in plain Hungarian
  const hasSpeed = speedPointsCount > 0;
  const hasPower = powerPointsCount > 0;
  const hasCadence = cadencePointsCount > 0;
  const hasElevation = elevationPointsCount > 0;
  const hasGps = gpsPointsCount > 0;

  if (validHrCount === 0) {
    warningsHu.push("Ehhez az edzéshez nem található pulzusadat.");
  } else {
    // Gap warnings
    if (hrGaps.length > 0) {
      const topGap = hrGaps[0]!;
      const fromMin = Math.floor(topGap.fromSecond / 60);
      const toMin = Math.ceil(topGap.toSecond / 60);
      if (fromMin !== toMin) {
        warningsHu.push(`Pulzusadat hiányos a ${fromMin}. és ${toMin}. perc között (${Math.round(topGap.durationSeconds)} mp kiesés).`);
      } else {
        warningsHu.push(`Rövid pulzuskiesés érzékelve a ${fromMin}. percnél.`);
      }
    }
    if (hrDropoutCount > 0) {
      warningsHu.push(`Pulzuskiesés vagy hibás érték érzékelve ${hrDropoutCount} mérési ponton.`);
    }
  }

  if (!hasSpeed && !hasGps) {
    warningsHu.push("Ehhez az edzéshez nincs sebesség- vagy GPS-adat (beltéri vagy szenzornélküli rögzítés).");
  }

  const cleanedAvgHr = validHrCount > 0 ? Math.round(validHrSum / validHrCount) : undefined;

  return {
    cleanedPoints,
    smoothedPoints,
    report: {
      totalPoints: points.length,
      validHrPoints: validHrCount,
      hrDropoutCount,
      hrGaps,
      cleanedAvgHr,
      cleanedMaxHr: cleanedMaxHr > 0 ? cleanedMaxHr : undefined,
      hasSpeed,
      hasPower,
      hasCadence,
      hasElevation,
      hasGps,
      warningsHu
    }
  };
}
