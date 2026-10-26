export type UserRole = "athlete" | "coach" | "specialist";

export type AthleteLevel = "olympic" | "national" | "hobby";

export type SpecialistDiscipline =
  | "dietitian"
  | "physiotherapist"
  | "strength_coach"
  | "sport_psychologist"
  | "physician";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  sport?: string;
  level?: AthleteLevel;
  discipline?: SpecialistDiscipline;
  photoURL?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCheckIn {
  id: string;
  athleteId: string;
  date: string; // YYYY-MM-DD
  sleepHours: number;
  sleepQuality: number; // 1-10
  soreness: number; // 1-10
  stress: number; // 1-10
  energy: number; // 1-10
  restingHeartRate?: number;
  hrv?: number;
  notes?: string;
  readinessScore: number; // Calculated 0-100
  createdAt: string;
}

export type TrainingSessionType = "endurance" | "threshold" | "strength" | "recovery";

export interface TrainingSession {
  id: string;
  athleteId: string;
  date: string;
  title: string;
  type: TrainingSessionType;
  durationMinutes: number;
  targetIntensityRpe: number; // 1-10
  actualRpe?: number;
  completed: boolean;
  notes?: string;
}

export interface DailyNutrition {
  id: string;
  athleteId: string;
  date: string;
  targetCalories: number;
  consumedCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  waterLiters: number;
}

export interface ConnectedDevice {
  id: string;
  provider: "garmin" | "whoop" | "apple_health" | "polar";
  name: string;
  connected: boolean;
  lastSyncAt: string | null;
}

export interface SpecialistStaff {
  id: string;
  name: string;
  roleTitle: string;
  discipline: SpecialistDiscipline;
  email: string;
  avatarUrl?: string;
  status: "active" | "invited";
}
