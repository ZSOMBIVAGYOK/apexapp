/**
 * Nutrition Targets Engine
 *
 * Pure TypeScript calculation engine for athlete nutrition requirements:
 * - Basal Metabolic Rate (BMR) via Mifflin-St Jeor or Cunningham equations
 * - Total Daily Energy Expenditure (TDEE) with workout load adjustment
 * - Periodized macronutrient targets (g/kg) based on day type and goal
 * - Hydration and electrolyte replenishment guidelines
 *
 * Zero UI dependencies, thoroughly unit-tested.
 */

import {
  NutritionDayType,
  NutritionGoal,
  DailyNutritionTarget,
  TargetProvenance
} from "@shared/types/nutrition";
import {
  MACRO_RULES_BY_DAY_TYPE,
  GOAL_CONFIGS,
  HYDRATION_CONSTANTS
} from "./nutritionConstants";

export interface NutritionEngineInput {
  date: string; // YYYY-MM-DD
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: "male" | "female" | "other" | "prefer_not_to_say";
  bodyFatPct?: number; // Lean body mass known -> activates Cunningham formula
  dayType: NutritionDayType;
  goal?: NutritionGoal;
  plannedOrActualLoadTss?: number;
  sessionDurationMinutes?: number;
  isHotOrHumid?: boolean;
  customCarbsPerKg?: number;
  customProteinPerKg?: number;
  customFatPerKg?: number;
  setBy?: TargetProvenance;
  isCustomOverride?: boolean;
}

export interface BMRCalculationResult {
  bmr: number;
  formula: "mifflin_st_jeor" | "cunningham";
  leanBodyMassKg?: number;
}

/**
 * Calculates BMR using Cunningham if body fat percentage is provided,
 * otherwise falls back to Mifflin-St Jeor.
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: "male" | "female" | "other" | "prefer_not_to_say";
  bodyFatPct?: number;
}): BMRCalculationResult {
  const { weightKg, heightCm, ageYears, sex, bodyFatPct } = params;

  // 1. Cunningham Equation: BMR = 500 + 22 * LBM (Cunningham 1980)
  if (typeof bodyFatPct === "number" && bodyFatPct > 3 && bodyFatPct < 60) {
    const lbmKg = weightKg * (1 - bodyFatPct / 100);
    const bmr = Math.round(500 + 22 * lbmKg);
    return {
      bmr,
      formula: "cunningham",
      leanBodyMassKg: Math.round(lbmKg * 10) / 10
    };
  }

  // 2. Mifflin-St Jeor Equation (Mifflin 1990)
  // Men: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
  // Women: 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) - 161
  let sexOffset = 5;
  if (sex === "female") {
    sexOffset = -161;
  } else if (sex === "other" || sex === "prefer_not_to_say") {
    sexOffset = -78; // Neutral midpoint between male and female
  }

  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexOffset);

  return {
    bmr: Math.max(800, bmr),
    formula: "mifflin_st_jeor"
  };
}

/**
 * Estimates Exercise Energy Expenditure (EEE) from session duration and load (TSS / sRPE).
 */
export function calculateExerciseEnergyExpenditure(params: {
  sessionDurationMinutes?: number;
  plannedOrActualLoadTss?: number;
}): number {
  const duration = Math.max(0, params.sessionDurationMinutes || 0);
  const load = Math.max(0, params.plannedOrActualLoadTss || 0);

  if (duration === 0 && load === 0) {
    return 0;
  }

  // If training load TSS is provided: 100 TSS ~ 850-1000 kcal for a trained endurance athlete
  if (load > 0) {
    const tssBurn = Math.round(load * 9.5);
    const durationBurn = Math.round(duration * 9.0);
    return Math.max(tssBurn, durationBurn);
  }

  // Default moderate exercise intensity burn: ~9 kcal/min
  return Math.round(duration * 9.0);
}

/**
 * Calculates complete periodized Daily Nutrition Targets
 */
