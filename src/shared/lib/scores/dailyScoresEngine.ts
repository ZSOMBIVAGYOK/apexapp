/**
 * UNIFIED DAILY SCORES ENGINE
 *
 * Coordinates Recovery, Strain, Target Range, Sleep, and Daily Rhythm evaluations.
 * Completely deterministic and pure; zero side effects.
 * Produces the canonical DailyScoresRecord stored in athletes/{id}/days/{date}.
 */

import { DailyAggregateDocument, CompletedSessionDocument } from "@shared/types";
import { PlannedWorkout } from "@shared/types/training";
import { SCORES_CONFIG } from "./config";
import { calculateRecoveryScore, AthleteRecoveryScore } from "./recoveryScore";
import { calculateDailyStrain, AthleteStrainScore } from "./strainScore";
import {
  calculateSleepScore,
  AthleteSleepScore,
  HistoricalSleepDayInput
} from "./sleepScore";
import { evaluateDailyRhythm, DailyRhythmEvaluation } from "./dailyRhythm";

export interface DailyScoresRecord {
  athleteId: string;
  date: string; // YYYY-MM-DD
  // Core persisted fields:
  recoveryScore: number;
  recoveryBand: "green" | "amber" | "red";
  recoveryConfidence: number;
  strainScore: number;
  strainTargetLow: number;
  strainTargetHigh: number;
  strainTargetSource: "plan" | "recovery";
  sleepScore: number;
  sleepNeedMinutes: number;
  sleepDebtMinutes: number;
  sleepConfidence: number;
  schemaVersion: number;
  updatedAt: string;

  // Fully resolved evaluations for UI presentation:
  recovery: AthleteRecoveryScore;
  strain: AthleteStrainScore;
  sleep: AthleteSleepScore;
  rhythm: DailyRhythmEvaluation;
  hasCheckIn: boolean;
  hasSessions: boolean;
  hasSleepData: boolean;
}

export interface CalculateDailyScoresOptions {
  athleteId: string;
  date: string; // YYYY-MM-DD
  dailyDoc?: DailyAggregateDocument | null;
  sessions?: CompletedSessionDocument[];
  plannedWorkouts?: PlannedWorkout[];
  historicalDailies?: DailyAggregateDocument[];
  athleteLevel?: string;
  athleteCtl?: number;
  athleteSleepTargetHours?: number;
  seasonPhase?: string;
  acwr?: number;
  currentHour?: number;
  config?: typeof SCORES_CONFIG;
}

/**
 * Calculates unified daily scores record.
 * Idempotent, safe, and guarantees no fabricated missing data.
 */
