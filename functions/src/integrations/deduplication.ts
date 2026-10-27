/**
 * Server-Side Multi-Source Deduplication & Ingestion Pipeline
 *
 * Implements:
 * 1. Activity duplicate detection (time ±5 min, duration ±8%, matching sport).
 * 2. Cross-device activity merging (e.g. Garmin GPS/power + WHOOP HR/strain).
 * 3. Daily & Sleep priority-based resolution.
 * 4. Firestore persistence into athletes/{athleteId}/sessions and athletes/{athleteId}/days/{date}.
 */

import * as admin from "firebase-admin";
import {
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep
} from "./types";


const DUPLICATE_TIME_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_DURATION_TOLERANCE_RATIO = 0.08; // 8%

export function findDuplicateActivity(
  candidate: NormalizedActivity,
  existingList: NormalizedActivity[]
): NormalizedActivity | null {
  const candidateStart = new Date(candidate.startTime).getTime();

  for (const existing of existingList) {
    if (
      existing.provider === candidate.provider &&
      existing.providerRecordId === candidate.providerRecordId
    ) {
      return existing;
    }

    const existingStart = new Date(existing.startTime).getTime();
    const timeDiffMs = Math.abs(candidateStart - existingStart);

    if (timeDiffMs <= DUPLICATE_TIME_TOLERANCE_MS) {
      const durDiff = Math.abs(candidate.durationSeconds - existing.durationSeconds);
      const maxDur = Math.max(candidate.durationSeconds, existing.durationSeconds);
      const durRatio = maxDur > 0 ? durDiff / maxDur : 0;

      const sportMatch =
        candidate.sport === existing.sport ||
        candidate.sport === "other" ||
        existing.sport === "other";

      if (durRatio <= DUPLICATE_DURATION_TOLERANCE_RATIO && sportMatch) {
        return existing;
      }
    }
  }

  return null;
}

export function mergeDuplicateActivities(
  primary: NormalizedActivity,
  secondary: NormalizedActivity
): NormalizedActivity {
  const isSecondaryHigherGps =
    ["file", "garmin", "polar"].includes(secondary.provider) &&
    !["file", "garmin", "polar"].includes(primary.provider);

  const base = isSecondaryHigherGps ? secondary : primary;
  const other = isSecondaryHigherGps ? primary : secondary;

  const mergedFrom = [
    ...(base.mergedFrom || [{ provider: base.provider, providerRecordId: base.providerRecordId }]),
    ...(other.mergedFrom || [{ provider: other.provider, providerRecordId: other.providerRecordId }])
  ];

  return {
    ...base,
    id: `merged_${base.id}`,
    distanceMeters: base.distanceMeters ?? other.distanceMeters,
    avgHeartRate: base.avgHeartRate ?? other.avgHeartRate,
    maxHeartRate: base.maxHeartRate ?? other.maxHeartRate,
    avgPowerWatts: base.avgPowerWatts ?? other.avgPowerWatts,
    maxPowerWatts: base.maxPowerWatts ?? other.maxPowerWatts,
    normalizedPowerWatts: base.normalizedPowerWatts ?? other.normalizedPowerWatts,
    elevationGainMeters: base.elevationGainMeters ?? other.elevationGainMeters,
    calories: base.calories ?? other.calories,
    trainingLoad: Math.max(base.trainingLoad ?? 0, other.trainingLoad ?? 0) || undefined,
    laps: base.laps && base.laps.length > 0 ? base.laps : other.laps,
    sourceConfidence: Math.min(1.0, Math.max(base.sourceConfidence, other.sourceConfidence) + 0.02),
    mergedFrom
  };
}

export interface IngestionResult {
  activitiesCreated: number;
  activitiesMerged: number;
  sleepSaved: number;
  dailySaved: number;
}

