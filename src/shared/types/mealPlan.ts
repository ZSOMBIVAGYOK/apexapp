import { StandardRecordMetadata } from "./dataModel";
import { NutritionDayType } from "./nutrition";

export type MealPlanAuthorRole = "athlete" | "dietitian";

export type AllergenTag =
  | "gluten"
  | "lactose"
  | "nuts"
  | "soy"
  | "eggs"
  | "fish_shellfish"
  | "peanuts"
  | "sesame"
  | "celery"
  | "mustard";

export interface MealOptionIngredient {
  name: string;
  amount: number;
  unit: string; // "g", "ml", "db", "ek", "tk", "adag"
}

export interface MealPlanOption {
  id: string;
  sourceFoodId?: string; // id from curated or custom food
  isDeletedFood?: boolean; // true if source food was deleted from library
  name: string;
  label?: string; // e.g. "Magas szénhidrátos zabkása"
  authorRole: MealPlanAuthorRole;
  authorName?: string;
  authorUid?: string;
  photoUrl?: string;

  // Base nutritional values for 1.0x portion
  baseCalories: number;
  baseProteinGrams: number;
  baseCarbsGrams: number;
  baseFatGrams: number;
  baseServingGrams?: number;
  baseServingUnit?: string;

  // Portion limits
  minPortionMultiplier: number; // default 0.5
  maxPortionMultiplier: number; // default 2.0
  defaultPortionMultiplier: number; // default 1.0

  // Tags & Suitability
  tags: string[]; // e.g. "gyors", "edzés előtt", "edzés után", "pihenőnap", "nagy szénhidrát", "vegetáriánus"
  dayTypeTags: NutritionDayType[]; // "rest" | "light" | "moderate" | "hard" | "competition"

  // Day-type portion scaling multipliers (e.g. hard: 1.5, rest: 0.8)
  dayTypeScaling?: Partial<Record<NutritionDayType, number>>;

  // Allergens & Intolerances
  allergens?: AllergenTag[];

  // Recipe ingredients for shopping list aggregation
  ingredients?: MealOptionIngredient[];

  notes?: string; // Specialist or athlete notes
  usageCount?: number; // How often the athlete chooses this option
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MealPlanSlot {
  slotId: string; // "breakfast" | "lunch" | "dinner" | "snack" | "during_training" or custom
  name: string; // "Reggeli" | "Ebéd" | "Vacsora" etc.
  order: number;
  targetCaloriesRange?: { min: number; max: number };
  targetProteinRange?: { min: number; max: number };
  targetCarbsRange?: { min: number; max: number };
  targetFatRange?: { min: number; max: number };
  options: MealPlanOption[];
}

export interface MealPlanDocument extends StandardRecordMetadata {
  id: string;
  athleteId: string;
  title: string;
  description?: string;
  authorUid: string;
  authorRole: MealPlanAuthorRole;
  authorName: string;
  isActive: boolean;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD

  // Target ranges for the whole day
  targetCalories?: { min: number; max: number };
  targetProteinGrams?: { min: number; max: number };
  targetCarbsGrams?: { min: number; max: number };
  targetFatGrams?: { min: number; max: number };

  slots: MealPlanSlot[];
  archived?: boolean;
  deletedAt?: string;
  schemaVersion: number;
}

export interface PlannedDayOptionSelection {
  optionId: string;
  optionSnapshot: MealPlanOption;
  portionMultiplier: number; // 0.5 - 2.0
  effectiveCalories: number;
  effectiveProteinGrams: number;
  effectiveCarbsGrams: number;
  effectiveFatGrams: number;
  status: "planned" | "consumed" | "replaced";
  loggedAt?: string;
  actualConsumedPortion?: number;
  replacementItemName?: string;
}

export interface PlannedDaySlot {
  slotId: string;
  slotName: string;
  selectedOptions: PlannedDayOptionSelection[];
}

export interface PlannedDayDocument extends StandardRecordMetadata {
  date: string; // YYYY-MM-DD
  athleteId: string;
  planId?: string;
  dayType?: NutritionDayType;
  slots: PlannedDaySlot[];
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  isLocked?: boolean;
  notes?: string;
  schemaVersion: number;
}

export interface DayTemplateDocument extends StandardRecordMetadata {
  id: string;
  athleteId: string;
  name: string; // e.g. "Verseny előtti nap", "Könnyű regenerációs nap"
  dayType: NutritionDayType;
  slots: PlannedDaySlot[];
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  notes?: string;
  schemaVersion: number;
}

export interface ShoppingListItem {
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  sourceRecipes: string[];
}
