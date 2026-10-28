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
  | "stand_up_paddling"
  | "mobility"
  | "other"
  | (string & {});

export type TargetMetricType = "rpe" | "hr_zone" | "power" | "pace" | "custom";

export interface StrengthExercise {
  id: string;
  libraryExerciseId?: string;
  name: string; // E.g. "Guggolás (Back Squat)", "Fekvenyomás", "Trapéz felhúzás"
  sets: number;
  reps: number;
  loadKg?: number;
  loadPercent1Rm?: number;
  rpe?: number; // 1-10
  restSeconds?: number;
  notes?: string;
  description?: string;
  videoUrl?: string;
}

export interface ExerciseDocument {
  id: string;
  athleteId: string;
  name: string;
  description?: string;
  videoUrl?: string;
  defaultSetsRepsLoad?: string;
  tags: string[]; // e.g. ["comb", "mell", "rúd", "kézisúlyzó", "saját testsúly"]
  category?: string;
  isFavorite: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  schemaVersion?: number;
}

export type TrainingBlockType =
  | "warmup" // Bemelegítés
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "cooldown" // Levezetés
  | "other" // Egyéb (egyedi névvel)
  // Backward compatibility with legacy WorkoutBlockType
  | "main"
  | "interval"
  | "strength"
  | "recovery"
  | (string & {});

export type WorkoutBlockType = TrainingBlockType;

export type BlockRowType = "exercise" | "endurance";

export interface RoundOverride {
  roundNumber: number; // 1-indexed (1, 2, 3...)
  reps?: number;
  loadKg?: number;
  rpe?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  completed?: boolean;
  notes?: string;
}

export interface TrainingBlockRow {
  id: string;
  type: BlockRowType; // "exercise" | "endurance"
  name?: string; // name or label
  groupCode?: string; // e.g. "A1", "A2", "B1" for supersets/circuits

  // Exercise fields:
  exerciseId?: string; // from exercise library if picked
  exerciseName?: string; // name from library or typed
  sets?: number; // default 1
  reps?: number;
  loadKg?: number;
  rpe?: number; // 1-10
  restBetweenSetsSeconds?: number; // optional rest between sets

  // Endurance / interval segment fields:
  durationSeconds?: number;
  distanceMeters?: number;
  target?: string; // e.g. "Z4", "3:50/km", "280W", "RPE 8"
  result?: string; // actual result: e.g. "3:48/km", "285W"

  // Completion:
  completed?: boolean;

  // Per-round variations ("Körönkénti eltérés"):
  roundOverrides?: RoundOverride[];

  notes?: string;
}

export interface TrainingBlockTimeRange {
  startOffsetSeconds: number;
  endOffsetSeconds: number;
}

export interface TrainingBlockStats {
  durationSeconds?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPowerWatts?: number;
  distanceMeters?: number;
  avgPace?: string;
  avgSpeedKmh?: number;
  timeInZonesSeconds?: Record<number, number>;
  tonnageKg?: number;
  totalReps?: number;
  totalRestSeconds?: number;
}

export interface TrainingBlock {
  id: string;
  type: TrainingBlockType;
  customTypeName?: string; // custom name if type === "other"
  label?: string; // optional user label, e.g. "Guggolás + Törzs"
  order?: number;
  notes?: string;
  rounds?: number; // default 1 ("Körök")
  completedRounds?: number; // planned vs completed rounds (e.g. planned 3, did 2)
  restBetweenRoundsSeconds?: number; // "Pihenő körök között"
  restAfterBlockSeconds?: number; // "Pihenő a blokk után"
  rpe?: number; // optional per-block RPE
  timeRange?: TrainingBlockTimeRange; // optional time range inside session
  stats?: TrainingBlockStats;
  rows?: TrainingBlockRow[];

  // Legacy WorkoutBlock compatibility fields:
  name?: string;
  title?: string;
  durationMinutes?: number;
  distanceMeters?: number;
  targetType?: TargetMetricType | string;
  targetValue?: string | number;
  targetRpe?: number;
  targetZone?: number;
  targetPower?: number;
  targetPace?: string;
  repeats?: number;
  restDurationMinutes?: number;
  workDurationSeconds?: number;
  restDurationSeconds?: number;
  workTarget?: string;
  restTarget?: string;
  strengthExercises?: StrengthExercise[];
  description?: string;
}

export type WorkoutBlock = TrainingBlock;

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
  deletedAt?: string | null;
  schemaVersion?: number;
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
