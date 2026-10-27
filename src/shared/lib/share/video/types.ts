export type VideoLayoutPreset = "bottom_bar" | "corner" | "minimal" | "race";

export type VideoFraming = "original" | "9:16";

export type VideoResolution = "1080p" | "720p";

export interface LiveMetricsConfig {
  speedPace: boolean;
  heartRate: boolean; // default false for privacy
  distance: boolean;
  elapsedTime: boolean;
  elevation: boolean;
  grade: boolean;
  power: boolean;
  cadence: boolean;
  routeDot: boolean;
  elevationDot: boolean;
}

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  aspectRatio: number;
  creationDate?: Date;
  rotation?: number; // 0, 90, 180, 270
  sizeBytes: number;
  mimeType: string;
}

export interface VideoTrim {
  startSec: number;
  endSec: number;
}

export interface VideoSyncState {
  /**
   * Offset from workout start in seconds at video timestamp 0.
   * e.g., offset = 300 means video start corresponds to second 300 of the workout.
   */
  workoutOffsetSec: number;
  /**
   * Auto-suggested offset from MP4 creation date metadata, if available.
   */
  autoSuggestedOffset?: number;
  autoSuggestedConfidence?: "high" | "medium" | "low";
}

export interface HeartRateZoneInfo {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  color: string;
  minHr: number;
  maxHr: number;
}

export interface LiveWorkoutData {
  timeOffsetSec: number;
  // Formatted tabular values (guaranteed fixed decimals to prevent jitter)
  speedFormatted?: string;
  speedUnit?: string;
  paceFormatted?: string;
  paceUnit?: string;
  heartRateFormatted?: string;
  heartRateZone?: HeartRateZoneInfo;
  distanceFormatted?: string;
  distanceUnit?: string;
  elapsedTimeFormatted?: string;
  elevationFormatted?: string;
  elevationUnit?: string;
  gradeFormatted?: string;
  powerFormatted?: string;
  powerUnit?: string;
  cadenceFormatted?: string;
  cadenceUnit?: string;
  // Route position
  routePointIndex?: number;
  routePointFraction?: number; // 0.0 to 1.0 along the route
  currentLat?: number;
  currentLon?: number;
  // Raw interpolated values
  rawSpeedMps?: number;
  rawHeartRate?: number;
  rawPowerWatts?: number;
  rawElevationMeters?: number;
  rawDistanceMeters?: number;
  rawGradePercent?: number;
}

export interface VideoExportOptions {
  resolution: VideoResolution;
  format: "video/mp4" | "video/webm";
  layout: VideoLayoutPreset;
  framing: VideoFraming;
  metrics: LiveMetricsConfig;
  trim: VideoTrim;
  workoutOffsetSec: number;
  introCard: boolean; // 1.5s intro card
  outroCard: boolean; // 2.0s summary card
  dimming: number; // 0.0 to 0.8
  showBranding: boolean;
  showSafeZones?: boolean;
}

export interface VideoExportProgress {
  progress: number; // 0 to 100
  currentSec: number;
  totalSec: number;
  estimatedRemainingSec?: number;
}

export interface VideoExportResult {
  blob: Blob;
  url: string;
  filename: string;
  durationSec: number;
  resolution: string;
  format: string;
}
