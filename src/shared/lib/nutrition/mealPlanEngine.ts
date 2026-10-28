import {
  MealPlanDocument,
  MealPlanOption,
  PlannedDayDocument,
  PlannedDaySlot,
  PlannedDayOptionSelection,
  ShoppingListItem,
  AllergenTag,
  MealPlanAuthorRole
} from "@shared/types/mealPlan";
import { DailyNutritionTarget, NutritionDayType } from "@shared/types/nutrition";

/**
 * Standard allergen dictionary mapping Hungarian & English keywords to AllergenTag
 */
export const ALLERGEN_DICTIONARY: Record<AllergenTag, { hu: string; en: string; keywords: string[] }> = {
  gluten: {
    hu: "Glutén",
    en: "Gluten",
    keywords: ["glutén", "gluten", "búza", "wheat", "rozs", "árpa", "tészta"]
  },
  lactose: {
    hu: "Laktóz / Tej",
    en: "Lactose / Dairy",
    keywords: ["laktóz", "lactose", "tej", "milk", "sajt", "cheese", "joghurt", "túró", "vaj", "tejsavó"]
  },
  nuts: {
    hu: "Diófélék",
    en: "Tree Nuts",
    keywords: ["dió", "mandula", "mogyoró", "nut", "almond", "walnut", "kesudió"]
  },
  soy: {
    hu: "Szója",
    en: "Soy",
    keywords: ["szója", "soy", "tofu", "edamame"]
  },
  eggs: {
    hu: "Tojás",
    en: "Eggs",
    keywords: ["tojás", "egg", "tojássárgája", "tojásfehérje"]
  },
  fish_shellfish: {
    hu: "Halak és rákfélék",
    en: "Fish & Shellfish",
    keywords: ["hal", "fish", "lazac", "tonhal", "rák", "tenger gyümölcsei"]
  },
  peanuts: {
    hu: "Földimogyoró",
    en: "Peanuts",
    keywords: ["földimogyoró", "peanut"]
  },
  sesame: {
    hu: "Szezámmag",
    en: "Sesame",
    keywords: ["szezám", "sesame"]
  },
  celery: {
    hu: "Zeller",
    en: "Celery",
    keywords: ["zeller", "celery"]
  },
  mustard: {
    hu: "Mustár",
    en: "Mustard",
    keywords: ["mustár", "mustard"]
  }
};

/**
 * Calculates scaled nutrients for an option with portion multiplier and optional day-type scaling
 */
export function calculateOptionNutrients(
  option: MealPlanOption,
  portionMultiplier: number,
  dayType?: NutritionDayType
): {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  dayTypeFactor: number;
  totalMultiplier: number;
} {
  const dayTypeFactor = dayType && option.dayTypeScaling?.[dayType] !== undefined
    ? option.dayTypeScaling[dayType]!
    : 1.0;

  const totalMultiplier = portionMultiplier * dayTypeFactor;

  return {
    calories: Math.round(option.baseCalories * totalMultiplier),
    proteinGrams: Math.round(option.baseProteinGrams * totalMultiplier * 10) / 10,
    carbsGrams: Math.round(option.baseCarbsGrams * totalMultiplier * 10) / 10,
    fatGrams: Math.round(option.baseFatGrams * totalMultiplier * 10) / 10,
    dayTypeFactor,
    totalMultiplier
  };
}

/**
 * Checks an option against user-declared allergies and intolerances
 */
