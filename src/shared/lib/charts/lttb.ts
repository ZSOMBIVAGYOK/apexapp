/**
 * LARGEST TRIANGLE THREE BUCKETS (LTTB) DOWNSAMPLING
 *
 * Peak-preserving downsampling algorithm for high-frequency time series.
 * Preserves local extrema (spikes, peaks, troughs), start and end points,
 * ensuring charts render quickly (< 500 SVG nodes) without losing accuracy.
 */

export interface DataPoint2D {
  x: number;
  y: number;
}

/**
 * Pure LTTB downsampling on 2D coordinates.
 * @param data Array of { x, y } points sorted by x.
 * @param targetCount Number of points to downsample to.
 */
export function lttbDownsample<T extends DataPoint2D>(
  data: T[],
  targetCount: number
): T[] {
  if (!data || data.length <= targetCount || targetCount <= 2) {
    return data || [];
  }

  const sampled: T[] = [];
  const dataLength = data.length;
  // Bucket size. Leave room for start and end data points
  const bucketSize = (dataLength - 2) / (targetCount - 2);

  let a = 0; // Initially the first point in the data
  sampled.push(data[a]!);

  for (let i = 0; i < targetCount - 2; i++) {
    // Calculate point average for next bucket (c)
    let avgX = 0;
    let avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j]!.x;
      avgY += data[j]!.y;
    }
    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    }

    // Get the range for this bucket
    let rangeOfs = Math.floor(i * bucketSize) + 1;
    let rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point a
    const pointAX = data[a]!.x;
    const pointAY = data[a]!.y;

    let maxArea = -1;
    let maxAreaPoint = data[rangeOfs]!;
    let nextA = rangeOfs;

    for (let j = rangeOfs; j < rangeTo; j++) {
      const pt = data[j]!;
      // Calculate triangle area over points a, pt, and the average point c
      const area =
        Math.abs(
          (pointAX - avgX) * (pt.y - pointAY) -
            (pointAX - pt.x) * (avgY - pointAY)
        ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = pt;
        nextA = j;
      }
    }

    sampled.push(maxAreaPoint);
    a = nextA;
  }

  // Always include the last point
  sampled.push(data[dataLength - 1]!);

  return sampled;
}

import { SessionTimeSeriesPoint } from "@shared/types/dataModel";

/**
 * Downsamples session time-series points preserving the primary metric's peaks.
 * Uses HR, Power, or Speed as the primary curve to optimize triangle areas.
 */
export function downsampleSessionTimeSeries(
  points: SessionTimeSeriesPoint[],
  targetCount = 400
): SessionTimeSeriesPoint[] {
  if (!points || points.length <= targetCount) {
    return points || [];
  }

  // Choose the best metric for peak preservation (HR > Power > Speed > Elevation)
  const hasHr = points.some((p) => typeof p.heartRate === "number");
  const hasPower = points.some((p) => typeof p.powerWatts === "number");
  const hasSpeed = points.some((p) => typeof p.speedMps === "number");

  type IntermediatePoint = DataPoint2D & { original: SessionTimeSeriesPoint };

  const intermediate: IntermediatePoint[] = points.map((p, idx) => {
    let y = 0;
    if (hasHr && typeof p.heartRate === "number") y = p.heartRate;
    else if (hasPower && typeof p.powerWatts === "number") y = p.powerWatts;
    else if (hasSpeed && typeof p.speedMps === "number") y = p.speedMps;
    else if (typeof p.elevationMeters === "number") y = p.elevationMeters;

    return {
      x: p.timeOffsetSeconds ?? idx,
      y,
      original: p
    };
  });

  const reduced = lttbDownsample(intermediate, targetCount);
  return reduced.map((r) => r.original);
}