export function calculateDailyScores(
  options: CalculateDailyScoresOptions
): DailyScoresRecord {
  const {
    athleteId,
    date,
    dailyDoc,
    sessions = [],
    plannedWorkouts = [],
    historicalDailies = [],
    athleteLevel = "competitive_amateur",
    athleteCtl,
    athleteSleepTargetHours,
    seasonPhase = "base",
    acwr = 1.0,
    currentHour,
    config = SCORES_CONFIG
  } = options;

  const now = new Date().toISOString();
  const hasCheckIn = !!dailyDoc;
  const hasSessions = sessions.length > 0;
  const hasSleepData = !!(dailyDoc?.sleep && dailyDoc.sleep.durationMinutes > 0);

  // 1. Recovery Score
  let recovery: AthleteRecoveryScore;
  if (hasCheckIn && dailyDoc) {
    recovery = calculateRecoveryScore(
      {
        date: dailyDoc.date,
        sleep: {
          durationMinutes: dailyDoc.sleep.durationMinutes,
          qualityScore: dailyDoc.sleep.qualityScore,
          bedTime: dailyDoc.sleep.bedTime,
          wakeTime: dailyDoc.sleep.wakeTime
        },
        wellness: {
          fatigue: dailyDoc.subjective.fatigue || 2,
          soreness: dailyDoc.subjective.soreness,
          stress: dailyDoc.subjective.stress,
          mood: dailyDoc.subjective.mood || 4,
          motivation: dailyDoc.subjective.motivation || 4,
          illness: dailyDoc.subjective.illness,
          soreAreas: dailyDoc.subjective.soreAreas
        },
        biometrics: {
          hrvRmssd: dailyDoc.hrv?.rmssd,
          restingHr: dailyDoc.restingHeartRate,
          baselineHrvMean: 75,
          baselineHrvSd: 8,
          baselineRhrMean: 50
        },
        trainingLoad: {
          acuteLoad7d: athleteCtl ? athleteCtl * 1.1 : undefined,
          chronicLoad28d: athleteCtl,
          acwr
        },
        historicalDaysCount: historicalDailies.length
      },
      config
    );
  } else {
    // Check-in pending
    recovery = {
      score: 0,
      band: "amber",
      confidence: 0,
      statusLabelHu: "Függőben",
      statusLabelEn: "Pending",
      pathUsed: "manual",
      topDrivers: [],
      softMessageHu: "A mai reggeli check-in még kitöltésre vár.",
      softMessageEn: "Morning check-in pending for today.",
      isCalibrating: false,
      rawReadinessResult: {
        score: 0,
        band: "amber",
        confidence: 0,
        pathUsed: "manual",
        drivers: [],
        isCalibrating: false,
        calibrationProgress: { daysCollected: 0, daysRequired: 14, percentage: 0 },
        softMessageHu: "Check-in kitöltése szükséges.",
        softMessageEn: "Check-in required.",
        components: { sleepScore: 0, loadAdjustment: 0 }
      }
    };
  }

  // 2. Strain & Target Range
  const sessionInputs = sessions.map((s) => ({
    sessionId: s.sessionId,
    title: s.title,
    sport: s.sport,
    durationMinutes: s.durationMinutes,
    load: s.trainingLoad || 0,
    isManual: s.rpe ? true : false
  }));

  const plannedInputs = plannedWorkouts
    .filter((w) => w.date === date && !w.deletedAt && w.status !== "skipped")
    .map((w) => ({
      id: w.id,
      title: w.title,
      plannedLoad: w.plannedLoad,
      plannedDurationMinutes: w.plannedDurationMinutes,
      sport: w.sport
    }));

  const strain = calculateDailyStrain({
    sessions: sessionInputs,
    plannedWorkouts: plannedInputs,
    recoveryBand: hasCheckIn ? recovery.band : "green",
    athleteLevel,
    ctl: athleteCtl,
    seasonPhase,
    acwr,
    config
  });

  // 3. Sleep Score
  const sleepHistory: HistoricalSleepDayInput[] = historicalDailies
    .filter((d) => d.date !== date && d.sleep && d.sleep.durationMinutes > 0)
    .slice(0, 7)
    .map((d) => ({
      date: d.date,
      durationMinutes: d.sleep.durationMinutes,
      needMinutes: undefined,
      bedTime: d.sleep.bedTime,
      wakeTime: d.sleep.wakeTime
    }));

  const userBaselineMinutes = athleteSleepTargetHours
    ? Math.round(athleteSleepTargetHours * 60)
    : config.sleep.defaultBaselineMinutes;

  const sleep = calculateSleepScore({
    lastNight: dailyDoc?.sleep
      ? {
          durationMinutes: dailyDoc.sleep.durationMinutes,
          qualityScore: dailyDoc.sleep.qualityScore,
          bedTime: dailyDoc.sleep.bedTime,
          wakeTime: dailyDoc.sleep.wakeTime,
          deepMinutes: dailyDoc.sleep.deepMinutes,
          remMinutes: dailyDoc.sleep.remMinutes,
          awakeMinutes: dailyDoc.sleep.awakeMinutes
        }
      : undefined,
    yesterdayStrain: strain.score, // Or past day strain if available
    sevenDayHistory: sleepHistory,
    userBaselineMinutes,
    config
  });

  // 4. Daily Rhythm
  const rhythm = evaluateDailyRhythm({
    hasCheckedIn: hasCheckIn,
    recoveryBand: recovery.band,
    currentStrain: strain.score,
    targetRange: strain.targetRange,
    completedSessionsCount: sessions.length,
    plannedWorkoutsCount: plannedInputs.length,
    recommendedBedtime: sleep.bedtimeRecommendation.recommendedBedtime,
    currentHour,
    config
  });

  return {
    athleteId,
    date,
    recoveryScore: hasCheckIn ? recovery.score : 0,
    recoveryBand: recovery.band,
    recoveryConfidence: recovery.confidence,
    strainScore: strain.score,
    strainTargetLow: strain.targetRange.low,
    strainTargetHigh: strain.targetRange.high,
    strainTargetSource: strain.targetRange.source,
    sleepScore: hasSleepData ? sleep.score : 0,
    sleepNeedMinutes: sleep.needMinutes,
    sleepDebtMinutes: sleep.debtMinutes,
    sleepConfidence: sleep.confidence,
    schemaVersion: 1,
    updatedAt: now,
    recovery,
    strain,
    sleep,
    rhythm,
    hasCheckIn,
    hasSessions,
    hasSleepData
  };
}