export function checkOptionAllergens(
  option: MealPlanOption,
  userAllergies: string[] = []
): { hasWarning: boolean; matchedAllergens: string[] } {
  if (!userAllergies || userAllergies.length === 0) {
    return { hasWarning: false, matchedAllergens: [] };
  }

  const normalizedUserAllergies = userAllergies.map((a) => a.toLowerCase().trim()).filter(Boolean);
  const matched: string[] = [];

  // Check explicit tags
  if (option.allergens && option.allergens.length > 0) {
    for (const tag of option.allergens) {
      const dict = ALLERGEN_DICTIONARY[tag];
      const match = normalizedUserAllergies.some((ua) => {
        if (ua.includes(tag)) return true;
        if (!dict) return false;
        return dict.keywords.some((kw) => ua.includes(kw) || kw.includes(ua));
      });
      if (match && !matched.includes(dict?.hu || tag)) {
        matched.push(dict?.hu || tag);
      }
    }
  }

  // Check option name / ingredients keywords
  const fullText = [
    option.name,
    option.label,
    ...(option.tags || []),
    ...(option.ingredients?.map((i) => i.name) || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [tag, dict] of Object.entries(ALLERGEN_DICTIONARY) as [AllergenTag, typeof ALLERGEN_DICTIONARY[AllergenTag]][]) {
    const userHasAllergy = normalizedUserAllergies.some(
      (ua) => ua.includes(tag) || dict.keywords.some((kw) => ua.includes(kw) || kw.includes(ua))
    );
    if (userHasAllergy) {
      const keywordFound = dict.keywords.some((kw) => fullText.includes(kw));
      if (keywordFound && !matched.includes(dict.hu)) {
        matched.push(dict.hu);
      }
    }
  }


  return {
    hasWarning: matched.length > 0,
    matchedAllergens: matched
  };
}

/**
 * Deterministic pseudo-random number generator for seeded suggestions
 */
function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Rule-based, deterministic meal suggestion engine
 * - Fits daily targets
 * - Prefers options tagged for the current day type
 * - Avoids options used in the last 2 days
 * - Respects portion limits (min/max portion multiplier)
 * - Deterministic with seed for "Másik javaslat"
 */
export function suggestDayMeals(
  plan: MealPlanDocument,
  target: DailyNutritionTarget,
  recentDayOptionIds: string[][] = [],
  dayType: NutritionDayType = "moderate",
  seed: number = 0
): {
  slots: PlannedDaySlot[];
  totalCalories: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatGrams: number;
} {
  const prng = pseudoRandom(seed + 100);
  const usedRecentIds = new Set(recentDayOptionIds.flat());

  const slots: PlannedDaySlot[] = [];
  let totalCalories = 0;
  let totalProteinGrams = 0;
  let totalCarbsGrams = 0;
  let totalFatGrams = 0;

  for (const slot of plan.slots) {
    if (!slot.options || slot.options.length === 0) {
      slots.push({
        slotId: slot.slotId,
        slotName: slot.name,
        selectedOptions: []
      });
      continue;
    }

    // Filter candidates
    // 1. Day type filter: if options exist matching dayType, prioritize them
    const matchingDayType = slot.options.filter(
      (opt) => !opt.dayTypeTags || opt.dayTypeTags.length === 0 || opt.dayTypeTags.includes(dayType)
    );
    const candidatePool = matchingDayType.length > 0 ? matchingDayType : slot.options;

    // 2. Repeat avoidance: filter out items used recently if alternatives exist
    const nonRecent = candidatePool.filter((opt) => !usedRecentIds.has(opt.id));
    const finalCandidates = nonRecent.length > 0 ? nonRecent : candidatePool;

    // 3. Deterministic pick using seed
    const pickedIndex = Math.floor(prng() * finalCandidates.length);
    const chosenOption = finalCandidates[pickedIndex] || finalCandidates[0]!;

    // 4. Default portion multiplier with day-type scaling
    let portion = chosenOption.defaultPortionMultiplier || 1.0;
    portion = Math.max(chosenOption.minPortionMultiplier || 0.5, Math.min(chosenOption.maxPortionMultiplier || 2.0, portion));

    const nutrients = calculateOptionNutrients(chosenOption, portion, dayType);

    const selection: PlannedDayOptionSelection = {
      optionId: chosenOption.id,
      optionSnapshot: chosenOption,
      portionMultiplier: portion,
      effectiveCalories: nutrients.calories,
      effectiveProteinGrams: nutrients.proteinGrams,
      effectiveCarbsGrams: nutrients.carbsGrams,
      effectiveFatGrams: nutrients.fatGrams,
      status: "planned"
    };

    slots.push({
      slotId: slot.slotId,
      slotName: slot.name,
      selectedOptions: [selection]
    });

    totalCalories += nutrients.calories;
    totalProteinGrams += nutrients.proteinGrams;
    totalCarbsGrams += nutrients.carbsGrams;
    totalFatGrams += nutrients.fatGrams;
  }

  // Second pass: minor portion tuning to balance towards targetCalories if within bounds
  if (target.targetCalories > 0 && totalCalories > 0) {
    const ratio = target.targetCalories / totalCalories;
    if (Math.abs(ratio - 1.0) > 0.08) {
      // Scale portions slightly (up to ±20%) while respecting option min/max
      totalCalories = 0;
      totalProteinGrams = 0;
      totalCarbsGrams = 0;
      totalFatGrams = 0;

      for (const slot of slots) {
        for (const sel of slot.selectedOptions) {
          const opt = sel.optionSnapshot;
          const minP = opt.minPortionMultiplier || 0.5;
          const maxP = opt.maxPortionMultiplier || 2.0;
          const newPortion = Math.round(Math.max(minP, Math.min(maxP, sel.portionMultiplier * ratio)) * 10) / 10;
          sel.portionMultiplier = newPortion;

          const nutrients = calculateOptionNutrients(opt, newPortion, dayType);
          sel.effectiveCalories = nutrients.calories;
          sel.effectiveProteinGrams = nutrients.proteinGrams;
          sel.effectiveCarbsGrams = nutrients.carbsGrams;
          sel.effectiveFatGrams = nutrients.fatGrams;

          totalCalories += nutrients.calories;
          totalProteinGrams += nutrients.proteinGrams;
          totalCarbsGrams += nutrients.carbsGrams;
          totalFatGrams += nutrients.fatGrams;
        }
      }
    }
  }

  return {
    slots,
    totalCalories: Math.round(totalCalories),
    totalProteinGrams: Math.round(totalProteinGrams * 10) / 10,
    totalCarbsGrams: Math.round(totalCarbsGrams * 10) / 10,
    totalFatGrams: Math.round(totalFatGrams * 10) / 10
  };
}

/**
 * Aggregates all recipe ingredients from a series of planned days into one consolidated shopping list
 */
export function aggregateShoppingList(plannedDays: PlannedDayDocument[]): ShoppingListItem[] {
  const map = new Map<string, { amount: number; unit: string; name: string; sources: Set<string> }>();

  for (const day of plannedDays) {
    if (!day.slots) continue;
    for (const slot of day.slots) {
      for (const sel of slot.selectedOptions || []) {
        const option = sel.optionSnapshot;
        if (!option.ingredients || option.ingredients.length === 0) continue;

        const mult = sel.portionMultiplier || 1.0;
        for (const ing of option.ingredients) {
          if (!ing.name || ing.amount <= 0) continue;
          const normalizedName = ing.name.trim();
          const normalizedUnit = (ing.unit || "g").trim().toLowerCase();
          const key = `${normalizedName.toLowerCase()}___${normalizedUnit}`;

          const existing = map.get(key);
          const scaledAmount = ing.amount * mult;

          if (existing) {
            existing.amount += scaledAmount;
            existing.sources.add(option.name);
          } else {
            map.set(key, {
              amount: scaledAmount,
              unit: normalizedUnit,
              name: normalizedName,
              sources: new Set([option.name])
            });
          }
        }
      }
    }
  }

  const result: ShoppingListItem[] = [];
  for (const item of map.values()) {
    result.push({
      name: item.name,
      amount: Math.round(item.amount * 10) / 10,
      unit: item.unit,
      checked: false,
      sourceRecipes: Array.from(item.sources)
    });
  }

  // Sort alphabetically by ingredient name
  result.sort((a, b) => a.name.localeCompare(b.name, "hu"));
  return result;
}

/**
 * Formats a shopping list as shareable plain text / markdown
 */
export function formatShoppingListAsText(items: ShoppingListItem[], dateRangeText: string): string {
  const lines: string[] = [
    `🛒 APEX BEVÁSÁRLÓLISTA (${dateRangeText})`,
    "─".repeat(36)
  ];

  if (items.length === 0) {
    lines.push("A kiválasztott időszakra nincsenek felvett receptek vagy összetevők.");
    return lines.join("\n");
  }

  for (const item of items) {
    const check = item.checked ? "☑" : "☐";
    const src = item.sourceRecipes.length > 0 ? ` (${item.sourceRecipes.join(", ")})` : "";
    lines.push(`${check} ${item.name}: ${item.amount} ${item.unit}${src}`);
  }

  lines.push("─".repeat(36));
  lines.push(`Összesen ${items.length} tétel.`);
  return lines.join("\n");
}

/**
 * Generates starter meal plan with standard empty slots
 */
export function generateStarterMealPlan(
  athleteId: string,
  athleteName: string,
  authorRole: MealPlanAuthorRole = "athlete"
): MealPlanDocument {
  const now = new Date().toISOString();
  return {
    id: `plan_${Date.now()}`,
    athleteId,
    title: authorRole === "dietitian" ? "Személyre szabott sportdiéta" : "Saját étrendtervem",
    description: "Rugalmas választási lehetőségeken (meal pool) alapuló sporttáplálkozási terv.",
    authorUid: athleteId,
    authorRole,
    authorName: athleteName || "Sportoló",
    isActive: true,
    targetCalories: { min: 2400, max: 2800 },
    targetProteinGrams: { min: 140, max: 170 },
    targetCarbsGrams: { min: 320, max: 400 },
    targetFatGrams: { min: 60, max: 80 },
    slots: [
      {
        slotId: "breakfast",
        name: "Reggeli",
        order: 0,
        targetCaloriesRange: { min: 450, max: 650 },
        options: []
      },
      {
        slotId: "lunch",
        name: "Ebéd",
        order: 1,
        targetCaloriesRange: { min: 650, max: 900 },
        options: []
      },
      {
        slotId: "snack",
        name: "Snack / Edzés körül",
        order: 2,
        targetCaloriesRange: { min: 250, max: 450 },
        options: []
      },
      {
        slotId: "dinner",
        name: "Vacsora",
        order: 3,
        targetCaloriesRange: { min: 550, max: 750 },
        options: []
      }
    ],
    schemaVersion: 1,
    source: "manual",
    confidence: 1.0,
    createdAt: now,
    updatedAt: now,
    updatedBy: athleteId
  };
}
