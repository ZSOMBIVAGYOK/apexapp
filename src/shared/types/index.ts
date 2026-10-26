export type UserRole = "athlete" | "coach" | "specialist";

export type AthleteLevel =
  | "hobby"
  | "competitive_amateur"
  | "national"
  | "national_team"
  | "olympic";

export type SpecialistDiscipline =
  | "dietitian"
  | "physiotherapist"
  | "strength_coach"
  | "sport_psychologist"
  | "physician";

export type DataMode = "device" | "manual" | "hybrid";

export type SupportMode = "solo" | "coach" | "specialist";

export type UnitSystem = "metric" | "imperial";

export type NutritionGoal = "maintain" | "lose" | "gain" | "performance";

export interface HealthDataConsent {
  accepted: boolean;
  version: string;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  locale: "hu" | "en";
  units: UnitSystem;
  timezone: string;
  roles: UserRole[];
  role?: UserRole; // primary or active view role
  specialties?: SpecialistDiscipline[];
  discipline?: SpecialistDiscipline;
  dataMode: DataMode;
  supportMode: SupportMode[];
  onboardingCompleted: boolean;
  consent: {
    healthData: HealthDataConsent;
  };
  createdAt: string;
  updatedAt: string;

  // Athlete Profile (Step 2)
  sports?: string[];
  sport?: string;
  level?: AthleteLevel;
  birthDate?: string;
  sex?: "male" | "female" | "other" | "prefer_not_to_say";
  heightCm?: number;
  weightKg?: number;
  goals?: string;
  targetCompetition?: string;
  targetCompetitionDate?: string;

  // Baseline metrics (Step 5)
  sleepHoursBaseline?: number;
  trainingDaysPerWeek?: number;
  restingHeartRateBaseline?: number;
  currentInjuries?: string;

  // Nutrition basics (Step 6)
  dietaryPreferences?: string[];
  allergiesIntolerances?: string[];
  nutritionGoal?: NutritionGoal;
  plateBasedViewOnly?: boolean;

  // Support invites (Step 4)
  supportInviteEmail?: string;
  supportInviteCode?: string;

  // Notification preferences
  notifications?: {
    morningReminder: boolean;
    workoutReminder: boolean;
    coachFeedback: boolean;
    weeklyReport: boolean;
  };
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
