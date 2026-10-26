/**
 * TCX (Garmin Training Center XML) File Parser
 * Pure TypeScript parser for TCX workouts with sport tags, laps, power, and heart rate.
 */

import { NormalizedActivity, NormalizedLap, StandardSport } from "@shared/types/devices";

function mapTcxSport(sportAttr?: string): StandardSport {
  if (!sportAttr) return "running";
  const s = sportAttr.toLowerCase();
  if (s.includes("biking") || s.includes("cycling")) return "cycling";
  if (s.includes("running")) return "running";
  if (s.includes("swimming")) return "swimming";
  if (s.includes("strength") || s.includes("training")) return "strength";
  return "other";
}

export function parseTCX(xmlText: string, fileName = "workout.tcx"): NormalizedActivity {
  // Extract activity sport & ID
  const activityMatch = xmlText.match(/<Activity\s+Sport=["']([^"']+)["']/i);
  const sport = mapTcxSport(activityMatch ? activityMatch[1] : undefined);

  const idMatch = xmlText.match(/<Id>(.*?)<\/Id>/i);
  const startTime = idMatch ? new Date(idMatch[1]!.trim()).toISOString() : new Date().toISOString();

  // Extract laps
  const lapRegex = /<Lap\s+StartTime=["']([^"']+)["']>([\s\S]*?)<\/Lap>/gi;
  let lapMatch: RegExpExecArray | null;

  const laps: NormalizedLap[] = [];
  let lapIndex = 0;
  let totalTimeSeconds = 0;
  let totalDistanceMeters = 0;
  let totalCalories = 0;
  let maxHeartRate = 0;
  let weightedHrSum = 0;
  let weightedHrDuration = 0;
  let weightedPowerSum = 0;
  let weightedPowerDuration = 0;
  let maxPowerWatts = 0;

  while ((lapMatch = lapRegex.exec(xmlText)) !== null) {
    const lapStart = lapMatch[1]!;
    const lapInner = lapMatch[2]!;

    const timeMatch = lapInner.match(/<TotalTimeSeconds>([\d.]+)<\/TotalTimeSeconds>/i);
    const lapDuration = timeMatch ? parseFloat(timeMatch[1]!) : 0;

    const distMatch = lapInner.match(/<DistanceMeters>([\d.]+)<\/DistanceMeters>/i);
    const lapDistance = distMatch ? parseFloat(distMatch[1]!) : undefined;

    const calMatch = lapInner.match(/<Calories>(\d+)<\/Calories>/i);
    const lapCalories = calMatch ? parseInt(calMatch[1]!, 10) : undefined;

    const avgHrMatch = lapInner.match(/<AverageHeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>[\s\S]*?<\/AverageHeartRateBpm>/i);
    const lapAvgHr = avgHrMatch ? parseInt(avgHrMatch[1]!, 10) : undefined;

    const maxHrMatch = lapInner.match(/<MaximumHeartRateBpm>[\s\S]*?<Value>(\d+)<\/Value>[\s\S]*?<\/MaximumHeartRateBpm>/i);
    const lapMaxHr = maxHrMatch ? parseInt(maxHrMatch[1]!, 10) : undefined;

    const powerMatch = lapInner.match(/<Watts>(\d+)<\/Watts>/i);
    const lapPower = powerMatch ? parseInt(powerMatch[1]!, 10) : undefined;

    totalTimeSeconds += lapDuration;
    if (lapDistance) totalDistanceMeters += lapDistance;
    if (lapCalories) totalCalories += lapCalories;
    if (lapMaxHr && lapMaxHr > maxHeartRate) maxHeartRate = lapMaxHr;

    if (lapAvgHr && lapDuration > 0) {
      weightedHrSum += lapAvgHr * lapDuration;
      weightedHrDuration += lapDuration;
    }

    if (lapPower && lapDuration > 0) {
      weightedPowerSum += lapPower * lapDuration;
      weightedPowerDuration += lapDuration;
      if (lapPower > maxPowerWatts) maxPowerWatts = lapPower;
    }

    laps.push({
      index: lapIndex++,
      startTime: new Date(lapStart).toISOString(),
      durationSeconds: Math.round(lapDuration),
      distanceMeters: lapDistance ? Math.round(lapDistance) : undefined,
      avgHeartRate: lapAvgHr,
      maxHeartRate: lapMaxHr,
      avgPowerWatts: lapPower,
      calories: lapCalories
    });
  }

  // Fallback if no structured laps exist, search trackpoints
  if (totalTimeSeconds === 0) {
    const tpCount = (xmlText.match(/<Trackpoint>/gi) || []).length;
    totalTimeSeconds = Math.max(60, tpCount);
  }

  const avgHeartRate =
    weightedHrDuration > 0 ? Math.round(weightedHrSum / weightedHrDuration) : undefined;
  const avgPowerWatts =
    weightedPowerDuration > 0 ? Math.round(weightedPowerSum / weightedPowerDuration) : undefined;

  let avgPaceSecondsPerKm: number | undefined = undefined;
  if (totalDistanceMeters > 100 && totalTimeSeconds > 0) {
    avgPaceSecondsPerKm = Math.round(totalTimeSeconds / (totalDistanceMeters / 1000));
  }

  const title = `${sport.charAt(0).toUpperCase() + sport.slice(1)} edzés (${Math.round(totalTimeSeconds / 60)} perc)`;

  return {
    id: `tcx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: "athlete-self",
    provider: "file",
    providerRecordId: `file_${fileName}_${startTime}`,
    sport,
    title,
    startTime,
    durationSeconds: Math.round(totalTimeSeconds),
    distanceMeters: totalDistanceMeters > 0 ? Math.round(totalDistanceMeters) : undefined,
    avgHeartRate,
    maxHeartRate: maxHeartRate > 0 ? maxHeartRate : undefined,
    avgPowerWatts,
    maxPowerWatts: maxPowerWatts > 0 ? maxPowerWatts : undefined,
    avgPaceSecondsPerKm,
    calories: totalCalories > 0 ? totalCalories : undefined,
    laps: laps.length > 0 ? laps : undefined,
    sourceConfidence: 0.96,
    createdAt: new Date().toISOString()
  };
}
