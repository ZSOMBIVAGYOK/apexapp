/**
 * DAILY SCORES REPOSITORY & RECOMPUTATION
 *
 * Central persistence and automatic recomputation layer for daily scores:
 * - Persists recoveryScore, strainScore, target range, sleepScore into athletes/{id}/days/{date}.
 * - Idempotently recomputes scores after any session mutation, check-in, backdating or device sync.
 * - Resolves scores lazily on read when historical days lack precomputed fields.
 * - Guarantees offline-first persistence with mutation queuing.
 */

import { db } from "@shared/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { DailyAggregateDocument, CompletedSessionDocument } from "@shared/types";
import { PlannedWorkout } from "@shared/types/training";
import {
  getLocalDaily,
  saveLocalDaily,
  getAllLocalDailies,
  getLocalSessions,
  getLocalSleepTarget
} from "@shared/lib/offline/offlineStorage";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";
import {
  calculateDailyScores,
  DailyScoresRecord
} from "./dailyScoresEngine";

const SCORES_CACHE_PREFIX = "apex_daily_scores_";

export function getLocalScoresCache(athleteId: string, date: string): DailyScoresRecord | null {
  try {
    const raw = localStorage.getItem(`${SCORES_CACHE_PREFIX}${athleteId}_${date}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalScoresCache(record: DailyScoresRecord): void {
  try {
    localStorage.setItem(
      `${SCORES_CACHE_PREFIX}${record.athleteId}_${record.date}`,
      JSON.stringify(record)
    );
  } catch {
    // Fail-safe
  }
}

/**
 * Gets or lazily computes the DailyScoresRecord for an athlete on a specific date.
 */
export function getOrComputeDailyScores(options: {
  athleteId: string;
  date: string;
  dailyDoc?: DailyAggregateDocument | null;
  sessions?: CompletedSessionDocument[];
  plannedWorkouts?: PlannedWorkout[];
  athleteLevel?: string;
  athleteCtl?: number;
}): DailyScoresRecord {
  const { athleteId, date, dailyDoc, sessions, plannedWorkouts, athleteLevel, athleteCtl } = options;

  // 1. Resolve daily doc if not provided
  const resolvedDaily = dailyDoc !== undefined ? dailyDoc : getLocalDaily(athleteId, date);

  // 2. Resolve sessions for date if not provided
  let daySessions: CompletedSessionDocument[];
  if (sessions) {
    daySessions = sessions.filter((s) => s.date === date && s.completed !== false);
  } else {
    const all = getLocalSessions(athleteId);
    daySessions = all.filter((s) => s.date === date && s.completed !== false && !s.deletedAt);
  }

  // 3. Resolve planned workouts if not provided
  let dayPlanned: PlannedWorkout[] = [];
  if (plannedWorkouts) {
    dayPlanned = plannedWorkouts.filter((w) => w.date === date && !w.deletedAt);
  } else {
    try {
      const raw = localStorage.getItem(`apex_planned_workouts_${athleteId}`);
      if (raw) {
        const list: PlannedWorkout[] = JSON.parse(raw);
        dayPlanned = list.filter((w) => w.date === date && !w.deletedAt);
      }
    } catch {
      // ignore
    }
  }

  // 4. Resolve history for sleep need
  const allDailies = getAllLocalDailies(athleteId);
  const sleepTargetHours = getLocalSleepTarget(athleteId);

  // Compute record
  const record = calculateDailyScores({
    athleteId,
    date,
    dailyDoc: resolvedDaily,
    sessions: daySessions,
    plannedWorkouts: dayPlanned,
    historicalDailies: allDailies,
    athleteLevel,
    athleteCtl,
    athleteSleepTargetHours: sleepTargetHours
  });

  // Save to local fast cache
  setLocalScoresCache(record);

  return record;
}

/**
 * Automatically recomputes and persists scores for a given date.
 * Updates local DailyAggregateDocument and sends to Firestore if online.
 */
export async function recomputeAndPersistDailyScores(
  athleteId: string,
  date: string,
  options?: {
    sessions?: CompletedSessionDocument[];
    plannedWorkouts?: PlannedWorkout[];
    athleteLevel?: string;
    athleteCtl?: number;
  }
): Promise<DailyScoresRecord> {
  const record = getOrComputeDailyScores({
    athleteId,
    date,
    sessions: options?.sessions,
    plannedWorkouts: options?.plannedWorkouts,
    athleteLevel: options?.athleteLevel,
    athleteCtl: options?.athleteCtl
  });

  // Merge into local daily document if present
  const existingDaily = getLocalDaily(athleteId, date);
  if (existingDaily) {
    const updatedDaily: DailyAggregateDocument = {
      ...existingDaily,
      recoveryScore: record.recoveryScore,
      recoveryBand: record.recoveryBand,
      recoveryConfidence: record.recoveryConfidence,
      strainScore: record.strainScore,
      strainTargetLow: record.strainTargetLow,
      strainTargetHigh: record.strainTargetHigh,
      strainTargetSource: record.strainTargetSource,
      sleepScore: record.sleepScore,
      sleepNeedMinutes: record.sleepNeedMinutes,
      sleepDebtMinutes: record.sleepDebtMinutes,
      sleepConfidence: record.sleepConfidence,
      updatedAt: record.updatedAt
    };
    saveLocalDaily(updatedDaily);

    // If online and not demo user, persist to Firestore
    if (athleteId && athleteId !== "demo-athlete-001" && typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const dayRef = doc(db, "athletes", athleteId, "days", date);
        await setDoc(dayRef, sanitizeForFirestore(updatedDaily), { merge: true });
        useSyncStatusStore.getState().setSaved();
      } catch (err) {
        console.warn("Could not save daily scores to Firestore:", err);
      }
    }
  }

  return record;
}

/**
 * Recomputes scores for a range of dates (e.g. after backdated session or deletion).
 */
export async function recomputeScoresForDateRange(
  athleteId: string,
  dates: string[],
  options?: {
    sessions?: CompletedSessionDocument[];
    plannedWorkouts?: PlannedWorkout[];
    athleteLevel?: string;
    athleteCtl?: number;
  }
): Promise<DailyScoresRecord[]> {
  const results: DailyScoresRecord[] = [];
  for (const date of dates) {
    const res = await recomputeAndPersistDailyScores(athleteId, date, options);
    results.push(res);
  }
  return results;
}
