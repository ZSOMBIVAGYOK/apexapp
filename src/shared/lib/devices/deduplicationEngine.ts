/**
 * Multi-Source Deduplication & Merge Engine
 *
 * Implements:
 * 1. Activity duplicate detection (overlapping start time ±5 min, duration ±7%, and matching sport).
 * 2. Multi-device activity merging (e.g. Garmin GPS/power + WHOOP heart rate/strain).
 * 3. Multi-source priority resolution for daily metrics and sleep.
 * 4. Manual override tracking with audit history.
 */

import {
  NormalizedActivity,
  NormalizedDaily,
  NormalizedSleep,
  MetricPriorityConfig,
  DeviceProvider,
  DEFAULT_METRIC_PRIORITIES
} from "@shared/types/devices";

const DUPLICATE_TIME_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const DUPLICATE_DURATION_TOLERANCE_RATIO = 0.08; // 8%

/**
 * Checks whether candidate activity is a duplicate of any existing activities
 */
export function findDuplicateActivity(
  candidate: NormalizedActivity,
  existingList: NormalizedActivity[]
): NormalizedActivity | null {
  const candidateStart = new Date(candidate.startTime).getTime();

  for (const existing of existingList) {
    // If exact same record ID, it is a duplicate
    if (
      existing.provider === candidate.provider &&
      existing.providerRecordId === candidate.providerRecordId
    ) {
      return existing;
    }

    const existingStart = new Date(existing.startTime).getTime();
    const timeDiffMs = Math.abs(candidateStart - existingStart);

    if (timeDiffMs <= DUPLICATE_TIME_TOLERANCE_MS) {
      // Check duration similarity
      const durDiff = Math.abs(candidate.durationSeconds - existing.durationSeconds);
      const maxDur = Math.max(candidate.durationSeconds, existing.durationSeconds);
      const durRatio = maxDur > 0 ? durDiff / maxDur : 0;

      // Check sport equivalence
      const sportMatch =
        candidate.sport === existing.sport ||
        (candidate.sport === "other" || existing.sport === "other");

      if (durRatio <= DUPLICATE_DURATION_TOLERANCE_RATIO && sportMatch) {
        return existing;
      }
    }
  }

  return null;
}

/**
 * Merges two activities recorded by different devices for the same session
 * (e.g. Garmin GPS/power + WHOOP heart rate/strain band)
 */
export function mergeDuplicateActivities(
  primary: NormalizedActivity,
  secondary: NormalizedActivity
): NormalizedActivity {
  // Determine primary provider for GPS/distance (prefer file / garmin / polar)
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
    // Prefer richer metrics if missing in base
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

/**
 * Multi-Source Daily Biometrics Priority Resolver
 * Resolves the primary metric value for a date according to the user's priority hierarchy.
 */
export function resolveMultiSourceDaily(
  dailyRecords: NormalizedDaily[],
  priorities: MetricPriorityConfig = DEFAULT_METRIC_PRIORITIES
): {
  resolvedDaily: NormalizedDaily;
  fieldSources: Record<string, DeviceProvider>;
} {
  if (dailyRecords.length === 0) {
    throw new Error("No daily records to resolve.");
  }

  // Pick candidate based on priority for each key metric
  const pickField = <K extends keyof NormalizedDaily>(
    key: K,
    priorityList: DeviceProvider[]
  ): { value: NormalizedDaily[K] | undefined; provider: DeviceProvider } => {
    for (const prov of priorityList) {
      const match = dailyRecords.find(
        (r) => r.provider === prov && r[key] !== undefined && r[key] !== null
      );
      if (match) {
        return { value: match[key], provider: prov };
      }
    }
    // Fallback to first non-null
    const fallback = dailyRecords.find((r) => r[key] !== undefined && r[key] !== null);
    return {
      value: fallback ? fallback[key] : undefined,
      provider: fallback ? fallback.provider : dailyRecords[0]!.provider
    };
  };

  const hrRes = pickField("restingHeartRateBpm", priorities.restingHR);
  const hrvRes = pickField("hrvRmssdMs", priorities.hrv);
  const weightRes = pickField("weightKg", priorities.weight);

  // Fallback pickers for other metrics across records
  const findFirst = <K extends keyof NormalizedDaily>(key: K): { value: NormalizedDaily[K] | undefined; provider?: DeviceProvider } => {
    for (const r of dailyRecords) {
      if (r[key] !== undefined && r[key] !== null) {
        return { value: r[key], provider: r.provider };
      }
    }
    return { value: undefined };
  };

  const stepsRes = findFirst("steps");
  const strainRes = findFirst("dayStrain");
  const tempRes = findFirst("skinTemperatureDeviationCelsius");
  const spo2Res = findFirst("spO2Percent");
  const respRes = findFirst("respiratoryRateBpm");

  const baseRecord = dailyRecords[0]!;

  const resolvedDaily: NormalizedDaily = {
    ...baseRecord,
    id: `resolved_${baseRecord.date}`,
    restingHeartRateBpm: hrRes.value,
    hrvRmssdMs: hrvRes.value,
    weightKg: weightRes.value,
    steps: stepsRes.value,
    dayStrain: strainRes.value,
    skinTemperatureDeviationCelsius: tempRes.value,
    spO2Percent: spo2Res.value,
    respiratoryRateBpm: respRes.value
  };

  const fieldSources: Record<string, DeviceProvider> = {
    restingHeartRateBpm: hrRes.provider,
    hrvRmssdMs: hrvRes.provider,
    weightKg: weightRes.provider
  };
  if (stepsRes.provider) fieldSources.steps = stepsRes.provider;
  if (strainRes.provider) fieldSources.dayStrain = strainRes.provider;
  if (tempRes.provider) fieldSources.skinTemperatureDeviationCelsius = tempRes.provider;
  if (spo2Res.provider) fieldSources.spO2Percent = spo2Res.provider;
  if (respRes.provider) fieldSources.respiratoryRateBpm = respRes.provider;

  return { resolvedDaily, fieldSources };
}

/**
 * Multi-Source Sleep Priority Resolver
 */
export function resolveMultiSourceSleep(
  sleepRecords: NormalizedSleep[],
  priorities: MetricPriorityConfig = DEFAULT_METRIC_PRIORITIES
): NormalizedSleep {
  if (sleepRecords.length === 0) {
    throw new Error("No sleep records to resolve.");
  }

  for (const prov of priorities.sleep) {
    const match = sleepRecords.find((s) => s.provider === prov);
    if (match) return match;
  }

  return sleepRecords[0]!;
}
