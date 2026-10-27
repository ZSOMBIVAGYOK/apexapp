import { SessionTimeSeriesPoint } from "@shared/types/dataModel";
import { HeartRateZoneInfo, LiveWorkoutData } from "./types";

export interface LiveEngineOptions {
  isPaceSport?: boolean; // running, swimming, rowing -> pace (min/km); cycling -> speed (km/h)
  userMaxHr?: number;
  units?: "metric" | "imperial";
}

/**
 * Standard 5-Zone HR model calculator
 */
export function getHeartRateZone(hr: number, maxHr = 190): HeartRateZoneInfo {
  const safeMax = Math.max(100, maxHr);
  const ratio = hr / safeMax;

  if (ratio < 0.6) {
    return {
      zone: 1,
      name: "Z1 Regeneráció",
      color: "#60a5fa", // soft blue
      minHr: Math.round(safeMax * 0.5),
      maxHr: Math.round(safeMax * 0.6)
    };
  }
  if (ratio < 0.7) {
    return {
      zone: 2,
      name: "Z2 Állóképesség",
      color: "#34d399", // emerald green
      minHr: Math.round(safeMax * 0.6),
      maxHr: Math.round(safeMax * 0.7)
    };
  }
  if (ratio < 0.8) {
    return {
      zone: 3,
      name: "Z3 Tempó",
      color: "#facc15", // warm yellow
      minHr: Math.round(safeMax * 0.7),
      maxHr: Math.round(safeMax * 0.8)
    };
  }
  if (ratio < 0.9) {
    return {
      zone: 4,
      name: "Z4 Küszöb",
      color: "#fb923c", // orange
      minHr: Math.round(safeMax * 0.8),
      maxHr: Math.round(safeMax * 0.9)
    };
  }
  return {
    zone: 5,
    name: "Z5 Maximális",
    color: "#ef4444", // red
    minHr: Math.round(safeMax * 0.9),
    maxHr: safeMax
  };
}

/**
 * Binary search to find index i such that points[i].timeOffsetSeconds <= targetSec < points[i+1].timeOffsetSeconds
 */
