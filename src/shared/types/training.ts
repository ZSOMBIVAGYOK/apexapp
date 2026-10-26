/**
 * DOMAIN TYPES: TRAINING, WORKOUT BUILDER, CALENDAR & LOAD ANALYTICS
 */

import { DataSourceOrigin } from "./dataModel";

export type SportType =
  | "running"
  | "cycling"
  | "swimming"
  | "strength"
  | "triathlon"
  | "rowing"
  | "mobility"
  | "other";

export type TargetMetricType = "rpe" | "hr_zone" | "power" | "pace" | "custom";

export interface StrengthExercise {
  id: string;
  name: string; // E.g. "Guggolás (Back Squat)", "Fekvenyomás", "Trapéz felhúzás"
  sets: number;
  reps: number;
  loadKg?: number;
  loadPercent1Rm?: number;
  rpe?: number; // 1-10
  restSeconds?: number;
  notes?: string;
}

export type WorkoutBlockType =
  | "warmup"
  | "main"
  | "interval"
  | "cooldown"
  | "strength"
  | "recovery";

export interface WorkoutBlock {
  id: string;
  name: string;
  title?: string;
  type: WorkoutBlockType;
  durationMinutes: number;
  distanceMeters?: number;
  targetType?: TargetMetricType | string;
  targetValue?: string | number; // e.g., 7 (RPE), "Z4" (HR), 280 (Watts), "3:50/km" (Pace)
  targetRpe?: number;
  targetZone?: number;
  targetPower?: number;
  targetPace?: string;
  repeats?: number; // E.g., 5 for 5x repeats
  restDurationMinutes?: number;
  workDurationSeconds?: number;
  restDurationSeconds?: number;
  workTarget?: string;
  restTarget?: string;
  strengthExercises?: StrengthExercise[];
  description?: string;
  notes?: string;
}

export type WorkoutStatus = "scheduled" | "completed" | "modified" | "skipped";

export type SkipReason =
  | "fatigue"
  | "time"
  | "injury"
  | "illness"
  | "weather"
  | "other";

export interface WorkoutAttachment {
  name: string;
  url: string;
  type: "document" | "link" | "file";
}

export interface WorkoutAuthor {
  id: string;
  name: string;
  role: "athlete" | "coach" | "solo_generator";
}

/**
 * Extended Planned Workout
 */
export interface PlannedWorkout {
  id: string;
  workoutId?: string;
  athleteId: string;
  author: WorkoutAuthor;
  date: string; // YYYY-MM-DD
  sport: SportType;
  title: string;
  description?: string;
  plannedDurationMinutes: number;
  targetRpe?: number; // 1-10
  plannedLoad: number; // TSS or sRPE (AU)
  blocks?: WorkoutBlock[];
  strengthExercises?: StrengthExercise[];
  structuredSteps?: string;
  assignedBy?: string; // UID of coach or athlete
  assignedByName?: string;
  assignedByRole?: "athlete" | "coach" | "solo_generator";
  status: WorkoutStatus;
  skipReason?: SkipReason | string;
  skipNotes?: string;
  modificationReason?: string;
  actualDurationMinutes?: number;
  actualRpe?: number;
  athleteFeedback?: string;
  athleteFeedbackComment?: string;
  completedSessionId?: string;
  attachments?: WorkoutAttachment[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  source?: DataSourceOrigin;
  confidence?: number;
}

/**
 * Workout Template
 */
export interface WorkoutTemplate {
  id: string;
  sport: SportType;
  title: string;
  description?: string;
  category?: "endurance" | "threshold" | "intervals" | "strength" | "recovery" | string;
  estimatedDurationMinutes: number;
  estimatedLoad: number;
  blocks: WorkoutBlock[];
  strengthExercises?: StrengthExercise[];
  tags?: string[];
  authorUid?: string;
  isSystem?: boolean;
}

/**
 * Periodization & Season Planning
 */
export type SeasonPhaseType = "transition" | "base" | "build" | "peak" | "taper" | "race";

export interface SeasonPhase {
  id: string;
  name: string;
  nameHu?: string;
  nameEn?: string;
  type: SeasonPhaseType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weeksCount?: number;
  targetWeeklyVolumeMinutes: number;
  targetWeeklyLoad: number;
  description: string;
  targetFocusHu?: string;
  targetFocusEn?: string;
  volumeMultiplier?: number; // e.g. 1.0, 0.8, 0.6
  color?: string;
}

export interface Competition {
  id: string;
  title: string;
  name?: string;
  date: string; // YYYY-MM-DD
  priority: "A" | "B" | "C";
  sport: string;
  distance?: string;
  location?: string;
  targetTime?: string;
  notes?: string;
}

/**
 * Tapering Plan
 */
export interface TaperDayPlan {
  dayIndex: number; // 1 to 14
  daysUntilRace: number;
  date: string;
  volumePercent: number; // e.g. 85, 75, 60, 45, 30...
  recommendedMinutes: number;
  guidelinesHu: string;
  guidelinesEn: string;
}

export interface TaperSchedule {
  preTaperWeeklyHours: number;
  taperDurationDays: number;
  totalVolumeReductionPercent: number;
  days: TaperDayPlan[];
  principlesHu: string[];
  principlesEn: string[];
}

/**
 * Training Zones (5-Zone Model)
 */
export interface ZoneDefinition {
  zoneNumber: 1 | 2 | 3 | 4 | 5;
  nameHu: string;
  nameEn: string;
  min: number | string;
  max: number | string;
  percentMin: number;
  percentMax: number;
  descriptionHu: string;
  descriptionEn: string;
  color: string;
}

export interface AthleteTrainingZones {
  hrZones: ZoneDefinition[];
  powerZones: ZoneDefinition[];
  paceZones: ZoneDefinition[];
  updatedAt: string;
}

/**
 * Performance Management Chart (PMC) & Load Metrics
 */
export interface PMCDataPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string;
  dayLoad: number; // Actual or projected daily TSS / sRPE
  ctl: number; // Chronic Training Load (Fitness, 42-day EWMA)
  atl: number; // Acute Training Load (Fatigue, 7-day EWMA)
  tsb: number; // Training Stress Balance (Form = CTL - ATL)
  isProjected?: boolean; // Future planned projection
  race?: Competition;
  phase?: SeasonPhase;
}

export interface LoadAnalyticsSummary {
  todayCtl: number; // Fitness
  todayAtl: number; // Fatigue
  todayTsb: number; // Form
  weeklyRampRate: number; // Change in CTL over last 7 days (optimal: 3-7)
  acwr: number; // Acute:Chronic Workload Ratio
  monotony: number; // Foster Monotony (Mean / SD over 7 days)
  strain: number; // Foster Strain (Total Load x Monotony)
  weeklyTotalLoad: number; // Sum of load over last 7 days
  weeklyCompletedHours: number;
  weeklyCompliancePercent: number; // Completed load / Planned load * 100
}
