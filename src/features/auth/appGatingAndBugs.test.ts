import { describe, it, expect } from "vitest";
import { normalizeUserProfile } from "./authService";
import { sanitizeForFirestore } from "@shared/lib/firebase";
import { normalizeNutritionMeals, CANONICAL_MEAL_TYPES } from "@shared/lib/nutrition";
import { onboardingDataToUserProfile } from "@features/onboarding/onboardingMachine";

describe("Bug 1 & 2 & 3 Regression Tests", () => {
  describe("Bug 1: Onboarding Persistence and User Profile Normalization", () => {
    it("auto-migrates existing accounts with meaningful data to onboardingCompleted: true", () => {
      const existingUserRaw = {
        uid: "user-123",
        email: "athlete@example.com",
        displayName: "Nagy Anna",
        mainSport: "running",
        onboardingCompleted: false // was false or missing previously due to swallow bug
      };

      const normalized = normalizeUserProfile(existingUserRaw as any);
      expect(normalized.onboardingCompleted).toBe(true);
    });

    it("keeps onboardingCompleted: false for truly empty new user profiles", () => {
      const brandNewUser = {
        uid: "user-new",
        email: "new@example.com",
        onboardingCompleted: false
      };

      const normalized = normalizeUserProfile(brandNewUser as any);
      expect(normalized.onboardingCompleted).toBe(false);
    });

    it("onboardingDataToUserProfile produces clean object without undefined fields", () => {
      const profile = onboardingDataToUserProfile({
        roles: ["athlete"],
        sports: ["swimming"],
        mainSport: "swimming",
        level: "hobby",
        consentAccepted: true,
        consentVersion: "1.0.0"
      });

      expect(profile.onboardingCompleted).toBe(true);
      expect(profile.mainSport).toBe("swimming");

      // Verify no undefined fields exist before Firestore save
      for (const [, val] of Object.entries(profile)) {
        expect(val).not.toBeUndefined();
      }

      const sanitized = sanitizeForFirestore(profile);
      expect(sanitized).toBeDefined();
    });
  });

  describe("Bug 2: Empty Profile Start & Target Competition", () => {
    it("preserves custom user target competition and does not force Budapest Maraton", () => {
      const userProfile = {
        uid: "user-ironman",
        email: "iron@example.com",
        targetCompetition: "Ironman Austria",
        targetCompetitionDate: "2027-07-04"
      };

      const normalized = normalizeUserProfile(userProfile as any);
      expect(normalized.targetCompetition).toBe("Ironman Austria");
      expect(normalized.targetCompetitionDate).toBe("2027-07-04");
    });

    it("keeps target competition empty when user has not entered one", () => {
      const emptyUser = {
        uid: "user-empty",
        email: "empty@example.com"
      };

      const normalized = normalizeUserProfile(emptyUser as any);
      expect(normalized.targetCompetition).toBeUndefined();
    });
  });

  describe("Bug 3: Nutrition Structure & Meal Normalization", () => {
    it("normalizes empty or null meals input with all canonical meal types present", () => {
      const meals = normalizeNutritionMeals(null);
      for (const mType of CANONICAL_MEAL_TYPES) {
        expect(meals[mType]).toBeDefined();
        expect(meals[mType].time).toBeDefined();
        expect(meals[mType].items).toEqual([]);
        expect(meals[mType].totalCalories).toBe(0);
      }
    });

    it("fixes the 'snack' crash by ensuring snack is always populated even if input lacked it", () => {
      // Old structure had breakfast, during_training, lunch, dinner but no snack
      const oldStructure = {
        breakfast: { id: "bf", mealType: "breakfast", time: "08:00", items: [], totalCalories: 0 },
        lunch: { id: "lu", mealType: "lunch", time: "12:30", items: [], totalCalories: 0 },
        dinner: { id: "di", mealType: "dinner", time: "19:00", items: [], totalCalories: 0 }
      };

      const normalized = normalizeNutritionMeals(oldStructure as any);
      expect(normalized.snack).toBeDefined();
      expect(normalized.snack.time).toBe("16:00");
      expect(normalized.snack.items).toEqual([]);
      expect(normalized.snack.totalCalories).toBe(0);
    });

    it("migrates legacy afternoon_snack / morning_snack into snack", () => {
      const legacyMeals = {
        afternoon_snack: {
          id: "legacy_snack",
          mealType: "afternoon_snack",
          time: "16:15",
          items: [{ id: "apple", name: "Alma", calories: 52 }],
          totalCalories: 52
        }
      };

      const normalized = normalizeNutritionMeals(legacyMeals as any);
      expect(normalized.snack).toBeDefined();
      expect(normalized.snack.items.length).toBe(1);
      expect(normalized.snack.items[0]?.name).toBe("Alma");
      expect(normalized.snack.totalCalories).toBe(52);
    });
  });
});