export function calculateDailyNutritionTarget(
  input: NutritionEngineInput
): DailyNutritionTarget {
  const {
    date,
    weightKg,
    heightCm,
    ageYears,
    sex,
    bodyFatPct,
    dayType,
    goal = "maintain",
    plannedOrActualLoadTss,
    sessionDurationMinutes = 0,
    isHotOrHumid = false,
    customCarbsPerKg,
    customProteinPerKg,
    customFatPerKg,
    setBy,
    isCustomOverride = false
  } = input;

  const validWeight = Math.max(30, weightKg);
  const bmrResult = calculateBMR({
    weightKg: validWeight,
    heightCm,
    ageYears,
    sex,
    bodyFatPct
  });

  const defaultDurations: Record<NutritionDayType, number> = {
    rest: 0,
    light: 45,
    moderate: 75,
    hard: 120,
    competition: 120
  };

  const effectiveDuration =
    sessionDurationMinutes > 0
      ? sessionDurationMinutes
      : (plannedOrActualLoadTss ? Math.round(plannedOrActualLoadTss * 0.8) : defaultDurations[dayType]);

  const bmr = bmrResult.bmr;
  const eee = calculateExerciseEnergyExpenditure({
    sessionDurationMinutes: effectiveDuration,
    plannedOrActualLoadTss
  });

  // Base sedentary / non-exercise activity thermogenesis (NEAT + TEF) is ~1.25 * BMR
  const neatTefCalories = Math.round(bmr * 0.25);
  const rawTdee = bmr + neatTefCalories + eee;

  // Apply goal adjustments
  const goalConfig = GOAL_CONFIGS[goal];
  let targetCalories = Math.round(rawTdee * goalConfig.calorieMultiplier);

  // Periodized macro rules for current day type
  const dayRule = MACRO_RULES_BY_DAY_TYPE[dayType];

  // 1. Target Protein: g/kg (elevated during caloric deficit to preserve lean mass)
  const proteinPerKg =
    customProteinPerKg ??
    dayRule.proteinGramsPerKg.target + goalConfig.proteinModifierGramsPerKg;
  const targetProteinGrams = Math.round(proteinPerKg * validWeight);
  const proteinKcal = targetProteinGrams * 4;

  // 2. Target Carbohydrates: periodized to training demand and caloric goal
  let defaultCarbsPerKg = dayRule.carbsGramsPerKg.target;
  if (goal === "lose") {
    defaultCarbsPerKg = dayRule.carbsGramsPerKg.min;
  } else if (goal === "gain" || goal === "performance") {
    defaultCarbsPerKg = dayRule.carbsGramsPerKg.max;
  }
  const carbsPerKg = customCarbsPerKg ?? defaultCarbsPerKg;
  const targetCarbsGrams = Math.round(carbsPerKg * validWeight);
  const carbsKcal = targetCarbsGrams * 4;

  // 3. Target Fat: remainder of caloric pool with strict physiological minimum
  let targetFatGrams = 0;
  if (customFatPerKg) {
    targetFatGrams = Math.round(customFatPerKg * validWeight);
  } else {
    const remainingKcal = targetCalories - (proteinKcal + carbsKcal);
    const minFatGrams = Math.round(dayRule.fatGramsPerKgMin * validWeight);


    if (remainingKcal > 0) {
      targetFatGrams = Math.round(remainingKcal / 9);
      if (targetFatGrams < minFatGrams) {
        targetFatGrams = minFatGrams;
      }
    } else {
      targetFatGrams = minFatGrams;
    }
  }

  // Recalibrate total calories to perfectly match the sum of macros
  targetCalories = proteinKcal + carbsKcal + targetFatGrams * 9;

  // 4. Hydration & Electrolytes
  const baselineFluidMl = validWeight * HYDRATION_CONSTANTS.baselineMlPerKg;
  const durationHours = sessionDurationMinutes / 60;
  let exerciseFluidMl = durationHours * HYDRATION_CONSTANTS.trainingFluidMlPerHour;

  if (isHotOrHumid) {
    exerciseFluidMl *= HYDRATION_CONSTANTS.heatMultiplier;
  }

  const totalFluidMl = baselineFluidMl + exerciseFluidMl;
  const targetHydrationLiters = Math.round((totalFluidMl / 1000) * 10) / 10;

  // Sodium calculation
  let targetSodiumMg = HYDRATION_CONSTANTS.sodiumBaselineMg;
  let electrolyteHint: string | undefined = undefined;

  if (sessionDurationMinutes >= 60 || isHotOrHumid) {
    const extraSodium = Math.round(
      durationHours * HYDRATION_CONSTANTS.sodiumPerHourLongSessionMg * (isHotOrHumid ? 1.4 : 1.0)
    );
    targetSodiumMg += extraSodium;
    electrolyteHint = isHotOrHumid
      ? `Meleg/párás körülmények: pótolj ~${Math.round(HYDRATION_CONSTANTS.sodiumPerHourLongSessionMg * 1.4)} mg nátriumot óránként!`
      : `Hosszú edzés (>60p): fogyassz elektrolitos sportitalt óránként ~${HYDRATION_CONSTANTS.sodiumPerHourLongSessionMg} mg nátriummal!`;
  }

  const provenance: TargetProvenance = setBy ?? {
    userId: "self",
    userName: "Sportoló",
    role: "athlete",
    updatedAt: new Date().toISOString()
  };

  return {
    date,
    dayType,
    goal,
    formulaUsed: bmrResult.formula,
    bmr,
    activityCalories: neatTefCalories + eee,
    targetCalories,
    targetProteinGrams,
    targetCarbsGrams,
    targetFatGrams,
    targetHydrationLiters,
    targetSodiumMg,
    electrolyteHint,
    setBy: provenance,
    isCustomOverride
  };
}
