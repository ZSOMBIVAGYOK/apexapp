import { describe, it, expect } from "vitest";
import { RuleBasedPlanGenerator } from "./soloPlanGenerator";

describe("Solo Mode Periodized Plan Generator", () => {
  const generator = new RuleBasedPlanGenerator();

  it("generates a full season plan with phases and structured workouts", () => {
    const plan = generator.generatePlan({
      athleteId: "ath-123",
      sport: "running",
      level: "competitive",
      goal: "Sub 3:15 Marathon",
      aRaceDate: "2026-10-25",
      trainingDaysPerWeek: 4,
      weeklyAvailableHours: 8
    });

    expect(plan.athleteId).toBe("ath-123");
    expect(plan.sport).toBe("running");
    expect(plan.phases).toHaveLength(6);
    expect(plan.workouts.length).toBeGreaterThan(0);
    expect(plan.generatorType).toBe("rule_based");

    // All workouts have required properties
    plan.workouts.forEach((w) => {
      expect(w.athleteId).toBe("ath-123");
      expect(w.author.role).toBe("solo_generator");
      expect(w.plannedDurationMinutes).toBeGreaterThan(0);
      expect(w.plannedLoad).toBeGreaterThan(0);
      expect(w.blocks!.length).toBeGreaterThan(0);
    });

    // Check race day workout
    const raceDayWorkout = plan.workouts.find((w) => w.date === "2026-10-25");
    expect(raceDayWorkout).toBeDefined();
    expect(raceDayWorkout?.title).toContain("CÉLVERSENY");
  });

  it("adjusts workout frequency to athlete weekly availability", () => {
    const plan3Days = generator.generatePlan({
      athleteId: "ath-123",
      sport: "cycling",
      level: "hobby",
      goal: "Gran Fondo 120km",
      aRaceDate: "2026-09-20",
      trainingDaysPerWeek: 3,
      weeklyAvailableHours: 6
    });

    const plan5Days = generator.generatePlan({
      athleteId: "ath-123",
      sport: "cycling",
      level: "hobby",
      goal: "Gran Fondo 120km",
      aRaceDate: "2026-09-20",
      trainingDaysPerWeek: 5,
      weeklyAvailableHours: 10
    });

    expect(plan5Days.workouts.length).toBeGreaterThan(plan3Days.workouts.length);
  });
});
