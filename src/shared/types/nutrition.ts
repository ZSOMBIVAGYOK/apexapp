/**
 * Nutrition Domain Types for Apex
 * Covers targets, periodization, food database, logging modes, session fuelling,
 * supplements with anti-doping provenance, body metrics smoothing, and dietitian collaboration.
 */

export type NutritionDayType = "rest" | "light" | "moderate" | "hard" | "competition";

export type NutritionGoal = "maintain" | "lose" | "gain" | "performance";

export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "during_training";

export type PortionSize = "small" | "medium" | "large";

export type FoodSource = "off" | "usda" | "custom" | "verified";

export type ThirdPartyCertification =
  | "informed_sport"
  | "koelner_liste"
  | "nsf_sport"
  | "bscg"
  | "none";

/**
 * Detailed micronutrient profile with honest coverage awareness
 */
export interface MicronutrientProfile {
  fiberGrams?: number;
  sugarGrams?: number;
  saturatedFatGrams?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  vitaminDMcg?: number;
  vitaminB12Mcg?: number;
  magnesiumMg?: number;
  zincMg?: number;
  omega3Grams?: number;
}

export interface FullNutrientProfile extends MicronutrientProfile {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  /** Percentage of tracked micronutrients actually reported for this item (0-100) */
  coverageScore: number;
  /** List of tracked nutrient keys missing from the original source label */
  missingNutrients: string[];
}

/**
 * Standard food item from Open Food Facts, USDA, or custom library
 */
export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  source: FoodSource;
  servingSizeGrams: number;
  servingUnit?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  microsPer100g: MicronutrientProfile;
  isFavorite?: boolean;
  isRecent?: boolean;
  category?: string;
  imageUrl?: string;
}

/**
 * Plate method portion representation for quick mode
 */
export interface PlatePortionShares {
  carbsPct: number; // e.g. 25 = 1/4 plate
  proteinPct: number; // e.g. 25 = 1/4 plate
  vegPct: number; // e.g. 50 = 1/2 plate
}

/**
 * Individual item logged inside a meal
 */
export interface LoggedFoodItem {
  id: string;
  foodId: string;
  name: string;
  brand?: string;
  servingGrams: number;
  mode: "quick" | "precise";
  portionSize?: PortionSize;
  platePortion?: PlatePortionShares;
  photoUrl?: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  micros: MicronutrientProfile;
  coverageScore: number;
  missingNutrients: string[];
  createdAt: string;
}

/**
 * Dietitian clinical or educational note on a meal
 */
export interface MealDietitianComment {
  id: string;
  dietitianId: string;
  dietitianName: string;
  comment: string;
  createdAt: string;
}

/**
 * Meal group logged by the athlete or specialist
 */
export interface LoggedMeal {
  id: string;
  mealType: MealType;
  time: string; // HH:mm
  items: LoggedFoodItem[];
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
  notes?: string;
  dietitianComments?: MealDietitianComment[];
  createdAt: string;
}

/**
 * Target provenance details (who set or last modified the target)
 */
export interface TargetProvenance {
  userId: string;
  userName: string;
  role: "athlete" | "dietitian" | "coach";
  title?: string;
  updatedAt: string;
}

/**
 * Daily Nutrition Target periodized by training load and day type
 */
export interface DailyNutritionTarget {
  date: string; // YYYY-MM-DD
  dayType: NutritionDayType;
  goal: NutritionGoal;
  formulaUsed: "mifflin_st_jeor" | "cunningham";
  bmr: number;
  activityCalories: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  targetHydrationLiters: number;
  targetSodiumMg: number;
  electrolyteHint?: string;
  setBy: TargetProvenance;
  isCustomOverride?: boolean;
}

/**
 * Session Fuelling recommendations for pre, during, and post workout
 */
export interface SessionFuellingWindow {
  timingText: string;
  carbsGrams: number;
  proteinGrams?: number;
  fluidMl: number;
  sodiumMg?: number;
  guidelines: string[];
}

export interface WorkoutFuellingPlan {
  workoutId: string;
  title: string;
  sport: string;
  durationMinutes: number;
  intensityRpe: number;
  preSession: SessionFuellingWindow;
  duringSession: {
    timingText: string;
    carbsPerHourGrams: number;
    totalCarbsGrams: number;
    fluidPerHourMl: number;
    totalFluidMl: number;
    sodiumPerHourMg: number;
    totalSodiumMg: number;
    guidelines: string[];
  };
  postSession: SessionFuellingWindow;
}

/**
 * Supplement log entry with permanent anti-doping batch verification
 */
export interface SupplementLogEntry {
  id: string;
  athleteId: string;
  name: string;
  brand: string;
  batchNumber: string; // Tételszám - essential for anti-doping audits
  dosage: string;
  timing: "morning" | "pre_workout" | "post_workout" | "evening" | "with_meal";
  thirdPartyCert: ThirdPartyCertification;
  expiryDate?: string;
  notes?: string;
  loggedAt: string;
}

/**
 * Body metric entry with 7-day moving average smoothing
 */
export interface BodyMetricEntry {
  id: string;
  athleteId: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  bodyFatPct?: number;
  muscleMassKg?: number;
  waistCm?: number;
  smoothedWeightKg?: number;
  smoothedBodyFatPct?: number;
  source: "manual" | "device";
}

/**
 * Dietitian Meal Plan assigned to athlete's calendar/tab
 */
export interface DietitianMealPlanItem {
  mealType: MealType;
  suggestedName: string;
  targetCarbsGrams: number;
  targetProteinGrams: number;
  plateSuggestion?: string;
  notes?: string;
}

export interface DietitianMealPlan {
  id: string;
  title: string;
  description: string;
  dietitianId: string;
  dietitianName: string;
  targetDayType: NutritionDayType;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  meals: DietitianMealPlanItem[];
  notes?: string;
  createdAt: string;
}

/**
 * Low Energy Availability (LEA / REDs) conservative notice
 */
export interface LowEnergyAvailabilityAlert {
  triggered: boolean;
  consecutiveDays: number;
  avgIntakeCalories: number;
  avgDeficitCalories: number;
  message: string;
  disclaimer: string;
}

export * from "./mealPlan";

