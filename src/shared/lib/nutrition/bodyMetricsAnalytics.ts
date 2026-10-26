/**
 * Body Metrics Analytics & 7-Day Moving Average Smoothing
 *
 * Daily athlete body mass fluctuates by 1-3 kg due to glycogen hydration
 * (1g glycogen binds ~3-4g water), fluid shifts, salt intake, and digestive transit.
 * A 7-day rolling moving average provides a calm, noise-filtered trend of true tissue changes.
 */

import { BodyMetricEntry } from "@shared/types/nutrition";

export interface SmoothedMetricPoint {
  date: string;
  weightKg: number;
  smoothedWeightKg: number;
  bodyFatPct?: number;
  smoothedBodyFatPct?: number;
  muscleMassKg?: number;
  waistCm?: number;
}

/**
 * Computes 7-day trailing moving average for weight and body composition.
 * Input array does not need to be pre-sorted (function sorts chronologically).
 */
export function calculateSmoothedBodyMetrics(
  entries: BodyMetricEntry[]
): SmoothedMetricPoint[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  // Sort ascending by date
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const results: SmoothedMetricPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;

    // Trailing 7-day window (up to 7 prior days including current day)
    const windowStart = Math.max(0, i - 6);
    const windowSlice = sorted.slice(windowStart, i + 1);

    // Calculate weight average
    const weightSum = windowSlice.reduce((sum, item) => sum + item.weightKg, 0);
    const smoothedWeight = Math.round((weightSum / windowSlice.length) * 10) / 10;

    // Calculate body fat average if available
    const bodyFatItems = windowSlice.filter(
      (item) => typeof item.bodyFatPct === "number" && item.bodyFatPct > 0
    );
    let smoothedBodyFat: number | undefined = undefined;
    if (bodyFatItems.length > 0) {
      const bfSum = bodyFatItems.reduce((sum, item) => sum + item.bodyFatPct!, 0);
      smoothedBodyFat = Math.round((bfSum / bodyFatItems.length) * 10) / 10;
    }

    results.push({
      date: current.date,
      weightKg: Math.round(current.weightKg * 10) / 10,
      smoothedWeightKg: smoothedWeight,
      bodyFatPct: current.bodyFatPct,
      smoothedBodyFatPct: smoothedBodyFat,
      muscleMassKg: current.muscleMassKg,
      waistCm: current.waistCm
    });
  }

  return results;
}

/**
 * Calculates rate of weight change (kg / week) over the last 14 to 28 days using smoothed values.
 */
export function calculateWeeklyWeightChangeRate(
  smoothedPoints: SmoothedMetricPoint[]
): {
  weeklyRateKg: number;
  trend: "gaining" | "losing" | "stable";
  daysAnalyzed: number;
} {
  if (smoothedPoints.length < 2) {
    return { weeklyRateKg: 0, trend: "stable", daysAnalyzed: smoothedPoints.length };
  }

  const latest = smoothedPoints[smoothedPoints.length - 1]!;
  // Compare to ~14 days ago or earliest available point
  const lookbackIndex = Math.max(0, smoothedPoints.length - 14);
  const baseline = smoothedPoints[lookbackIndex]!;

  const daysDiff = Math.max(
    1,
    Math.round(
      (new Date(latest.date).getTime() - new Date(baseline.date).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const deltaKg = latest.smoothedWeightKg - baseline.smoothedWeightKg;
  const weeklyRate = Math.round(((deltaKg / daysDiff) * 7) * 100) / 100;

  let trend: "gaining" | "losing" | "stable" = "stable";
  if (weeklyRate > 0.15) trend = "gaining";
  else if (weeklyRate < -0.15) trend = "losing";

  return {
    weeklyRateKg: weeklyRate,
    trend,
    daysAnalyzed: daysDiff
  };
}
