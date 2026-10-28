import { UserRole } from "./index";
import { StrengthExercise } from "./training";

/**
 * Standard data record metadata required on EVERY record
 */
export type DataSourceOrigin = "manual" | "garmin" | "whoop" | "file" | "apple_health" | "polar" | "other";

export interface StandardRecordMetadata {
  source: DataSourceOrigin;
  confidence: number; // 0 to 1
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  updatedBy: string; // User UID
  deletedAt?: string | null;
  deletedBy?: string;
  schemaVersion?: number;
}

/**
 * Supported sharing modules in Apex
 */
export type SharingModule = "training" | "recovery" | "nutrition" | "health" | "devices" | "messages";

/**
 * Access levels for a sharing module
 */
export type PermissionLevel = "none" | "read" | "write";

export type ModulePermissions = Record<SharingModule, PermissionLevel>;

/**
 * Relationship member roles and specialties
 */
export type MemberRole = "coach" | "specialist";

export type MemberSpecialty =
  | "nutrition"
  | "physio"
  | "strength"
  | "psychology"
  | "medical"
  | "other";

export type RelationshipStatus = "pending" | "active" | "revoked";

/**
 * Core Relationship document in relationships/{relId}
 */
export interface SharingRelationship {
  relId: string; // Convention: ${athleteId}_${memberId}
  athleteId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberRole: MemberRole;
  specialty: MemberSpecialty;
  status: RelationshipStatus;
  permissions: ModulePermissions;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Permission change audit log entry in relationships/{relId}/log/{logId}
 */
export interface RelationshipAuditLogEntry {
  logId: string;
  relId: string;
  athleteId: string;
  performedBy: string;
  action: "created" | "permissions_updated" | "revoked" | "accepted";
  previousPermissions?: Partial<ModulePermissions>;
  newPermissions?: Partial<ModulePermissions>;
  previousStatus?: RelationshipStatus;
  newStatus?: RelationshipStatus;
  timestamp: string;
  reason?: string;
}

/**
 * Invitation document in invites/{code}
 */
export interface SharingInvite {
  code: string; // E.g., 'APX-9K2L'
  athleteId: string;
  athleteName: string;
  athleteEmail: string;
  inviteeEmail?: string;
  memberRole: MemberRole;
  specialty: MemberSpecialty;
  permissions: ModulePermissions;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
  createdAt: string;
}

/**
 * Competitions in athlete profile
 */
export interface AthleteCompetition {
  id: string;
  name: string;
  date: string;
  priority: "A" | "B" | "C";
  location?: string;
  targetTime?: string;
  notes?: string;
}

/**
 * Biometric & physiological thresholds
 */
export interface AthleteThresholds {
  maxHR?: number; // Maximum heart rate (bpm)
  lthr?: number; // Lactate threshold heart rate (bpm)
  ftp?: number; // Functional threshold power (Watts)
  thresholdPace?: string; // Threshold run pace (e.g. "3:45 /km")
  css?: string; // Critical swim speed (e.g. "1:15 /100m")
}

/**
 * Athlete document in athletes/{athleteId} (athleteId = uid)
 */
export interface AthleteProfileDocument extends StandardRecordMetadata {
  athleteId: string;
  sport: string;
  sports: string[];
  level: "hobby" | "competitive_amateur" | "national" | "national_team" | "olympic";
  birthDate?: string;
  sex?: "male" | "female" | "other" | "prefer_not_to_say";
  heightCm?: number;
  weightKg?: number;
  thresholds: AthleteThresholds;
  goals?: string;
  competitions: AthleteCompetition[];
}

/**
 * Physiological readiness driver entry
 */
export interface ReadinessDriver {
  id: string;
  label: string;
  impact: "positive" | "negative";
  category: "sleep" | "hrv" | "rhr" | "wellness" | "load";
}

/**
 * Daily aggregate in athletes/{id}/days/{yyyy-MM-dd}
 */
export interface DailyAggregateDocument extends StandardRecordMetadata {
  date: string; // YYYY-MM-DD
  athleteId: string;
  sleep: {
    durationMinutes: number;
    qualityScore: number; // 1-5 or 1-10
    bedTime?: string;
    wakeTime?: string;
    deepMinutes?: number;
    remMinutes?: number;
    awakeMinutes?: number;
  };
  hrv?: {
    rmssd: number;
    score?: number; // 0-100
    status?: "low" | "balanced" | "high";
  };
  restingHeartRate?: number;
  weightKg?: number;
  subjective: {
    fatigue?: number; // 1-5 (Hooper)
    soreness: number; // 1-5 (Hooper) or 1-10
    stress: number; // 1-5 (Hooper) or 1-10
    energy?: number; // 1-10
    mood?: number; // 1-5 (Hooper) or 1-10
    motivation?: number; // 1-5 (Hooper)
    appetite?: number; // 1-5 (Hooper)
    illness?: boolean;
    soreAreas?: string[]; // Anatomical areas marked on body map
    sleepQuality?: number; // 1-5 or 1-10
  };
  readinessScore: number; // 0-100
  readinessStatus: "ready" | "caution" | "rest";
  readinessConfidence?: number; // 0-100
  readinessDrivers?: ReadinessDriver[];
  isCalibrating?: boolean;
  calibrationDays?: number;
  sourceFlags?: {
    sleepSource?: DataSourceOrigin;
    hrvSource?: DataSourceOrigin;
    rhrSource?: DataSourceOrigin;
    wellnessSource?: DataSourceOrigin;
  };
  notes?: string;
}

export interface SessionTimeSeriesPoint {
  timeOffsetSeconds: number;
  heartRate?: number;
  powerWatts?: number;
  speedMps?: number;
  paceSecondsPerKm?: number;
  cadence?: number;
  temperatureCelsius?: number;
  elevationMeters?: number;
  distanceMeters?: number;
  lat?: number;
  lon?: number;
}

export interface SessionTimeSeriesData {
  points: SessionTimeSeriesPoint[];
  svgRouteOutline?: string;
}

/**
 * Completed training session in athletes/{id}/sessions/{sessionId}
 */
export interface CompletedSessionDocument extends StandardRecordMetadata {
  sessionId: string;
  athleteId: string;
  date: string; // YYYY-MM-DD
  sport: string;
  title: string;
  startTime: string; // ISO
  durationMinutes: number;
  durationSeconds?: number; // Optional high precision duration
  rpe: number; // 1-10
  targetIntensityRpe: number; // 1-10
  trainingLoad?: number; // Calculated TRIMP / TSS / sRPE
  metrics?: {
    avgHeartRate?: number;
    maxHeartRate?: number;
    avgPower?: number;
    avgPowerWatts?: number;
    normalizedPower?: number;
    distanceMeters?: number;
    elevationGainMeters?: number;
    avgPace?: string;
    calories?: number;
  };
  intervals?: Array<{
    index: number;
    type: "work" | "rest";
    durationSeconds: number;
    targetIntensity?: string;
    actualValue?: string;
  }>;
  coachFeedback?: string;
  notes?: string;
  strengthExercises?: StrengthExercise[];
  equipmentIds?: string[];
  courseId?: string;
  // File import tracking & downsampled time series (max ~500 points)
  fileRef?: string;
  fileType?: "fit" | "gpx" | "tcx" | "csv";
  fileName?: string;
  fileSizeBytes?: number;
  importedAt?: string;
  timeSeries?: SessionTimeSeriesData;
  completed: boolean;
}

/**
 * Planned workout in athletes/{id}/plannedWorkouts/{id}
 */
export interface PlannedWorkoutDocument extends StandardRecordMetadata {
  workoutId: string;
  athleteId: string;
  date: string; // YYYY-MM-DD
  sport: string;
  title: string;
  plannedDurationMinutes: number;
  targetRpe: number;
  structuredSteps?: string;
  assignedBy: string; // uid of coach or athlete
  status: "scheduled" | "completed" | "skipped";
}

/**
 * Daily Nutrition in athletes/{id}/nutritionDays/{date}
 */
export interface DailyNutritionDocument extends StandardRecordMetadata {
  date: string; // YYYY-MM-DD
  athleteId: string;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  targetHydrationLiters: number;
  consumedCalories: number;
  consumedProteinGrams: number;
  consumedCarbsGrams: number;
  consumedFatGrams: number;
  consumedHydrationLiters: number;
  platePortions?: {
    proteinPct: number;
    vegPct: number;
    carbsPct: number;
  };
}

/**
 * Nutrition Entry in athletes/{id}/nutritionDays/{date}/entries/{id}
 */
export interface NutritionEntryDocument extends StandardRecordMetadata {
  entryId: string;
  date: string;
  athleteId: string;
  mealType: "breakfast" | "pre_workout" | "post_workout" | "lunch" | "dinner" | "snack" | "hydration";
  name: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  waterMilliliters: number;
  loggedAt: string;
}

/**
 * Injury Record in athletes/{id}/injuries/{id} (HEALTH module)
 */
export interface InjuryDocument extends StandardRecordMetadata {
  injuryId: string;
  athleteId: string;
  title: string;
  anatomicalLocation: string;
  side?: "left" | "right" | "bilateral" | "axial";
  severity: "mild" | "moderate" | "severe";
  onsetDate: string;
  status: "active" | "rehab" | "resolved";
  diagnosis?: string;
  treatmentPlan?: string;
  restrictions?: string[];
}

/**
 * Measurement Record in athletes/{id}/measurements/{id} (HEALTH module)
 */
export interface MeasurementDocument extends StandardRecordMetadata {
  measurementId: string;
  athleteId: string;
  date: string;
  type: "body_composition" | "lactate_test" | "vo2_max" | "blood_panel" | "mobility_screen";
  values: Record<string, number | string>;
  practitionerNotes?: string;
}

/**
 * Confidential Note in athletes/{id}/notes/{id} (HEALTH module)
 */
export interface ConfidentialNoteDocument extends StandardRecordMetadata {
  noteId: string;
  athleteId: string;
  category: "medical" | "physio" | "psychology" | "general";
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  confidentiality: "standard" | "restricted";
}

/**
 * In-app messaging thread in threads/{threadId}
 */
export interface ThreadDocument {
  threadId: string;
  athleteId: string;
  participantIds: string[];
  subject: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface MessageDocument {
  messageId: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  readBy: string[];
}