function findBoundingIndices(
  points: SessionTimeSeriesPoint[],
  targetSec: number
): { i0: number; i1: number; alpha: number } {
  const len = points.length;
  if (len === 0) return { i0: -1, i1: -1, alpha: 0 };
  if (len === 1) return { i0: 0, i1: 0, alpha: 0 };

  const firstT = points[0]!.timeOffsetSeconds;
  const lastT = points[len - 1]!.timeOffsetSeconds;

  if (targetSec <= firstT) {
    return { i0: 0, i1: 0, alpha: 0 };
  }
  if (targetSec >= lastT) {
    return { i0: len - 1, i1: len - 1, alpha: 0 };
  }

  let low = 0;
  let high = len - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midT = points[mid]!.timeOffsetSeconds;

    if (midT <= targetSec) {
      if (mid === len - 1 || points[mid + 1]!.timeOffsetSeconds > targetSec) {
        const t0 = midT;
        const t1 = points[mid + 1]!.timeOffsetSeconds;
        const alpha = t1 > t0 ? (targetSec - t0) / (t1 - t0) : 0;
        return { i0: mid, i1: mid + 1, alpha: Math.min(1, Math.max(0, alpha)) };
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return { i0: 0, i1: 0, alpha: 0 };
}

/**
 * Format elapsed time as HH:MM:SS or MM:SS with strict tabular digits
 */
export function formatTabularDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  const mm = mins.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");

  if (hrs > 0) {
    const hh = hrs.toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format pace as MM:SS /km with zero padding
 */
export function formatTabularPace(paceSecPerKm: number): string {
  if (!Number.isFinite(paceSecPerKm) || paceSecPerKm <= 0 || paceSecPerKm > 1800) {
    return "--:--";
  }
  const mins = Math.floor(paceSecPerKm / 60);
  const secs = Math.floor(paceSecPerKm % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Extract smoothly interpolated, jitter-free live workout metrics at a specific offset.
 */
export function getLiveWorkoutData(
  points: SessionTimeSeriesPoint[],
  timeOffsetSec: number,
  options: LiveEngineOptions = {}
): LiveWorkoutData {
  const { isPaceSport = false, userMaxHr = 190, units = "metric" } = options;

  if (!points || points.length === 0) {
    return {
      timeOffsetSec,
      elapsedTimeFormatted: formatTabularDuration(timeOffsetSec)
    };
  }

  const { i0, i1, alpha } = findBoundingIndices(points, timeOffsetSec);
  const p0 = points[i0]!;
  const p1 = points[i1]!;

  const lerp = (v0: number | undefined, v1: number | undefined): number | undefined => {
    if (typeof v0 !== "number" && typeof v1 !== "number") return undefined;
    if (typeof v0 !== "number") return v1;
    if (typeof v1 !== "number") return v0;
    return v0 + (v1 - v0) * alpha;
  };

  // Interpolated raw values
  const rawHeartRate = lerp(p0.heartRate, p1.heartRate);
  const rawPowerWatts = lerp(p0.powerWatts, p1.powerWatts);
  const rawElevationMeters = lerp(p0.elevationMeters, p1.elevationMeters);
  const rawDistanceMeters = lerp(p0.distanceMeters, p1.distanceMeters);
  const rawLat = lerp(p0.lat, p1.lat);
  const rawLon = lerp(p0.lon, p1.lon);

  // Speed with 3-point moving average smoothing
  let smoothedSpeedMps: number | undefined;
  if (typeof p0.speedMps === "number" || typeof p1.speedMps === "number") {
    const rawSpeed = lerp(p0.speedMps, p1.speedMps) ?? 0;
    // Window smoothing: average with adjacent indices if available
    const prevSpeed = i0 > 0 ? points[i0 - 1]?.speedMps : undefined;
    const nextSpeed = i1 < points.length - 1 ? points[i1 + 1]?.speedMps : undefined;

    let sum = rawSpeed;
    let count = 1;
    if (typeof prevSpeed === "number") {
      sum += prevSpeed;
      count++;
    }
    if (typeof nextSpeed === "number") {
      sum += nextSpeed;
      count++;
    }
    smoothedSpeedMps = sum / count;
  }

  // Calculate Grade (% = delta_elev / delta_dist * 100)
  let rawGradePercent: number | undefined;
  const gradeLookback = Math.max(0, i0 - 2);
  const gradeLookahead = Math.min(points.length - 1, i1 + 2);
  const pBack = points[gradeLookback];
  const pAhead = points[gradeLookahead];
  if (
    pBack &&
    pAhead &&
    typeof pAhead.elevationMeters === "number" &&
    typeof pBack.elevationMeters === "number" &&
    typeof pAhead.distanceMeters === "number" &&
    typeof pBack.distanceMeters === "number"
  ) {
    const dDist = pAhead.distanceMeters - pBack.distanceMeters;
    const dElev = pAhead.elevationMeters - pBack.elevationMeters;
    if (dDist > 15) {
      const g = (dElev / dDist) * 100;
      // Clamp to reasonable road/trail grade (-30% to +30%)
      rawGradePercent = Math.max(-30, Math.min(30, g));
    }
  }

  // Formatted representations
  const result: LiveWorkoutData = {
    timeOffsetSec,
    elapsedTimeFormatted: formatTabularDuration(timeOffsetSec),
    rawHeartRate,
    rawPowerWatts,
    rawElevationMeters,
    rawDistanceMeters,
    rawSpeedMps: smoothedSpeedMps,
    rawGradePercent,
    currentLat: rawLat,
    currentLon: rawLon
  };

  // 1. Heart Rate & Zones
  if (typeof rawHeartRate === "number" && rawHeartRate > 0) {
    const roundedHr = Math.round(rawHeartRate);
    result.heartRateFormatted = roundedHr.toString();
    result.heartRateZone = getHeartRateZone(roundedHr, userMaxHr);
  }

  // 2. Speed / Pace
  if (typeof smoothedSpeedMps === "number" && smoothedSpeedMps > 0.1) {
    if (isPaceSport) {
      // Pace: seconds per km
      const paceSec = 1000 / smoothedSpeedMps;
      result.paceFormatted = formatTabularPace(paceSec);
      result.paceUnit = units === "imperial" ? "/mi" : "/km";
    } else {
      // Speed in km/h or mph
      const kmh = smoothedSpeedMps * 3.6;
      const speedVal = units === "imperial" ? kmh * 0.621371 : kmh;
      result.speedFormatted = speedVal.toFixed(1);
      result.speedUnit = units === "imperial" ? "mph" : "km/h";
    }
  } else if (typeof p0.paceSecondsPerKm === "number" || typeof p1.paceSecondsPerKm === "number") {
    const interpolatedPace = lerp(p0.paceSecondsPerKm, p1.paceSecondsPerKm) ?? 0;
    result.paceFormatted = formatTabularPace(interpolatedPace);
    result.paceUnit = "/km";
  }

  // 3. Distance
  if (typeof rawDistanceMeters === "number") {
    const distKm = rawDistanceMeters / 1000;
    const displayDist = units === "imperial" ? distKm * 0.621371 : distKm;
    result.distanceFormatted = displayDist.toFixed(2);
    result.distanceUnit = units === "imperial" ? "mi" : "km";
  }

  // 4. Elevation
  if (typeof rawElevationMeters === "number") {
    const elev = units === "imperial" ? rawElevationMeters * 3.28084 : rawElevationMeters;
    result.elevationFormatted = Math.round(elev).toString();
    result.elevationUnit = units === "imperial" ? "ft" : "m";
  }

  // 5. Grade
  if (typeof rawGradePercent === "number") {
    const sign = rawGradePercent > 0 ? "+" : "";
    result.gradeFormatted = `${sign}${rawGradePercent.toFixed(1)}%`;
  }

  // 6. Power
  if (typeof rawPowerWatts === "number" && rawPowerWatts > 0) {
    result.powerFormatted = Math.round(rawPowerWatts).toString();
    result.powerUnit = "W";
  }

  // 7. Route & Elevation dot progress (fraction 0..1)
  const totalDuration = points[points.length - 1]!.timeOffsetSeconds;
  const fraction = totalDuration > 0 ? Math.min(1, Math.max(0, timeOffsetSec / totalDuration)) : 0;
  result.routePointFraction = fraction;
  result.routePointIndex = i0;

  return result;
}
