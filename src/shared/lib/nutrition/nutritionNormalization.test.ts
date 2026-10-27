import { describe, it, expect } from "vitest";
import { normalizeNutritionMeals, CANONICAL_MEAL_TYPES } from "./nutritionNormalization";

describe("normalizeNutritionMeals", () => {
  it("initializes empty structure when given undefined or null", () => {
    const result = normalizeNutritionMeals(null);
    for (const mType of CANONICAL_MEAL_TYPES) {
      expect(result[mType]).toBeDefined();
      expect(result[mType].time).toBeDefined();
      expect(result[mType].items).toEqual([]);
      expect(result[mType].totalCalories).toBe(0);
    }
  });

  it("handles empty object without crashing and ensures all canonical meals exist", () => {
    const result = normalizeNutritionMeals({});
    expect(result.breakfast).toBeDefined();
    expect(result.during_training).toBeDefined();
    expect(result.lunch).toBeDefined();
    expect(result.snack).toBeDefined();
    expect(result.dinner).toBeDefined();
  });

  it("safely migrates old-format snacks into snack meal without losing items", () => {
    const oldData = {
      breakfast: {
        id: "m_1",
        time: "07:30",
        items: [{ id: "i_1", name: "Zabpehely", calories: 200, servingGrams: 50, mode: "precise", proteinGrams: 5, carbsGrams: 30, fatGrams: 3, micros: {}, coverageScore: 100, missingNutrients: [], createdAt: "" }],
        totalCalories: 200,
        totalProteinGrams: 5,
        totalCarbsGrams: 30,
        totalFatGrams: 3
      },
      morning_snack: {
        id: "m_2",
        time: "10:30",
        items: [{ id: "i_2", name: "Alma", calories: 80, servingGrams: 150, mode: "quick", proteinGrams: 0, carbsGrams: 20, fatGrams: 0, micros: {}, coverageScore: 100, missingNutrients: [], createdAt: "" }],
        totalCalories: 80,
        totalProteinGrams: 0,
        totalCarbsGrams: 20,
        totalFatGrams: 0
      },
      afternoon_snack: {
        id: "m_3",
        time: "16:00",
        items: [{ id: "i_3", name: "Dió", calories: 150, servingGrams: 25, mode: "quick", proteinGrams: 4, carbsGrams: 3, fatGrams: 14, micros: {}, coverageScore: 100, missingNutrients: [], createdAt: "" }],
        totalCalories: 150,
        totalProteinGrams: 4,
        totalCarbsGrams: 3,
        totalFatGrams: 14
      }
    };

    const normalized = normalizeNutritionMeals(oldData);
    expect(normalized.breakfast.items.length).toBe(1);
    expect(normalized.breakfast.time).toBe("07:30");
    // morning_snack and afternoon_snack merged into snack
    expect(normalized.snack.items.length).toBe(2);
    expect(normalized.snack.totalCalories).toBe(230);
    // Missing meals initialized with clean empty structures
    expect(normalized.during_training.items).toEqual([]);
    expect(normalized.lunch.items).toEqual([]);
    expect(normalized.dinner.items).toEqual([]);
  });

  it("handles malformed items gracefully", () => {
    const malformed = {
      breakfast: {
        time: null,
        items: "not-an-array",
        totalCalories: "invalid"
      }
    };
    const normalized = normalizeNutritionMeals(malformed);
    expect(normalized.breakfast.time).toBe("08:00");
    expect(normalized.breakfast.items).toEqual([]);
    expect(normalized.breakfast.totalCalories).toBe(0);
  });
});