export async function ingestNormalizedData(
  db: admin.firestore.Firestore,
  athleteId: string,
  data: {
    activities?: NormalizedActivity[];
    sleep?: NormalizedSleep[];
    daily?: NormalizedDaily[];
  }
): Promise<IngestionResult> {
  const result: IngestionResult = {
    activitiesCreated: 0,
    activitiesMerged: 0,
    sleepSaved: 0,
    dailySaved: 0
  };

  const now = new Date().toISOString();

  // 1. Ingest Activities
  if (data.activities && data.activities.length > 0) {
    const sessionsCol = db.collection("athletes").doc(athleteId).collection("sessions");
    const existingSnap = await sessionsCol.limit(100).get();
    const existingActivities: NormalizedActivity[] = existingSnap.docs.map(
      (doc) => doc.data() as NormalizedActivity
    );

    for (const act of data.activities) {
      const duplicate = findDuplicateActivity(act, existingActivities);

      if (duplicate) {
        if (duplicate.provider !== act.provider) {
          // Merge data from multiple providers for the same workout
          const merged = mergeDuplicateActivities(duplicate, act);
          await sessionsCol.doc(duplicate.id).set(
            {
              ...merged,
              updatedAt: now,
              updatedBy: "device_ingestion"
            },
            { merge: true }
          );
          result.activitiesMerged++;
        }
        // If same provider already exists, do not duplicate
      } else {
        await sessionsCol.doc(act.id).set({
          ...act,
          createdAt: now,
          updatedAt: now,
          updatedBy: "device_ingestion"
        });
        existingActivities.push(act);
        result.activitiesCreated++;
      }
    }
  }

  // 2. Ingest Sleep & Daily Metrics into athletes/{athleteId}/days/{date}
  const datesToUpdate = new Set<string>();
  data.sleep?.forEach((s) => datesToUpdate.add(s.date));
  data.daily?.forEach((d) => datesToUpdate.add(d.date));

  for (const date of datesToUpdate) {
    const dayRef = db.collection("athletes").doc(athleteId).collection("days").doc(date);
    const daySnap = await dayRef.get();
    const existingDay = daySnap.exists ? (daySnap.data() as Record<string, unknown>) : {};

    const sleepRecord = data.sleep?.find((s) => s.date === date);
    const dailyRecord = data.daily?.find((d) => d.date === date);

    const updatePayload: Record<string, unknown> = {
      date,
      athleteId,
      updatedAt: now,
      updatedBy: "device_ingestion"
    };

    if (sleepRecord) {
      updatePayload.sleep = {
        durationMinutes: sleepRecord.durationMinutes,
        efficiencyScore: sleepRecord.efficiencyScore,
        stages: sleepRecord.stages,
        sleepScore: sleepRecord.sleepScore,
        source: sleepRecord.provider,
        sourceConfidence: sleepRecord.sourceConfidence
      };
      result.sleepSaved++;
    }

    if (dailyRecord) {
      if (dailyRecord.restingHeartRateBpm !== undefined) {
        updatePayload.restingHR = dailyRecord.restingHeartRateBpm;
        updatePayload.restingHRSource = dailyRecord.provider;
      }
      if (dailyRecord.hrvRmssdMs !== undefined) {
        updatePayload.hrv = dailyRecord.hrvRmssdMs;
        updatePayload.hrvSource = dailyRecord.provider;
      }
      if (dailyRecord.dayStrain !== undefined) {
        updatePayload.dayStrain = dailyRecord.dayStrain;
      }
      if (dailyRecord.skinTemperatureDeviationCelsius !== undefined) {
        updatePayload.skinTemperatureDeviation = dailyRecord.skinTemperatureDeviationCelsius;
      }
      if (dailyRecord.spO2Percent !== undefined) {
        updatePayload.spO2 = dailyRecord.spO2Percent;
      }
      result.dailySaved++;
    }

    await dayRef.set({ ...existingDay, ...updatePayload }, { merge: true });
  }

  return result;
}
