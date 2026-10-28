/**
 * Device Integration & Normalized Biometric Domain Types
 *
 * Implements a provider-agnostic ingestion pipeline where every source
 * (file import, Garmin, WHOOP, Polar, Oura, Native Wrapper, Aggregator)
 * normalizes data into standard schemas before ingestion.
 */

export type DeviceProvider =
  | "file"
  | "garmin"
  | "whoop"
  | "polar"
  | "oura"
  | "apple_health"
  | "health_connect"
  | "manual"
  | "aggregator";

export type StandardSport =
  | "running"
  | "trail_running"
  | "road_cycling"
  | "cycling"
  | "mountain_biking"
  | "gravel_cycling"
  | "swimming"
  | "open_water_swimming"
  | "stand_up_paddling"
  | "kayak"
  | "canoe"
  | "rafting"
  | "rowing"
  | "rowing_ergometer"
  | "sailing"
  | "windsurfing"
  | "kitesurfing"
  | "surfing"
  | "strength"
  | "functional_fitness"
  | "crossfit"
  | "triathlon"
  | "duathlon"
  | "aquathlon"
  | "walking"
  | "walking_hiking"
  | "hiking"
  | "cross_country_skiing"
  | "alpine_skiing"
  | "ski_touring"
  | "roller_skiing"
  | "snowboarding"
  | "climbing_bouldering"
  | "yoga"
  | "pilates"
  | "other"
  | (string & {});

export interface NormalizedLap {
  index: number;
  startTime: string;
  durationSeconds: number;
  distanceMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPowerWatts?: number;
  avgPaceSecondsPerKm?: number;
  calories?: number;
}

export interface NormalizedStrengthSet {
  index: number;
  type: "active" | "rest"; // 1 = active, 0 = rest
  durationSeconds?: number;
  repetitions?: number;
  weightKg?: number;
  category?: number | string;
  categorySubtype?: number | string;
  exerciseName?: string;
  startTimeIso?: string;
  startOffsetSeconds?: number;
  endOffsetSeconds?: number;
}

/**
 * Normalized Activity Record across all providers
 */
export interface NormalizedActivity {
  id: string;
  userId: string;
  provider: DeviceProvider;
  providerRecordId: string;
  sport: StandardSport;
  sportRawName?: string;
  title: string;
  startTime: string; // ISO 8601
  durationSeconds: number;
  distanceMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPowerWatts?: number;
  maxPowerWatts?: number;
  normalizedPowerWatts?: number;
  avgPaceSecondsPerKm?: number;
  elevationGainMeters?: number;
  elevationLossMeters?: number;
  calories?: number;
  trainingLoad?: number; // TSS, hrTSS, or session-RPE
  loadSourceLabelHu?: string;
  warningsHu?: string[];
  timeSeries?: any;
  laps?: NormalizedLap[];
  strengthSets?: NormalizedStrengthSet[];
  samplesRef?: string; // Reference to Cloud Storage time-series sample (FIT/TCX points)
  rawPayloadRef?: string;
  sourceConfidence: number; // 0.0 - 1.0
  createdAt: string;
  mergedFrom?: Array<{ provider: DeviceProvider; providerRecordId: string }>;
}

/**
 * Normalized Sleep Record across all providers
 */
export interface SleepStages {
  deepMinutes?: number;
  remMinutes?: number;
  lightMinutes?: number;
  awakeMinutes?: number;
}

export interface NormalizedSleep {
  id: string;
  userId: string;
  provider: DeviceProvider;
  providerRecordId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  durationMinutes: number;
  efficiencyScore?: number; // 0 - 100%
  stages: SleepStages;
  hrvBaselineMs?: number;
  restingHeartRateBpm?: number;
  sleepScore?: number; // 0 - 100
  rawPayloadRef?: string;
  sourceConfidence: number;
  createdAt: string;
}

/**
 * Normalized Daily Biometrics & Readiness Record
 */
export interface NormalizedDaily {
  id: string;
  userId: string;
  provider: DeviceProvider;
  providerRecordId: string;
  date: string; // YYYY-MM-DD
  restingHeartRateBpm?: number;
  hrvRmssdMs?: number;
  hrvSdnnMs?: number;
  steps?: number;
  dayStrain?: number; // 0.0 - 21.0 (WHOOP style) or TRIMP daily
  skinTemperatureDeviationCelsius?: number;
  spO2Percent?: number;
  respiratoryRateBpm?: number;
  weightKg?: number;
  rawPayloadRef?: string;
  sourceConfidence: number;
  createdAt: string;
}

/**
 * Connection state for a wearable or third-party service
 */
export interface DeviceConnection {
  id: DeviceProvider;
  provider: DeviceProvider;
  name: string;
  connected: boolean;
  status: "connected" | "disconnected" | "syncing" | "error" | "mock_active" | "not_configured";
  lastSyncAt: string | null;
  isConfigured?: boolean;
  scopes?: string[];
  mockMode?: boolean;
  error?: string;
  dataQualityNotice?: string;
}


/**
 * User-configured multi-source priority hierarchy per metric
 */
export interface MetricPriorityConfig {
  sleep: DeviceProvider[];
  activity: DeviceProvider[];
  hrv: DeviceProvider[];
  restingHR: DeviceProvider[];
  weight: DeviceProvider[];
}

export const DEFAULT_METRIC_PRIORITIES: MetricPriorityConfig = {
  sleep: ["whoop", "oura", "garmin", "apple_health", "manual"],
  activity: ["garmin", "polar", "whoop", "file", "apple_health", "manual"],
  hrv: ["whoop", "oura", "garmin", "apple_health"],
  restingHR: ["garmin", "whoop", "oura", "polar", "apple_health", "manual"],
  weight: ["manual", "garmin", "apple_health"]
};

/**
 * Result of a file import (FIT, TCX, GPX, CSV)
 */
export interface FileImportItem {
  id: string;
  fileName: string;
  fileType: "fit" | "tcx" | "gpx" | "csv";
  fileSizeBytes: number;
  status: "created" | "duplicate" | "failed";
  reason?: string;
  activity?: NormalizedActivity;
  uploadedAt: string;
}

export interface FileImportBatchResult {
  batchId: string;
  totalFiles: number;
  createdCount: number;
  duplicateCount: number;
  failedCount: number;
  items: FileImportItem[];
}

/**
 * Generic Device Adapter Interface
 */
export interface IDeviceAdapter {
  readonly provider: DeviceProvider;
  readonly name: string;
  readonly isMock: boolean;

  connect(
    userId: string,
    redirectUri: string,
    options?: Record<string, unknown>
  ): Promise<{ authUrl?: string; connected: boolean; state?: string }>;

  handleWebhook(
    payload: unknown,
    headers?: Record<string, string>
  ): Promise<{ processed: boolean; recordsCount: number; errors?: string[] }>;

  backfill(
    userId: string,
    since: Date
  ): Promise<{
    activities: NormalizedActivity[];
    sleep: NormalizedSleep[];
    daily: NormalizedDaily[];
  }>;

  refresh(userId: string): Promise<boolean>;

  disconnect(userId: string): Promise<boolean>;
}
