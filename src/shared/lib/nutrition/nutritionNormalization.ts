import { LoggedMeal, MealType } from "@shared/types/nutrition";

export const CANONICAL_MEAL_TYPES: MealType[] = [
  "breakfast",
  "during_training",
  "lunch",
  "snack",
  "dinner"
];

const DEFAULT_MEAL_TIMES: Record<MealType, string> = {
  breakfast: "08:00",
  during_training: "11:00",
  lunch: "13:00",
  snack: "16:00",
  dinner: "19:00"
};

/**
 * Creates a clean default meal object for a given meal type.
 */
export const createDefaultMeal = (mealType: MealType): LoggedMeal => ({
  id: `meal_${mealType}`,
  mealType,
  time: DEFAULT_MEAL_TIMES[mealType] || "12:00",
  items: [],
  totalCalories: 0,
  totalProteinGrams: 0,
  totalCarbsGrams: 0,
  totalFatGrams: 0,
  createdAt: new Date().toISOString()
});

/**
 * Normalizes daily meals log from any raw object, localStorage cache or Firestore day document.
 * Safely handles:
 * - Brand-new empty accounts (all meals initialized with items: [])
 * - Missing meal keys (guarantees breakfast, during_training, lunch, snack, dinner)
 * - Old-format keys (morning_snack, afternoon_snack, evening_snack merged into snack)
 * - Missing or undefined properties (time, totalCalories, items)
 */
export const normalizeNutritionMeals = (
  raw: any
): Record<MealType, LoggedMeal> => {
  const result: Record<MealType, LoggedMeal> = {
    breakfast: createDefaultMeal("breakfast"),
    during_training: createDefaultMeal("during_training"),
    lunch: createDefaultMeal("lunch"),
    snack: createDefaultMeal("snack"),
    dinner: createDefaultMeal("dinner")
  };

  if (!raw || typeof raw !== "object") {
    return result;
  }

  // Populate canonical meals
  for (const mType of CANONICAL_MEAL_TYPES) {
    if (raw[mType] && typeof raw[mType] === "object") {
      const rm = raw[mType];
      result[mType] = {
        id: rm.id || `meal_${mType}`,
        mealType: mType,
        time: typeof rm.time === "string" && rm.time ? rm.time : DEFAULT_MEAL_TIMES[mType],
        items: Array.isArray(rm.items) ? rm.items : [],
        totalCalories: typeof rm.totalCalories === "number" ? rm.totalCalories : 0,
        totalProteinGrams: typeof rm.totalProteinGrams === "number" ? rm.totalProteinGrams : 0,
        totalCarbsGrams: typeof rm.totalCarbsGrams === "number" ? rm.totalCarbsGrams : 0,
        totalFatGrams: typeof rm.totalFatGrams === "number" ? rm.totalFatGrams : 0,
        notes: rm.notes,
        dietitianComments: Array.isArray(rm.dietitianComments) ? rm.dietitianComments : undefined,
        createdAt: rm.createdAt || new Date().toISOString()
      };
    }
  }

  // Backward compatibility / migration for older structures that had morning_snack, afternoon_snack, etc.
  const legacySnacks = ["morning_snack", "afternoon_snack", "evening_snack"];
  for (const legacyKey of legacySnacks) {
    if (raw[legacyKey] && typeof raw[legacyKey] === "object") {
      const leg = raw[legacyKey];
      if (Array.isArray(leg.items) && leg.items.length > 0) {
        result.snack.items = [...result.snack.items, ...leg.items];
        result.snack.totalCalories += (leg.totalCalories || 0);
        result.snack.totalProteinGrams += (leg.totalProteinGrams || 0);
        result.snack.totalCarbsGrams += (leg.totalCarbsGrams || 0);
        result.snack.totalFatGrams += (leg.totalFatGrams || 0);
      }
    }
  }

  return result;
};
