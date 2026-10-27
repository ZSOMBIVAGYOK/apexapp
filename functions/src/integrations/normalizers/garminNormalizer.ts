/**
 * Garmin Connect Developer Program (Health & Activity API) Normalizer
 *
 * Implements Garmin Connect API JSON payload normalization for Dailies, Sleep, and Activities.
 */

import {
  NormalizedActivity,
  NormalizedDaily,
  NormalizedLap,
  NormalizedSleep,
  StandardSport
} from "../types";

export function mapGarminActivityType(type: string): StandardSport {
  const t = (type || "").toUpperCase();
  if (t.includes("RUN") || t.includes("TREADMILL")) return "running";
  if (t.includes("CYCL") || t.includes("BIKE") || t.includes("SPIN")) return "cycling";
  if (t.includes("SWIM") || t.includes("LAP_SWIMMING")) return "swimming";
  if (t.includes("STRENGTH") || t.includes("FITNESS_EQUIPMENT") || t.includes("WEIGHT")) return "strength";
  if (t.includes("TRIATHLON") || t.includes("MULTI_SPORT")) return "triathlon";
  if (t.includes("ROW") || t.includes("ROWING")) return "rowing";
  if (t.includes("WALK") || t.includes("HIKE")) return "walking";
  return "other";
}

export interface GarminActivityLapPayload {
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  distanceInMeters?: number;
  averageHeartRateInBeatsPerMinute?: number;
  averagePowerInWatts?: number;
}

export interface GarminActivityPayload {
  summaryId?: string;
  activityId?: number | string;
  activityName?: string;
  activityType: string;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds?: number;
  durationInSeconds: number;
  distanceInMeters?: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  averagePowerInWatts?: number;
  maxPowerInWatts?: number;
  maxPowerWatts?: number;
  normPowerInWatts?: number;
  normPowerWatts?: number;

  averagePaceInMinutesPerKilometer?: number;
  averageBikeCadenceInRoundsPerMinute?: number;
  averageRunCadenceInStepsPerMinute?: number;
  activeKilocalories?: number;
  totalKilocalories?: number;
  totalElevationGainInMeters?: number;
  elevationGainInMeters?: number;
  elevationLossInMeters?: number;
  laps?: GarminActivityLapPayload[];
}

export interface GarminDailyPayload {
  summaryId: string;
  calendarDate: string; // YYYY-MM-DD
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  steps?: number;
  distanceInMeters?: number;
  activeKilocalories?: number;
  restingHeartRateInBeatsPerMinute?: number;
  minHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  averageStressLevel?: number; // 0 - 100
  stressDurationInSeconds?: number;
  restStressDurationInSeconds?: number;
  activityStressDurationInSeconds?: number;
  lowStressDurationInSeconds?: number;
  mediumStressDurationInSeconds?: number;
  highStressDurationInSeconds?: number;
}

export interface GarminSleepPayload {
  summaryId: string;
  calendarDate: string; // YYYY-MM-DD
  startTimeInSeconds: number;
  durationInSeconds: number;
  deepSleepDurationInSeconds?: number;
  lightSleepDurationInSeconds?: number;
  remSleepInSeconds?: number;
  awakeDurationInSeconds?: number;
  sleepScore?: number | { value?: number };
  overallSleepScore?: { value?: number };
}

