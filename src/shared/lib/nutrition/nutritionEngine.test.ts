import { describe, it, expect } from "vitest";
import {
  calculateBMR,
  calculateDailyNutritionTarget,
  planSessionFuelling,
  calculateSmoothedBodyMetrics,
  calculateWeeklyWeightChangeRate,
  detectLowEnergyAvailability
} from "./index";
import { BodyMetricEntry, TargetProvenance } from "@shared/types/nutrition";


describe("Nutrition Module - Pure Calculation Engines", () => {
  describe("BMR & Energy Formulas", () => {
    it("calculates Mifflin-St Jeor accurately for male athlete", () => {
      // 70kg, 180cm, 25yo male
      // BMR = 10*70 + 6.25*180 - 5*25 + 5 = 700 + 1125 - 125 + 5 = 1705
      const result = calculateBMR({
        weightKg: 70,
        heightCm: 180,
        ageYears: 25,
        sex: "male"
      });

      expect(result.formula).toBe("mifflin_st_jeor");
      expect(result.bmr).toBe(1705);
    });

    it("calculates Mifflin-St Jeor accurately for female athlete", () => {
      // 60kg, 168cm, 28yo female
      // BMR = 10*60 + 6.25*168 - 5*28 - 161 = 600 + 1050 - 140 - 161 = 1349
      const result = calculateBMR({
        weightKg: 60,
        heightCm: 168,
        ageYears: 28,
        sex: "female"
      });

      expect(result.formula).toBe("mifflin_st_jeor");
      expect(result.bmr).toBe(1349);
    });

    it("switches to Cunningham equation when body fat percentage / LBM is available", () => {
      // 70kg with 10% body fat -> LBM = 63.0 kg
      // Cunningham = 500 + 22 * 63 = 1886
      const result = calculateBMR({
        weightKg: 70,
        heightCm: 180,
        ageYears: 25,
        sex: "male",
        bodyFatPct: 10
      });

      expect(result.formula).toBe("cunningham");
      expect(result.bmr).toBe(1886);
      expect(result.leanBodyMassKg).toBe(63);
    });
  });

  describe("Periodized Daily Nutrition Targets", () => {
    const baseMaleProfile = {
      date: "2026-10-26",
      weightKg: 70,
      heightCm: 180,
      ageYears: 25,
      sex: "male" as const
    };

    it("periodizes lower carbohydrates on rest days and protects protein & fat", () => {
      const restTarget = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "rest",
        sessionDurationMinutes: 0
      });

      expect(restTarget.dayType).toBe("rest");
      // Rest day carbs: 2.5 g/kg * 70 = 175g
      expect(restTarget.targetCarbsGrams).toBe(175);
      // Rest day protein: 1.8 g/kg * 70 = 126g
      expect(restTarget.targetProteinGrams).toBe(126);
      // Minimum fat: at least 1.0 g/kg = 70g
      expect(restTarget.targetFatGrams).toBeGreaterThanOrEqual(70);
    });

    it("periodizes high carbohydrates on hard training days according to ACSM guidelines", () => {
      const hardTarget = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "hard",
        sessionDurationMinutes: 120,
        plannedOrActualLoadTss: 130
      });

      // Hard day carbs: 8.5 g/kg * 70 = 595g
      expect(hardTarget.targetCarbsGrams).toBe(595);
      // Hard day protein: 2.0 g/kg * 70 = 140g
      expect(hardTarget.targetProteinGrams).toBe(140);
      expect(hardTarget.targetCalories).toBeGreaterThan(3200);
    });

    it("periodizes competition day with maximum carbs and moderate fat/protein for GI comfort", () => {
      const raceTarget = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "competition",
        sessionDurationMinutes: 150
      });

      // 10.0 g/kg carbs
      expect(raceTarget.targetCarbsGrams).toBe(700);
      // Moderate protein (1.6 g/kg)
      expect(raceTarget.targetProteinGrams).toBe(112);
      expect(raceTarget.dayType).toBe("competition");
    });

    it("elevates protein during 'lose' goal to protect lean tissue and applies conservative deficit", () => {
      const maintainTarget = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "moderate",
        goal: "maintain"
      });

      const loseTarget = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "moderate",
        goal: "lose"
      });

      expect(loseTarget.targetCalories).toBeLessThan(maintainTarget.targetCalories);
      expect(loseTarget.targetProteinGrams).toBeGreaterThan(maintainTarget.targetProteinGrams);
    });

    it("scales hydration and adds electrolyte hints for sessions exceeding 60 minutes", () => {
      const shortEasy = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "light",
        sessionDurationMinutes: 40,
        isHotOrHumid: false
      });

      const longHot = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "hard",
        sessionDurationMinutes: 120,
        isHotOrHumid: true
      });

      expect(longHot.targetHydrationLiters).toBeGreaterThan(shortEasy.targetHydrationLiters);
      expect(longHot.targetSodiumMg).toBeGreaterThan(shortEasy.targetSodiumMg);
      expect(longHot.electrolyteHint).toBeDefined();
    });

    it("retains dietitian provenance badge when target is set by a specialist", () => {
      const dietitianProvenance: TargetProvenance = {
        userId: "dietitian-123",
        userName: "Dr. Kiss Eszter",
        role: "dietitian",
        title: "Vezető Sportdietetikus",
        updatedAt: "2026-10-26T10:00:00Z"
      };

      const target = calculateDailyNutritionTarget({
        ...baseMaleProfile,
        dayType: "moderate",
        setBy: dietitianProvenance
      });

      expect(target.setBy.role).toBe("dietitian");
      expect(target.setBy.userName).toBe("Dr. Kiss Eszter");
    });
  });

  describe("Session Fuelling Planner", () => {
    it("suggests 0 g/h for short workouts under 45 minutes", () => {
      const plan = planSessionFuelling({
        workoutId: "w1",
        title: "Könnyű regeneráló futás",
        sport: "running",
        durationMinutes: 40,
        intensityRpe: 3,
        athleteWeightKg: 70
      });

      expect(plan.duringSession.carbsPerHourGrams).toBe(0);
      expect(plan.duringSession.totalCarbsGrams).toBe(0);
      expect(plan.preSession.carbsGrams).toBeGreaterThan(0);
      expect(plan.postSession.proteinGrams).toBeGreaterThanOrEqual(20);
    });

    it("suggests 60 g/h for standard 2-hour endurance sessions", () => {
      const plan = planSessionFuelling({
        workoutId: "w2",
        title: "Hosszú zóna 2 kerékpár",
        sport: "cycling",
        durationMinutes: 120,
        intensityRpe: 6,
        athleteWeightKg: 70
      });

      expect(plan.duringSession.carbsPerHourGrams).toBe(60);
      expect(plan.duringSession.totalCarbsGrams).toBe(120);
      expect(plan.duringSession.sodiumPerHourMg).toBeGreaterThanOrEqual(400);
    });

    it("suggests up to 90 g/h with dual-source transporters for ultra sessions > 2.5 hours", () => {
      const plan = planSessionFuelling({
        workoutId: "w3",
        title: "Maraton specifikus hosszú futás",
        sport: "running",
        durationMinutes: 180,
        intensityRpe: 8,
        athleteWeightKg: 70
      });

      expect(plan.duringSession.carbsPerHourGrams).toBe(90);
      expect(plan.duringSession.totalCarbsGrams).toBe(270);
      expect(plan.duringSession.guidelines.some((g) => g.includes("2:1"))).toBe(true);
    });
  });

  describe("Body Metrics 7-Day Smoothing", () => {
    it("smooths sharp single-day water/glycogen spikes", () => {
      const rawEntries: BodyMetricEntry[] = [
        { id: "1", athleteId: "a1", date: "2026-10-20", weightKg: 70.0, source: "manual" },
        { id: "2", athleteId: "a1", date: "2026-10-21", weightKg: 70.2, source: "manual" },
        { id: "3", athleteId: "a1", date: "2026-10-22", weightKg: 70.1, source: "manual" },
        // Carb refeed / high sodium spike day (+2 kg acute water retention):
        { id: "4", athleteId: "a1", date: "2026-10-23", weightKg: 72.1, source: "manual" },
        { id: "5", athleteId: "a1", date: "2026-10-24", weightKg: 70.4, source: "manual" },
        { id: "6", athleteId: "a1", date: "2026-10-25", weightKg: 70.2, source: "manual" },
        { id: "7", athleteId: "a1", date: "2026-10-26", weightKg: 70.3, source: "manual" }
      ];

      const smoothed = calculateSmoothedBodyMetrics(rawEntries);

      expect(smoothed.length).toBe(7);
      const spikeDay = smoothed.find((s) => s.date === "2026-10-23")!;
      // Raw was 72.1, but smoothed should be much closer to 70.6
      expect(spikeDay.weightKg).toBe(72.1);
      expect(spikeDay.smoothedWeightKg).toBeLessThan(71.0);
      expect(spikeDay.smoothedWeightKg).toBeGreaterThan(70.0);
    });

    it("calculates weekly weight change rate", () => {
      const rawEntries: BodyMetricEntry[] = [
        { id: "1", athleteId: "a1", date: "2026-10-01", weightKg: 72.0, source: "manual" },
        { id: "2", athleteId: "a1", date: "2026-10-08", weightKg: 71.5, source: "manual" },
        { id: "3", athleteId: "a1", date: "2026-10-15", weightKg: 71.0, source: "manual" }
      ];

      const smoothed = calculateSmoothedBodyMetrics(rawEntries);
      const rate = calculateWeeklyWeightChangeRate(smoothed);

      expect(rate.trend).toBe("losing");
      expect(rate.weeklyRateKg).toBeLessThan(0);
    });
  });

  describe("Low Energy Availability (LEA) Sensitive Safeguard", () => {
    it("does not trigger alert for balanced intake days", () => {
      const balancedDays = [
        { date: "2026-10-24", consumedCalories: 2900, targetCalories: 3000, trainingLoadTss: 80 },
        { date: "2026-10-25", consumedCalories: 2800, targetCalories: 3100, trainingLoadTss: 90 },
        { date: "2026-10-26", consumedCalories: 3000, targetCalories: 3000, trainingLoadTss: 85 }
      ];

      const alert = detectLowEnergyAvailability(balancedDays);
      expect(alert.triggered).toBe(false);
    });

    it("triggers conservative, non-shaming alert for 3 consecutive days of severe deficit under high load", () => {
      const severeDeficitDays = [
        { date: "2026-10-24", consumedCalories: 1400, targetCalories: 3200, trainingLoadTss: 95 },
        { date: "2026-10-25", consumedCalories: 1350, targetCalories: 3100, trainingLoadTss: 80 },
        { date: "2026-10-26", consumedCalories: 1200, targetCalories: 3400, trainingLoadTss: 110 }
      ];

      const alert = detectLowEnergyAvailability(severeDeficitDays);
      expect(alert.triggered).toBe(true);
      expect(alert.consecutiveDays).toBe(3);
      expect(alert.disclaimer).toContain("nem minősül orvosi diagnózisnak");
      expect(alert.disclaimer).toContain("sportdietetikusoddal vagy sportorvosoddal");
    });
  });
});
