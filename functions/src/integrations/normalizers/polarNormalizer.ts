/**
 * Polar Open AccessLink v3 API Normalizer
 *
 * Implements Polar exercise and sleep/nightly recharge normalization.
 */

import {
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep,
  StandardSport
} from "../types";

export function mapPolarSport(sport: string): StandardSport {
  const s = (sport || "").toUpperCase();
  if (s.includes("RUNNING") || s.includes("JOGGING")) return "running";
  if (s.includes("CYCLING") || s.includes("BIKING")) return "cycling";
  if (s.includes("SWIMMING")) return "swimming";
  if (s.includes("STRENGTH") || s.includes("FITNESS")) return "strength";
  if (s.includes("ROWING")) return "rowing";
  if (s.includes("WALKING")) return "walking";
  return "other";
}

export interface PolarExercisePayload {
  id: string | number;
  upload_time?: string;
  "upload-time"?: string;
  start_time?: string;
  "start-time"?: string;
  duration: string; // ISO 8601 duration e.g. "PT1H12M30S"
  sport: string;
  distance?: number; // meters
  calories?: number;
  heart_rate?: {
    average?: number;
    maximum?: number;
  };
  "heart-rate"?: {
    average?: number;
    maximum?: number;
  };
  training_load?: number;
  "training-load"?: number;
}

export interface PolarSleepPayload {
  date: string; // YYYY-MM-DD
  sleep_start_time: string; // ISO 8601
  sleep_end_time: string; // ISO 8601
  sleep_score?: number;
  total_sleep?: number; // seconds
  deep_sleep?: number; // seconds
  light_sleep?: number; // seconds
  rem_sleep?: number; // seconds
  wake_time?: number; // seconds
}

export interface PolarNightlyRechargePayload {
  date: string; // YYYY-MM-DD
  heart_rate_avg?: number;
  "heart-rate-avg"?: number;
  beat_to_beat_avg?: number; // ms (HRV indicator)
  hrv_avg?: number;
  breathing_rate_avg?: number;
  "breathing-rate-avg"?: number;
  ans_charge?: number;
}

function parseDurationSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  // Parse ISO 8601 Duration PT1H30M15S
  const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseFloat(matches[3] || "0");
  return hours * 3600 + minutes * 60 + Math.round(seconds);
}

export function normalizePolarExercise(
  userId: string,
  payload: PolarExercisePayload
): NormalizedActivity {
  const sport = mapPolarSport(payload.sport);
  const durationSeconds = parseDurationSeconds(payload.duration);
  const startTime = payload.start_time || payload["start-time"] || new Date().toISOString();
  const hr = payload.heart_rate || payload["heart-rate"];
  const trainingLoad = payload.training_load ?? payload["training-load"];

  return {
    id: `polar_act_${userId}_${payload.id}`,
    userId,
    provider: "polar",
    providerRecordId: String(payload.id),
    sport,
    sportRawName: payload.sport,
    title: `Polar ${sport.charAt(0).toUpperCase() + sport.slice(1)}`,
    startTime,
    durationSeconds: durationSeconds > 0 ? durationSeconds : 1800,
    distanceMeters: payload.distance,
    avgHeartRate: hr?.average,
    maxHeartRate: hr?.maximum,
    calories: payload.calories,
    trainingLoad: trainingLoad ? Math.round(trainingLoad) : undefined,
    sourceConfidence: 0.96,
    createdAt: new Date().toISOString()
  };
}

export function normalizePolarSleep(
  userId: string,
  payload: PolarSleepPayload
): NormalizedSleep {
  const durationMinutes = payload.total_sleep
    ? Math.round(payload.total_sleep / 60)
    : Math.max(1, Math.round((new Date(payload.sleep_end_time).getTime() - new Date(payload.sleep_start_time).getTime()) / 60000));

  return {
    id: `polar_sleep_${userId}_${payload.date}`,
    userId,
    provider: "polar",
    providerRecordId: payload.date,
    date: payload.date,
    startTime: payload.sleep_start_time,
    endTime: payload.sleep_end_time,
    durationMinutes,
    sleepScore: payload.sleep_score,
    stages: {
      deepMinutes: payload.deep_sleep ? Math.round(payload.deep_sleep / 60) : 0,
      remMinutes: payload.rem_sleep ? Math.round(payload.rem_sleep / 60) : 0,
      lightMinutes: payload.light_sleep ? Math.round(payload.light_sleep / 60) : 0,
      awakeMinutes: payload.wake_time ? Math.round(payload.wake_time / 60) : 0
    },
    sourceConfidence: 0.93,
    createdAt: new Date().toISOString()
  };
}

export function normalizePolarDaily(
  userId: string,
  payload: PolarNightlyRechargePayload
): NormalizedDaily {
  const hrAvg = payload.heart_rate_avg ?? payload["heart-rate-avg"];
  const hrv = payload.beat_to_beat_avg ?? payload.hrv_avg;
  const breathing = payload.breathing_rate_avg ?? payload["breathing-rate-avg"];

  return {
    id: `polar_daily_${userId}_${payload.date}`,
    userId,
    provider: "polar",
    providerRecordId: payload.date,
    date: payload.date,
    restingHeartRateBpm: hrAvg ? Math.round(hrAvg) : undefined,
    hrvRmssdMs: hrv ? Math.round(hrv) : undefined,
    respiratoryRateBpm: breathing ? Math.round(breathing * 10) / 10 : undefined,
    sourceConfidence: 0.94,
    createdAt: new Date().toISOString()
  };
}