export function normalizeGarminActivity(
  userId: string,
  payload: GarminActivityPayload
): NormalizedActivity {
  const sport = mapGarminActivityType(payload.activityType);
  const startTime = new Date(payload.startTimeInSeconds * 1000).toISOString();
  const recordId = String(payload.activityId || payload.summaryId || payload.startTimeInSeconds);

  // Estimate training load from duration and average heart rate or pace
  const durationMin = payload.durationInSeconds / 60;
  const avgHr = payload.averageHeartRateInBeatsPerMinute || 140;
  const trainingLoad = Math.round(durationMin * (avgHr / 175) * 1.1);

  const laps: NormalizedLap[] | undefined = payload.laps?.map((lap, idx) => ({
    index: idx + 1,
    startTime: new Date((lap.startTimeInSeconds || payload.startTimeInSeconds) * 1000).toISOString(),
    durationSeconds: lap.durationInSeconds || 0,
    distanceMeters: lap.distanceInMeters,
    avgHeartRate: lap.averageHeartRateInBeatsPerMinute,
    avgPowerWatts: lap.averagePowerInWatts
  }));

  const elevationGain = payload.totalElevationGainInMeters ?? payload.elevationGainInMeters;

  return {
    id: `garmin_act_${userId}_${recordId}`,
    userId,
    provider: "garmin",
    providerRecordId: recordId,
    sport,
    sportRawName: payload.activityType,
    title: payload.activityName || `Garmin ${sport.charAt(0).toUpperCase() + sport.slice(1)}`,
    startTime,
    durationSeconds: Math.round(payload.durationInSeconds),
    distanceMeters: payload.distanceInMeters ? Math.round(payload.distanceInMeters) : undefined,
    avgHeartRate: payload.averageHeartRateInBeatsPerMinute,
    maxHeartRate: payload.maxHeartRateInBeatsPerMinute,
    avgPowerWatts: payload.averagePowerInWatts,
    maxPowerWatts: payload.maxPowerInWatts ?? payload.maxPowerWatts,
    normalizedPowerWatts: payload.normPowerInWatts ?? payload.normPowerWatts,

    elevationGainMeters: elevationGain ? Math.round(elevationGain) : undefined,
    elevationLossMeters: payload.elevationLossInMeters ? Math.round(payload.elevationLossInMeters) : undefined,
    calories: payload.activeKilocalories || payload.totalKilocalories,
    trainingLoad,
    laps,
    sourceConfidence: 0.99, // Garmin chest straps / dual-frequency GPS are industry benchmark
    createdAt: new Date().toISOString()
  };
}

export function normalizeGarminDaily(
  userId: string,
  payload: GarminDailyPayload
): NormalizedDaily {
  return {
    id: `garmin_daily_${userId}_${payload.calendarDate}`,
    userId,
    provider: "garmin",
    providerRecordId: String(payload.summaryId || payload.calendarDate),
    date: payload.calendarDate,
    restingHeartRateBpm: payload.restingHeartRateInBeatsPerMinute,
    steps: payload.steps,
    sourceConfidence: 0.95,
    createdAt: new Date().toISOString()
  };
}

export function normalizeGarminSleep(
  userId: string,
  payload: GarminSleepPayload
): NormalizedSleep {
  const startMs = payload.startTimeInSeconds * 1000;
  const endMs = startMs + payload.durationInSeconds * 1000;
  const startTime = new Date(startMs).toISOString();
  const endTime = new Date(endMs).toISOString();
  const durationMinutes = Math.round(payload.durationInSeconds / 60);

  const deepMinutes = payload.deepSleepDurationInSeconds ? Math.round(payload.deepSleepDurationInSeconds / 60) : 0;
  const remMinutes = payload.remSleepInSeconds ? Math.round(payload.remSleepInSeconds / 60) : 0;
  const lightMinutes = payload.lightSleepDurationInSeconds ? Math.round(payload.lightSleepDurationInSeconds / 60) : 0;
  const awakeMinutes = payload.awakeDurationInSeconds ? Math.round(payload.awakeDurationInSeconds / 60) : 0;

  const totalSleepMinutes = deepMinutes + remMinutes + lightMinutes;
  const efficiencyScore = durationMinutes > 0 ? Math.round((totalSleepMinutes / durationMinutes) * 100) : undefined;

  let sleepScore: number | undefined;
  if (typeof payload.sleepScore === "number") {
    sleepScore = payload.sleepScore;
  } else if (payload.sleepScore && typeof payload.sleepScore.value === "number") {
    sleepScore = payload.sleepScore.value;
  } else if (payload.overallSleepScore && typeof payload.overallSleepScore.value === "number") {
    sleepScore = payload.overallSleepScore.value;
  }

  return {
    id: `garmin_sleep_${userId}_${payload.summaryId}`,
    userId,
    provider: "garmin",
    providerRecordId: String(payload.summaryId),
    date: payload.calendarDate,
    startTime,
    endTime,
    durationMinutes,
    efficiencyScore,
    sleepScore,
    stages: {
      deepMinutes,
      remMinutes,
      lightMinutes,
      awakeMinutes
    },
    sourceConfidence: 0.92,
    createdAt: new Date().toISOString()
  };
}
