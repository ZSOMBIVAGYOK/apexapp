/**
 * WHOOP 4.0 API v1 Normalizer
 *
 * Implements official WHOOP Developer API 4.0 data schema mapping:
 * - Recovery & Cycle -> NormalizedDaily
 * - Activity/Sleep -> NormalizedSleep
 * - Activity/Workout -> NormalizedActivity
 */

import {
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep,
  StandardSport
} from "../types";

/**
 * WHOOP Sport ID to Apex StandardSport mapping based on WHOOP Developer Documentation.
 * Ref: https://developer.whoop.com/docs/developing/user-data/workouts
 */
export function mapWhoopSportId(sportId: number): StandardSport {
  switch (sportId) {
    case 0: // Running
    case 17: // Trail Running
    case 18: // Treadmill
      return "running";
    case 1: // Cycling
    case 42: // Mountain Biking
    case 43: // Gravel Cycling
    case 52: // Spin / Indoor Cycling
      return "cycling";
    case 33: // Swimming
    case 87: // Open Water Swimming
      return "swimming";
    case 44: // Weightlifting
    case 45: // Functional Fitness / Crossfit
    case 47: // Strength Trainer
    case 48: // Powerlifting
      return "strength";
    case 71: // Triathlon
      return "triathlon";
    case 16: // Rowing
    case 63: // Ergometer
      return "rowing";
    case 34: // Walking
    case 35: // Hiking
      return "walking";
    default:
      return "other";
  }
}

export interface WhoopRecoveryPayload {
  cycle_id?: number;
  sleep_id?: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  score_state?: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: {
    user_calibrating?: boolean;
    recovery_score?: number; // 0 - 100
    resting_heart_rate?: number; // bpm
    hrv_rmssd_milli?: number; // milliseconds
    spo2_percentage?: number; // 0 - 100%
    skin_temp_celsius?: number;
  };
}

export interface WhoopCyclePayload {
  id?: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  start?: string; // ISO 8601
  end?: string;

  timezone_offset?: string;
  score_state?: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: {
    strain?: number; // 0.0 - 21.0
    kilojoule?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
  };
}

export interface WhoopSleepPayload {
  id: number | string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  start: string; // ISO 8601
  end: string;
  timezone_offset?: string;
  nap?: boolean;
  score_state?: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: {
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
      total_no_data_time_milli?: number;
      total_light_sleep_time_milli?: number;
      total_slow_wave_sleep_time_milli?: number; // Deep sleep
      total_rem_sleep_time_milli?: number;
      sleep_cycle_count?: number;
      disturbance_count?: number;
    };
    sleep_needed?: {
      baseline_milli?: number;
      need_from_sleep_debt_milli?: number;
      need_from_recent_strain_milli?: number;
      need_from_recent_nap_milli?: number;
    };
    respiratory_rate?: number;
    sleep_performance_percentage?: number; // 0 - 100
    sleep_consistency_percentage?: number;
    sleep_efficiency_percentage?: number; // 0 - 100
  };
}

export interface WhoopWorkoutPayload {
  id: number | string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  start: string; // ISO 8601
  end: string;
  timezone_offset?: string;
  sport_id: number;
  score_state?: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: {
    strain?: number; // 0.0 - 21.0
    average_heart_rate?: number;
    max_heart_rate?: number;
    kilojoule?: number;
    percent_recorded?: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
    altitude_change_meter?: number;
  };
}

/**
 * Normalizes WHOOP Recovery and Day Cycle into a NormalizedDaily record.
 */
export function normalizeWhoopDaily(
  userId: string,
  date: string,
  recovery?: WhoopRecoveryPayload | null,
  cycle?: WhoopCyclePayload | null
): NormalizedDaily {
  const recScore = recovery?.score;
  const cycleScore = cycle?.score;

  return {
    id: `whoop_daily_${userId}_${date}`,
    userId,
    provider: "whoop",
    providerRecordId: String(cycle?.id || recovery?.cycle_id || date),
    date,
    restingHeartRateBpm: recScore?.resting_heart_rate ? Math.round(recScore.resting_heart_rate) : undefined,
    hrvRmssdMs: recScore?.hrv_rmssd_milli ? Math.round(recScore.hrv_rmssd_milli * 10) / 10 : undefined,
    dayStrain: cycleScore?.strain !== undefined ? Math.round(cycleScore.strain * 10) / 10 : undefined,
    skinTemperatureDeviationCelsius: recScore?.skin_temp_celsius
      ? Math.round((recScore.skin_temp_celsius - 33.3) * 10) / 10
      : undefined,
    spO2Percent: recScore?.spo2_percentage ? Math.round(recScore.spo2_percentage * 10) / 10 : undefined,
    respiratoryRateBpm: undefined,
    sourceConfidence: 0.95,
    createdAt: new Date().toISOString()
  };
}

