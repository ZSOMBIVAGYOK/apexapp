/**
 * RECOVERY ACTIVITIES & PROTOCOLS DOMAIN TYPES
 */

export type RecoveryCategory =
  | "mobility_gymnastics" // Mobilitás és torna
  | "cold" // Hideg
  | "heat" // Meleg
  | "contrast" // Kontraszt
  | "massage_therapy" // Masszázs és terápia
  | "sleep_relaxation" // Alvás és relaxáció
  | "other"; // Egyéb

export interface RecoveryActivityType {
  id: string;
  athleteId?: string; // undefined if standard catalog, athleteId if user custom
  nameHu: string;
  nameEn: string;
  category: RecoveryCategory;
  icon: string;
  showTemperature?: boolean;
  showRounds?: boolean;
  showBodyArea?: boolean;
  showIntensity?: boolean;
  defaultDurationMinutes?: number;
  isCustom?: boolean;
  isFavorite?: boolean;
}

export interface RecoveryActivityLog {
  id: string;
  athleteId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  activityTypeId: string;
  activityName: string;
  category: RecoveryCategory;
  durationMinutes: number;
  temperatureCelsius?: number;
  rounds?: number;
  bodyArea?: string;
  intensity?: "low" | "medium" | "high";
  perceivedEffect: number; // 1 to 5 scale
  notes?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface RecoveryWeeklySummary {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  byCategory: Record<RecoveryCategory, number>;
  totalActivitiesCount: number;
}
