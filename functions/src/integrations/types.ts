/**
 * Apex Server-Side Device Integrations - Core Domain Types
 *
 * Implements a provider-agnostic ingestion pipeline where all third-party
 * wearables and cloud APIs are mapped to uniform normalized models.
 */

export type DeviceProvider =
  | "whoop"
  | "garmin"
  | "polar"
  | "oura"
  | "file"
  | "apple_health"
  | "health_connect"
  | "manual"
  | "aggregator";

export type StandardSport =
  | "running"
  | "cycling"
  | "swimming"
  | "strength"
  | "triathlon"
  | "rowing"
  | "walking"
  | "other";

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
  laps?: NormalizedLap[];
  samplesRef?: string;
  rawPayloadRef?: string;
  sourceConfidence: number; // 0.0 - 1.0
  createdAt: string;
  mergedFrom?: Array<{ provider: DeviceProvider; providerRecordId: string }>;
}

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
  respiratoryRateBpm?: number;
  sleepScore?: number; // 0 - 100
  rawPayloadRef?: string;
  sourceConfidence: number;
  createdAt: string;
}


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
 * Server-only stored OAuth token structure (never sent to client).
 * Stored in integrations_tokens/{athleteId}_{provider}
 */
export interface ServerStoredToken {
  athleteId: string;
  provider: DeviceProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  scope?: string;
  providerUserId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client-facing device connection metadata.
 * Stored in athletes/{athleteId}/devices/{provider}
 */
export interface DeviceConnectionPublicStatus {
  provider: DeviceProvider;
  name: string;
  connected: boolean;
  status: "connected" | "disconnected" | "syncing" | "error" | "not_configured";
  lastSyncAt: string | null;
  isConfigured: boolean;
  error?: string;
  updatedAt: string;
}

/**
 * Common Adapter Interface for Server-Side Provider Integrations
 */
export interface IDeviceAdapterServer {
  readonly provider: DeviceProvider;
  readonly name: string;

  /** Checks whether developer credentials exist on the server */
  isConfigured(): boolean;

  /** Generates provider OAuth 2 authorization URL with state nonce */
  getAuthUrl(athleteId: string, redirectUri: string, state: string): string;

  /** Exchanges authorization code for tokens and persists them server-side */
  handleCallback(athleteId: string, code: string, redirectUri: string): Promise<ServerStoredToken>;

  /** Refreshes an expired access token using the refresh token */
  refreshToken(token: ServerStoredToken): Promise<ServerStoredToken>;

  /** Handles provider webhook event with cryptographic signature verification */
  handleWebhook(
    rawBody: string,
    headers: Record<string, string | undefined>
  ): Promise<{
    processed: boolean;
    athleteId?: string;
    eventType?: string;
    recordsCount?: number;
    error?: string;
  }>;

  /** Pulls historical data for the last N days (default: 30) */
  backfill(
    athleteId: string,
    token: ServerStoredToken,
    days?: number
  ): Promise<{
    activities: NormalizedActivity[];
    sleep: NormalizedSleep[];
    daily: NormalizedDaily[];
  }>;

  /** Revokes token and disconnects provider */
  disconnect(athleteId: string): Promise<boolean>;
}
