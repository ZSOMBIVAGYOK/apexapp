import { z } from "zod";

export const deviceProviderSchema = z.enum([
  "file",
  "garmin",
  "whoop",
  "polar",
  "oura",
  "apple_health",
  "health_connect",
  "manual",
  "aggregator"
]);

export const standardSportSchema = z.enum([
  "running",
  "cycling",
  "swimming",
  "strength",
  "triathlon",
  "rowing",
  "walking",
  "other"
]);

export const normalizedLapSchema = z.object({
  index: z.number().int().min(0),
  startTime: z.string().datetime({ offset: true }),
  durationSeconds: z.number().nonnegative(),
  distanceMeters: z.number().nonnegative().optional(),
  avgHeartRate: z.number().positive().max(250).optional(),
  maxHeartRate: z.number().positive().max(250).optional(),
  avgPowerWatts: z.number().nonnegative().max(2500).optional(),
  avgPaceSecondsPerKm: z.number().positive().optional(),
  calories: z.number().nonnegative().optional()
});

export const normalizedActivitySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  provider: deviceProviderSchema,
  providerRecordId: z.string().min(1),
  sport: standardSportSchema,
  sportRawName: z.string().optional(),
  title: z.string().min(1),
  startTime: z.string().datetime({ offset: true }),
  durationSeconds: z.number().positive(),
  distanceMeters: z.number().nonnegative().optional(),
  avgHeartRate: z.number().positive().max(250).optional(),
  maxHeartRate: z.number().positive().max(250).optional(),
  avgPowerWatts: z.number().nonnegative().max(2500).optional(),
  maxPowerWatts: z.number().nonnegative().max(3000).optional(),
  normalizedPowerWatts: z.number().nonnegative().max(2500).optional(),
  avgPaceSecondsPerKm: z.number().positive().optional(),
  elevationGainMeters: z.number().nonnegative().optional(),
  elevationLossMeters: z.number().nonnegative().optional(),
  calories: z.number().nonnegative().optional(),
  trainingLoad: z.number().nonnegative().optional(),
  laps: z.array(normalizedLapSchema).optional(),
  samplesRef: z.string().optional(),
  rawPayloadRef: z.string().optional(),
  sourceConfidence: z.number().min(0).max(1),
  createdAt: z.string().datetime({ offset: true }),
  mergedFrom: z
    .array(
      z.object({
        provider: deviceProviderSchema,
        providerRecordId: z.string()
      })
    )
    .optional()
});

export const sleepStagesSchema = z.object({
  deepMinutes: z.number().nonnegative().optional(),
  remMinutes: z.number().nonnegative().optional(),
  lightMinutes: z.number().nonnegative().optional(),
  awakeMinutes: z.number().nonnegative().optional()
});

export const normalizedSleepSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  provider: deviceProviderSchema,
  providerRecordId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  durationMinutes: z.number().positive(),
  efficiencyScore: z.number().min(0).max(100).optional(),
  stages: sleepStagesSchema,
  hrvBaselineMs: z.number().positive().optional(),
  restingHeartRateBpm: z.number().positive().max(200).optional(),
  sleepScore: z.number().min(0).max(100).optional(),
  rawPayloadRef: z.string().optional(),
  sourceConfidence: z.number().min(0).max(1),
  createdAt: z.string().datetime({ offset: true })
});

export const normalizedDailySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  provider: deviceProviderSchema,
  providerRecordId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  restingHeartRateBpm: z.number().positive().max(200).optional(),
  hrvRmssdMs: z.number().positive().max(300).optional(),
  hrvSdnnMs: z.number().positive().max(400).optional(),
  steps: z.number().nonnegative().optional(),
  dayStrain: z.number().min(0).max(21).optional(),
  skinTemperatureDeviationCelsius: z.number().min(-5).max(5).optional(),
  spO2Percent: z.number().min(70).max(100).optional(),
  respiratoryRateBpm: z.number().min(5).max(40).optional(),
  weightKg: z.number().positive().max(300).optional(),
  rawPayloadRef: z.string().optional(),
  sourceConfidence: z.number().min(0).max(1),
  createdAt: z.string().datetime({ offset: true })
});

export const metricPriorityConfigSchema = z.object({
  sleep: z.array(deviceProviderSchema),
  activity: z.array(deviceProviderSchema),
  hrv: z.array(deviceProviderSchema),
  restingHR: z.array(deviceProviderSchema),
  weight: z.array(deviceProviderSchema)
});
