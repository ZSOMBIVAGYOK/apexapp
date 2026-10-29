/**
 * Coach & Specialist Workspace Domain Types
 */

import { UserRole } from "./index";
import { ModulePermissions, MemberRole, MemberSpecialty, RelationshipStatus, SharingModule } from "./dataModel";

export type AlertType =
  | "missed_checkins"
  | "readiness_red"
  | "load_spike"
  | "sleep_deprivation"
  | "rapid_weight_change"
  | "reported_illness"
  | "reported_injury"
  | "low_compliance"
  | "low_energy_availability"
  | "sustained_high_strain"
  | "consecutive_low_sleep";

export type AlertSeverity = "info" | "caution" | "critical";

export interface AlertAnnotation {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

export interface AthleteAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  type: AlertType;
  module: SharingModule;
  severity: AlertSeverity;
  title: string;
  message: string;
  metricValue?: string | number;
  thresholdValue?: string | number;
  createdAt: string;
  status: "active" | "acknowledged" | "snoozed";
  snoozedUntil?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  annotations?: AlertAnnotation[];
}

export interface AthleteAlertThresholds {
  missedCheckinDays: number; // default: 3
  readinessRedDays: number; // default: 2
  acwrThreshold: number; // default: 1.5
  minSleepDurationHours: number; // default: 6.0
  rapidWeightShiftPercent: number; // default: 2.0
  minWeeklyCompliancePercent: number; // default: 60
  lowEnergyAvailabilityDeficitPercent: number; // default: 40
  sustainedHighStrainDays?: number; // default: 3
  lowSleepScoreNights?: number; // default: 3
}

export const DEFAULT_ALERT_THRESHOLDS: AthleteAlertThresholds = {
  missedCheckinDays: 3,
  readinessRedDays: 2,
  acwrThreshold: 1.5,
  minSleepDurationHours: 6.0,
  rapidWeightShiftPercent: 2.0,
  minWeeklyCompliancePercent: 60,
  lowEnergyAvailabilityDeficitPercent: 40,
  sustainedHighStrainDays: 3,
  lowSleepScoreNights: 3
};

export interface CoachAthleteRosterItem {
  athleteId: string;
  displayName: string;
  photoURL?: string | null;
  sport: string;
  group?: string; // e.g. "Felnőtt Keret", "U23 Triatlon", "Maraton"
  readinessScore?: number; // 0-100
  readinessZone?: "ready" | "caution" | "rest";
  readinessConfidence?: number; // 0-1
  // Three Scores fields:
  recoveryScore?: number;
  recoveryBand?: "green" | "amber" | "red";
  strainScore?: number;
  strainTargetStatus?: "below" | "in_range" | "above";
  sleepScore?: number;
  lastCheckInTime?: string; // ISO 8601 or relative
  sevenDayLoadTrend: "increasing" | "stable" | "decreasing";
  formTsb: number; // Training Stress Balance
  formStatus: "optimal" | "neutral" | "fatigued" | "overreaching";
  weeklyCompliancePercent: number; // 0-100%
  openAlertsCount: number;
  alerts: AthleteAlert[];
  permissions: ModulePermissions;
  status: RelationshipStatus;
  specialty?: MemberSpecialty;
  memberRole?: MemberRole;
}

export interface CoachMessageAttachment {
  name: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface CoachMessage {
  id: string;
  athleteId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderSpecialty?: MemberSpecialty;
  topic?: string; // e.g. "Általános", "Edzés", "Regeneráció", "Étrend", "Sérülés"
  text: string;
  attachments?: CoachMessageAttachment[];
  readBy: string[];
  readAt: Record<string, string>; // userId -> timestamp
  createdAt: string;
}

export interface CoachAthleteNote {
  id: string;
  athleteId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  isPrivateToStaff: boolean; // TRUE: Staff-only private note; FALSE: visible to athlete
  text: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffActivityLogEntry {
  id: string;
  athleteId: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  actionType:
    | "workout_created"
    | "workout_modified"
    | "target_updated"
    | "injury_logged"
    | "note_added"
    | "alert_acknowledged";
  description: string;
  timestamp: string;
}

export interface BulkWorkoutAssignment {
  targetType: "group" | "athletes";
  groupId?: string;
  athleteIds: string[];
  workout: {
    sport: string;
    title: string;
    date: string;
    durationMinutes: number;
    rpeTarget: number;
    description?: string;
  };
}

export interface BulkWeekCopyInput {
  sourceAthleteId: string;
  sourceWeekStart: string; // yyyy-MM-dd
  targetAthleteIds: string[];
  targetWeekStart: string; // yyyy-MM-dd
}