/**
 * Normalizes WHOOP Sleep into a NormalizedSleep record.
 */
export function normalizeWhoopSleep(
  userId: string,
  payload: WhoopSleepPayload
): NormalizedSleep {
  const stages = payload.score?.stage_summary;
  const startMs = new Date(payload.start).getTime();
  const endMs = new Date(payload.end).getTime();
  const durationMinutes = Math.max(1, Math.round((endMs - startMs) / (1000 * 60)));
  const date = payload.end.split("T")[0] || new Date().toISOString().split("T")[0]!;

  return {
    id: `whoop_sleep_${userId}_${payload.id}`,
    userId,
    provider: "whoop",
    providerRecordId: String(payload.id),
    date,
    startTime: payload.start,
    endTime: payload.end,
    durationMinutes,
    efficiencyScore: payload.score?.sleep_efficiency_percentage
      ? Math.round(payload.score.sleep_efficiency_percentage)
      : undefined,
    sleepScore: payload.score?.sleep_performance_percentage
      ? Math.round(payload.score.sleep_performance_percentage)
      : undefined,
    stages: {
      deepMinutes: stages?.total_slow_wave_sleep_time_milli
        ? Math.round(stages.total_slow_wave_sleep_time_milli / (1000 * 60))
        : 0,
      remMinutes: stages?.total_rem_sleep_time_milli
        ? Math.round(stages.total_rem_sleep_time_milli / (1000 * 60))
        : 0,
      lightMinutes: stages?.total_light_sleep_time_milli
        ? Math.round(stages.total_light_sleep_time_milli / (1000 * 60))
        : 0,
      awakeMinutes: stages?.total_awake_time_milli
        ? Math.round(stages.total_awake_time_milli / (1000 * 60))
        : 0
    },
    respiratoryRateBpm: payload.score?.respiratory_rate
      ? Math.round(payload.score.respiratory_rate * 10) / 10
      : undefined,
    sourceConfidence: 0.96,
    createdAt: new Date().toISOString()
  };
}

/**
 * Normalizes WHOOP Workout into a NormalizedActivity record.
 */
export function normalizeWhoopWorkout(
  userId: string,
  payload: WhoopWorkoutPayload
): NormalizedActivity {
  const sport = mapWhoopSportId(payload.sport_id);
  const startMs = new Date(payload.start).getTime();
  const endMs = new Date(payload.end).getTime();
  const durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));

  // Convert WHOOP kilojoules to active kcal (1 kJ ≈ 0.239006 kcal)
  const calories = payload.score?.kilojoule
    ? Math.round(payload.score.kilojoule * 0.239)
    : undefined;

  // Derive training load from WHOOP strain (0 - 21 exponential curve)
  // Strain of 10 ≈ 40 load, Strain of 14 ≈ 75 load, Strain of 18 ≈ 130 load
  const strain = payload.score?.strain ?? 0;
  const trainingLoad = Math.round(Math.pow(strain / 2.1, 2.2));

  const sportTitleMap: Record<StandardSport, string> = {
    running: "WHOOP Futás",
    cycling: "WHOOP Kerékpározás",
    swimming: "WHOOP Úszás",
    strength: "WHOOP Erőnléti edzés",
    triathlon: "WHOOP Triatlon",
    rowing: "WHOOP Evezés",
    walking: "WHOOP Séta",
    other: "WHOOP Edzés"
  };

  return {
    id: `whoop_act_${userId}_${payload.id}`,
    userId,
    provider: "whoop",
    providerRecordId: String(payload.id),
    sport,
    title: sportTitleMap[sport] || "WHOOP Edzés",
    startTime: payload.start,
    durationSeconds,
    distanceMeters: payload.score?.distance_meter
      ? Math.round(payload.score.distance_meter)
      : undefined,
    avgHeartRate: payload.score?.average_heart_rate,
    maxHeartRate: payload.score?.max_heart_rate,
    elevationGainMeters: payload.score?.altitude_gain_meter
      ? Math.round(payload.score.altitude_gain_meter)
      : undefined,
    calories,
    trainingLoad,
    sourceConfidence: 0.94,
    createdAt: new Date().toISOString()
  };
}
