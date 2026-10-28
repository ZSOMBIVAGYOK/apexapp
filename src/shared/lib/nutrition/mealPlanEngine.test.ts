import { describe, it, expect } from "vitest";
import {
  calculateOptionNutrients,
  checkOptionAllergens,
  suggestDayMeals,
  aggregateShoppingList,
  formatShoppingListAsText,
  generateStarterMealPlan
} from "./mealPlanEngine";
import { MealPlanDocument, MealPlanOption, PlannedDayDocument } from "@shared/types/mealPlan";
import { DailyNutritionTarget } from "@shared/types/nutrition";

describe("Meal Plan Engine Suite", () => {
  const dummyOption1: MealPlanOption = {
    id: "opt_oats",
    name: "Zabkása bogyós gyümölccsel",
    authorRole: "athlete",
    baseCalories: 450,
    baseProteinGrams: 25,
    baseCarbsGrams: 65,
    baseFatGrams: 8,
    minPortionMultiplier: 0.5,
    maxPortionMultiplier: 2.0,
    defaultPortionMultiplier: 1.0,
    tags: ["gyors", "edzés előtt", "nagy szénhidrát"],
    dayTypeTags: ["moderate", "hard", "competition"],
    dayTypeScaling: {
      hard: 1.5,
      rest: 0.8
    },
    allergens: ["gluten", "lactose"],
    ingredients: [
      { name: "Zabpehely", amount: 80, unit: "g" },
      { name: "Tejsavó fehérje", amount: 30, unit: "g" },
      { name: "Áfonya", amount: 50, unit: "g" }
    ]
  };

  const dummyOption2: MealPlanOption = {
    id: "opt_eggs",
    name: "Tojásrántotta avokádóval és rozskenyérrel",
    authorRole: "dietitian",
    authorName: "Dr. Kovács Anna",
    baseCalories: 520,
    baseProteinGrams: 32,
    baseCarbsGrams: 28,
    baseFatGrams: 30,
    minPortionMultiplier: 0.5,
    maxPortionMultiplier: 1.5,
    defaultPortionMultiplier: 1.0,
    tags: ["pihenőnap", "magas fehérje"],
    dayTypeTags: ["rest", "light"],
    allergens: ["eggs", "gluten"],
    ingredients: [
      { name: "Tojás", amount: 3, unit: "db" },
      { name: "Rozskenyér", amount: 60, unit: "g" },
      { name: "Avokádó", amount: 50, unit: "g" }
    ]
  };

  const dummyOptionLunch: MealPlanOption = {
    id: "opt_chicken_rice",
    name: "Csirkemell jázminrizzsel és brokkolival",
    authorRole: "athlete",
    baseCalories: 650,
    baseProteinGrams: 55,
    baseCarbsGrams: 85,
    baseFatGrams: 10,
    minPortionMultiplier: 0.7,
    maxPortionMultiplier: 2.0,
    defaultPortionMultiplier: 1.0,
    tags: ["magas fehérje", "edzés után"],
    dayTypeTags: ["light", "moderate", "hard"],
    dayTypeScaling: {
      hard: 1.3
    },
    ingredients: [
      { name: "Csirkemellfilé", amount: 200, unit: "g" },
      { name: "Jázminrizs", amount: 100, unit: "g" },
      { name: "Brokkoli", amount: 150, unit: "g" }
    ]
  };

  const dummyPlan: MealPlanDocument = {
    id: "plan_test_1",
    athleteId: "ath_1",
    title: "Triatlon Versenyszezon Étrend",
    authorUid: "dietitian_1",
    authorRole: "dietitian",
    authorName: "Dr. Kovács Anna",
    isActive: true,
    slots: [
      {
        slotId: "breakfast",
        name: "Reggeli",
        order: 0,
        options: [dummyOption1, dummyOption2]
      },
      {
        slotId: "lunch",
        name: "Ebéd",
        order: 1,
        options: [dummyOptionLunch]
      }
    ],
    schemaVersion: 1,
    source: "manual",
    confidence: 1.0,
    createdAt: "2026-10-28T08:00:00Z",
    updatedAt: "2026-10-28T08:00:00Z",
    updatedBy: "dietitian_1"
  };

  const dummyTarget: DailyNutritionTarget = {
    date: "2026-10-28",
    dayType: "hard",
    goal: "performance",
    formulaUsed: "cunningham",
    bmr: 1700,
    activityCalories: 1100,
    targetCalories: 2800,
    targetProteinGrams: 160,
    targetCarbsGrams: 420,
    targetFatGrams: 60,
    targetHydrationLiters: 3.5,
    targetSodiumMg: 2400,
    setBy: {
      userId: "ath_1",
      userName: "Teszt Sportoló",
      role: "athlete",
      updatedAt: "2026-10-28T08:00:00Z"
    }
  };

  describe("Day-type Scaling & Nutrient Calculations", () => {
    it("scales nutrients based on portion multiplier and dayType", () => {
      // Hard day scaling on dummyOption1 is 1.5x. With portion 1.0x -> totalMultiplier = 1.5
      const res = calculateOptionNutrients(dummyOption1, 1.0, "hard");
      expect(res.dayTypeFactor).toBe(1.5);
      expect(res.calories).toBe(Math.round(450 * 1.5));
      expect(res.carbsGrams).toBe(Math.round(65 * 1.5 * 10) / 10);
      expect(res.proteinGrams).toBe(Math.round(25 * 1.5 * 10) / 10);
    });

    it("uses default 1.0 multiplier when no day-type scaling is specified", () => {
      const res = calculateOptionNutrients(dummyOption2, 1.2, "hard");
      expect(res.dayTypeFactor).toBe(1.0);
      expect(res.calories).toBe(Math.round(520 * 1.2));
    });
  });

  describe("Allergen Detection & Warnings", () => {
    it("flags options matching user allergies in Hungarian or English", () => {
      const resGluten = checkOptionAllergens(dummyOption1, ["gluténérzékeny", "laktózintolerancia"]);
      expect(resGluten.hasWarning).toBe(true);
      expect(resGluten.matchedAllergens).toContain("Glutén");
      expect(resGluten.matchedAllergens).toContain("Laktóz / Tej");
    });

    it("returns no warning when user has no matching allergies", () => {
      const res = checkOptionAllergens(dummyOptionLunch, ["földimogyoró"]);
      expect(res.hasWarning).toBe(false);
      expect(res.matchedAllergens.length).toBe(0);
    });
  });

  describe("Deterministic Day Suggestion Engine", () => {
    it("deterministically produces identical suggestions for the same seed", () => {
      const resA = suggestDayMeals(dummyPlan, dummyTarget, [], "hard", 42);
      const resB = suggestDayMeals(dummyPlan, dummyTarget, [], "hard", 42);

      expect(resA.totalCalories).toBe(resB.totalCalories);
      expect(resA.slots[0]?.selectedOptions[0]?.optionId).toBe(resB.slots[0]?.selectedOptions[0]?.optionId);
      expect(resA.slots[0]?.selectedOptions[0]?.portionMultiplier).toBe(resB.slots[0]?.selectedOptions[0]?.portionMultiplier);
    });

    it("prefers day-type matching options and avoids recent options", () => {
      // If dummyOption1 was used yesterday, it should pick dummyOption2 if viable
      const res = suggestDayMeals(dummyPlan, dummyTarget, [["opt_oats"]], "rest", 1);
      const pickedBreakfastId = res.slots[0]?.selectedOptions[0]?.optionId;
      expect(pickedBreakfastId).toBe("opt_eggs");
    });

    it("clamps portions strictly within minPortionMultiplier and maxPortionMultiplier", () => {
      const res = suggestDayMeals(dummyPlan, dummyTarget, [], "hard", 10);
      for (const slot of res.slots) {
        for (const sel of slot.selectedOptions) {
          const opt = sel.optionSnapshot;
          expect(sel.portionMultiplier).toBeGreaterThanOrEqual(opt.minPortionMultiplier);
          expect(sel.portionMultiplier).toBeLessThanOrEqual(opt.maxPortionMultiplier);
        }
      }
    });
  });

  describe("Shopping List Aggregation", () => {
    it("aggregates, scales by portion, and merges duplicate ingredients across days", () => {
      const plannedDay1: PlannedDayDocument = {
        date: "2026-10-29",
        athleteId: "ath_1",
        slots: [
          {
            slotId: "breakfast",
            slotName: "Reggeli",
            selectedOptions: [
              {
                optionId: dummyOption1.id,
                optionSnapshot: dummyOption1,
                portionMultiplier: 1.0,
                effectiveCalories: 450,
                effectiveProteinGrams: 25,
                effectiveCarbsGrams: 65,
                effectiveFatGrams: 8,
                status: "planned"
              }
            ]
          }
        ],
        totalCalories: 450,
        totalProteinGrams: 25,
        totalCarbsGrams: 65,
        totalFatGrams: 8,
        schemaVersion: 1,
        source: "manual",
        confidence: 1.0,
        createdAt: "2026-10-28T08:00:00Z",
        updatedAt: "2026-10-28T08:00:00Z",
        updatedBy: "ath_1"
      };

      const plannedDay2: PlannedDayDocument = {
        date: "2026-10-30",
        athleteId: "ath_1",
        slots: [
          {
            slotId: "breakfast",
            slotName: "Reggeli",
            selectedOptions: [
              {
                optionId: dummyOption1.id,
                optionSnapshot: dummyOption1,
                portionMultiplier: 1.5, // 1.5x portion!
                effectiveCalories: 675,
                effectiveProteinGrams: 37.5,
                effectiveCarbsGrams: 97.5,
                effectiveFatGrams: 12,
                status: "planned"
              }
            ]
          }
        ],
        totalCalories: 675,
        totalProteinGrams: 37.5,
        totalCarbsGrams: 97.5,
        totalFatGrams: 12,
        schemaVersion: 1,
        source: "manual",
        confidence: 1.0,
        createdAt: "2026-10-28T08:00:00Z",
        updatedAt: "2026-10-28T08:00:00Z",
        updatedBy: "ath_1"
      };

      const list = aggregateShoppingList([plannedDay1, plannedDay2]);

      // Zabpehely: 80g * 1.0 + 80g * 1.5 = 80 + 120 = 200g
      const oatsItem = list.find((item) => item.name === "Zabpehely");
      expect(oatsItem).toBeDefined();
      expect(oatsItem?.amount).toBe(200);
      expect(oatsItem?.unit).toBe("g");

      // Tejsavó fehérje: 30g * 1.0 + 30g * 1.5 = 75g
      const proteinItem = list.find((item) => item.name === "Tejsavó fehérje");
      expect(proteinItem).toBeDefined();
      expect(proteinItem?.amount).toBe(75);

      // Verify formatted text output
      const text = formatShoppingListAsText(list, "2026.10.29 - 2026.10.30");
      expect(text).toContain("APEX BEVÁSÁRLÓLISTA");
      expect(text).toContain("Zabpehely: 200 g");
    });
  });

  describe("Starter Meal Plan Generator", () => {
    it("generates an empty starter plan with 4 standard slots and no dummy food entries", () => {
      const plan = generateStarterMealPlan("ath_1", "Kovács Zsombor");
      expect(plan.athleteId).toBe("ath_1");
      expect(plan.slots.length).toBe(4);
      expect(plan.slots.map((s) => s.slotId)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
      // Options should be clean empty array
      for (const slot of plan.slots) {
        expect(slot.options).toEqual([]);
      }
      expect(plan.isActive).toBe(true);
    });
  });
});
