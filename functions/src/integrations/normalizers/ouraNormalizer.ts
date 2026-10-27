/**
 * Oura Ring Cloud API v2 Normalizer
 *
 * Implements Oura Ring daily_sleep, daily_readiness, and workout normalization.
 */

import {
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep,
  StandardSport
} from "../types";

export function mapOuraActivity(activity: string): StandardSport {
  const a = (activity || "").toLowerCase();
  if (a.includes("running") || a.includes("jogging")) return "running";
  if (a.includes("cycling") || a.includes("biking")) return "cycling";
  if (a.includes("swimming")) return "swimming";
  if (a.includes("strength") || a.includes("weight") || a.includes("gym")) return "strength";
  if (a.includes("rowing")) return "rowing";
  if (a.includes("walking") || a.includes("hiking")) return "walking";
  return "other";
}

export interface OuraDailySleepPayload {
  id: string;
  day: string; // YYYY-MM-DD
  score?: number; // 0 - 100
  bedtime_start?: string; // ISO 8601
  bedtime_end?: string;
  total_sleep_duration?: number; // seconds
  deep_sleep_duration?: number; // seconds
  rem_sleep_duration?: number; // seconds
  light_sleep_duration?: number; // seconds
  awake_time?: number; // seconds
  efficiency?: number; // 0 - 100%
  average_hrv?: number;
  lowest_heart_rate?: number;
}

export interface OuraDailyReadinessPayload {
  id: string;
  day: string; // YYYY-MM-DD
  score?: number; // 0 - 100
  temperature_deviation?: number; // Celsius
  resting_heart_rate?: number;
  hrv_balance?: string;
}

export interface OuraWorkoutPayload {
  id: string;
  activity: string;
  start_datetime: string; // ISO 8601
  end_datetime: string;
  intensity?: "easy" | "moderate" | "hard";
  distance?: number; // meters
  calories?: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
}

export function normalizeOuraSleep(
  userId: string,
  payload: OuraDailySleepPayload
): NormalizedSleep {
  const startTime = payload.bedtime_start || `${payload.day}T22:30:00.000Z`;
  const endTime = payload.bedtime_end || `${payload.day}T07:00:00.000Z`;
  const totalDurationSec =
    payload.total_sleep_duration ||
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
  const durationMinutes = Math.max(1, Math.round(totalDurationSec / 60));

  return {
    id: `oura_sleep_${userId}_${payload.id}`,
    userId,
    provider: "oura",
    providerRecordId: String(payload.id),
    date: payload.day,
    startTime,
    endTime,
    durationMinutes,
    efficiencyScore: payload.efficiency ? Math.round(payload.efficiency) : undefined,
    sleepScore: payload.score,
    stages: {
      deepMinutes: payload.deep_sleep_duration ? Math.round(payload.deep_sleep_duration / 60) : 0,
      remMinutes: payload.rem_sleep_duration ? Math.round(payload.rem_sleep_duration / 60) : 0,
      lightMinutes: payload.light_sleep_duration ? Math.round(payload.light_sleep_duration / 60) : 0,
      awakeMinutes: payload.awake_time ? Math.round(payload.awake_time / 60) : 0
    },
    hrvBaselineMs: payload.average_hrv ? Math.round(payload.average_hrv) : undefined,
    restingHeartRateBpm: payload.lowest_heart_rate ? Math.round(payload.lowest_heart_rate) : undefined,
    sourceConfidence: 0.95,
    createdAt: new Date().toISOString()
  };
}

export function normalizeOuraDaily(
  userId: string,
  payload: OuraDailyReadinessPayload,
  sleepPayload?: OuraDailySleepPayload | null
): NormalizedDaily {
  return {
    id: `oura_daily_${userId}_${payload.day}`,
    userId,
    provider: "oura",
    providerRecordId: String(payload.id),
    date: payload.day,
    restingHeartRateBpm: payload.resting_heart_rate || sleepPayload?.lowest_heart_rate,
    hrvRmssdMs: sleepPayload?.average_hrv,
    skinTemperatureDeviationCelsius: payload.temperature_deviation
      ? Math.round(payload.temperature_deviation * 10) / 10
      : undefined,
    sourceConfidence: 0.94,
    createdAt: new Date().toISOString()
  };
}

export function normalizeOuraWorkout(
  userId: string,
  payload: OuraWorkoutPayload
): NormalizedActivity {
  const sport = mapOuraActivity(payload.activity);
  const startMs = new Date(payload.start_datetime).getTime();
  const endMs = new Date(payload.end_datetime).getTime();
  const durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));

  let loadMultiplier = 1.0;
  if (payload.intensity === "hard") loadMultiplier = 1.4;
  if (payload.intensity === "easy") loadMultiplier = 0.7;
  const trainingLoad = Math.round((durationSeconds / 60) * loadMultiplier);

  return {
    id: `oura_act_${userId}_${payload.id}`,
    userId,
    provider: "oura",
    providerRecordId: String(payload.id),
    sport,
    sportRawName: payload.activity,
    title: `Oura ${sport.charAt(0).toUpperCase() + sport.slice(1)}`,
    startTime: payload.start_datetime,
    durationSeconds,
    distanceMeters: payload.distance ? Math.round(payload.distance) : undefined,
    avgHeartRate: payload.average_heart_rate,
    maxHeartRate: payload.max_heart_rate,
    calories: payload.calories,
    trainingLoad,
    sourceConfidence: 0.88, // Ring motion tracking during high-intensity training is lower confidence
    createdAt: new Date().toISOString()
  };
}
