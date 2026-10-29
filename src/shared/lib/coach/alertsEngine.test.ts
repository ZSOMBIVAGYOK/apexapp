import { describe, it, expect } from "vitest";
import {
  evaluateAthleteAlerts,
  filterAlertsForStaff,
  acknowledgeAlert,
  snoozeAlert,
  annotateAlert,
  AthleteDataSnapshot
} from "./alertsEngine";
import { ModulePermissions } from "@shared/types/dataModel";

describe("Athlete Alerts Engine & Permission-Gated Routing", () => {
  const baseSnapshot: AthleteDataSnapshot = {
    athleteId: "athlete-001",
    athleteName: "Kovács Zsombor",
    dailyRecords: [],
    recentSessions: [],
    plannedWorkouts: [],
    recentNutritionDays: [],
    recentInjuries: []
  };

  describe("1. Alert Detection Rules", () => {
    it("triggers missed_checkins alert when 3+ consecutive days have no check-in", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        dailyRecords: [
          { date: "2026-10-23", checkInCompleted: false },
          { date: "2026-10-24", checkInCompleted: false },
          { date: "2026-10-25", checkInCompleted: false }
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const missedAlert = alerts.find((a) => a.type === "missed_checkins");

      expect(missedAlert).toBeDefined();
      expect(missedAlert?.module).toBe("recovery");
      expect(missedAlert?.severity).toBe("caution");
    });

    it("triggers readiness_red alert when readiness is in red/rest zone for 2+ consecutive days", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        dailyRecords: [
          { date: "2026-10-24", readinessScore: 32, readinessZone: "rest", checkInCompleted: true },
          { date: "2026-10-25", readinessScore: 28, readinessZone: "rest", checkInCompleted: true }
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const redAlert = alerts.find((a) => a.type === "readiness_red");

      expect(redAlert).toBeDefined();
      expect(redAlert?.module).toBe("recovery");
      expect(redAlert?.severity).toBe("critical");
    });

    it("triggers load_spike alert when ACWR exceeds threshold (>=1.5)", () => {
      const now = new Date();
      const sessions = [
        // High acute load in last 7 days (4 sessions with load 150 each = 600 total / 7 = 85.7)
        { id: "s1", start: new Date(now.getTime() - 1 * 86400000).toISOString(), duration: 90, load: 150, completed: true },
        { id: "s2", start: new Date(now.getTime() - 2 * 86400000).toISOString(), duration: 90, load: 150, completed: true },
        { id: "s3", start: new Date(now.getTime() - 3 * 86400000).toISOString(), duration: 90, load: 150, completed: true },
        { id: "s4", start: new Date(now.getTime() - 4 * 86400000).toISOString(), duration: 90, load: 150, completed: true },
        // Low previous chronic load (only 1 session earlier in day 20)
        { id: "s5", start: new Date(now.getTime() - 20 * 86400000).toISOString(), duration: 60, load: 80, completed: true }
      ];

      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        recentSessions: sessions
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const spikeAlert = alerts.find((a) => a.type === "load_spike");

      expect(spikeAlert).toBeDefined();
      expect(spikeAlert?.module).toBe("training");
      expect(spikeAlert?.severity).toBe("critical");
    });

    it("triggers sleep_deprivation alert when sleep is under 6h for 3 consecutive nights", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        dailyRecords: [
          { date: "2026-10-23", sleep: { durationMinutes: 320 }, checkInCompleted: true },
          { date: "2026-10-24", sleep: { durationMinutes: 340 }, checkInCompleted: true },
          { date: "2026-10-25", sleep: { durationMinutes: 310 }, checkInCompleted: true }
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const sleepAlert = alerts.find((a) => a.type === "sleep_deprivation");

      expect(sleepAlert).toBeDefined();
      expect(sleepAlert?.module).toBe("recovery");
    });

    it("triggers rapid_weight_change alert when weight shifts >2% in 48 hours", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        dailyRecords: [
          { date: "2026-10-24", weight: 75.0, checkInCompleted: true },
          { date: "2026-10-25", weight: 73.0, checkInCompleted: true } // -2.67% drop
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const weightAlert = alerts.find((a) => a.type === "rapid_weight_change");

      expect(weightAlert).toBeDefined();
      expect(weightAlert?.module).toBe("health");
    });

    it("triggers reported_illness alert when athlete flags illness on check-in", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        dailyRecords: [
          { date: "2026-10-25", illness: true, checkInCompleted: true }
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const illnessAlert = alerts.find((a) => a.type === "reported_illness");

      expect(illnessAlert).toBeDefined();
      expect(illnessAlert?.module).toBe("health");
      expect(illnessAlert?.severity).toBe("critical");
    });

    it("triggers low_energy_availability alert on sustained severe caloric deficit with training", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        recentNutritionDays: [
          { date: "2026-10-23", calories: 1500, targetCalories: 3000 }, // 50%
          { date: "2026-10-24", calories: 1600, targetCalories: 3100 }, // 51%
          { date: "2026-10-25", calories: 1400, targetCalories: 2900 }  // 48%
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const leaAlert = alerts.find((a) => a.type === "low_energy_availability");

      expect(leaAlert).toBeDefined();
      expect(leaAlert?.module).toBe("nutrition");
      expect(leaAlert?.severity).toBe("critical");
    });

    it("triggers sustained_high_strain alert when strain exceeds target for 3 consecutive days", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        dailyRecords: [
          { date: "2026-10-23", strainScore: 78, strainTargetHigh: 60, checkInCompleted: true },
          { date: "2026-10-24", strainScore: 82, strainTargetHigh: 65, checkInCompleted: true },
          { date: "2026-10-25", strainScore: 75, strainTargetHigh: 60, checkInCompleted: true }
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const strainAlert = alerts.find((a) => a.type === "sustained_high_strain");

      expect(strainAlert).toBeDefined();
      expect(strainAlert?.module).toBe("training");
      expect(strainAlert?.severity).toBe("caution");
    });

    it("triggers consecutive_low_sleep alert when sleep score is below 60 for 3 consecutive nights", () => {
      const snapshot: AthleteDataSnapshot = {
        ...baseSnapshot,
        dailyRecords: [
          { date: "2026-10-23", sleepScore: 52, checkInCompleted: true },
          { date: "2026-10-24", sleepScore: 48, checkInCompleted: true },
          { date: "2026-10-25", sleepScore: 55, checkInCompleted: true }
        ]
      };

      const alerts = evaluateAthleteAlerts(snapshot);
      const sleepScoreAlert = alerts.find((a) => a.type === "consecutive_low_sleep");

      expect(sleepScoreAlert).toBeDefined();
      expect(sleepScoreAlert?.module).toBe("recovery");
      expect(sleepScoreAlert?.severity).toBe("caution");
    });
  });

  describe("2. Strict Permission-Gated Routing", () => {
    // Generate a multi-domain alert collection
    const mixedAlerts = evaluateAthleteAlerts({
      ...baseSnapshot,
      dailyRecords: [
        { date: "2026-10-23", checkInCompleted: false, sleep: { durationMinutes: 300 } },
        { date: "2026-10-24", checkInCompleted: false, sleep: { durationMinutes: 310 } },
        { date: "2026-10-25", checkInCompleted: false, sleep: { durationMinutes: 320 }, illness: true, weight: 71.0 }
      ],
      recentNutritionDays: [
        { date: "2026-10-23", calories: 1400, targetCalories: 3000 },
        { date: "2026-10-24", calories: 1400, targetCalories: 3000 },
        { date: "2026-10-25", calories: 1400, targetCalories: 3000 }
      ]
    });

    it("Coach with default permissions (health = 'none') does NOT receive health alerts", () => {
      const coachPermissions: ModulePermissions = {
        training: "write",
        recovery: "read",
        nutrition: "read",
        devices: "read",
        messages: "write",
        health: "none" // Coach does NOT have health permission
      };

      const filtered = filterAlertsForStaff(mixedAlerts, coachPermissions);

      // Verify no health alerts leaked to coach
      const hasHealthAlert = filtered.some((a) => a.module === "health");
      expect(hasHealthAlert).toBe(false);

      // Verify recovery and nutrition alerts are delivered
      const hasRecoveryAlert = filtered.some((a) => a.module === "recovery");
      const hasNutritionAlert = filtered.some((a) => a.module === "nutrition");
      expect(hasRecoveryAlert).toBe(true);
      expect(hasNutritionAlert).toBe(true);
    });

    it("Physiotherapist (health = 'write', nutrition = 'none') receives health alerts but NOT nutrition alerts", () => {
      const physioPermissions: ModulePermissions = {
        health: "write",
        training: "read",
        recovery: "read",
        messages: "write",
        nutrition: "none",
        devices: "none"
      };

      const filtered = filterAlertsForStaff(mixedAlerts, physioPermissions);

      // Physio receives health alerts (illness)
      const hasHealthAlert = filtered.some((a) => a.module === "health");
      expect(hasHealthAlert).toBe(true);

      // Physio does NOT receive nutrition alerts (LEA)
      const hasNutritionAlert = filtered.some((a) => a.module === "nutrition");
      expect(hasNutritionAlert).toBe(false);
    });

    it("Dietitian (nutrition = 'write', health = 'none') receives nutrition alerts but NOT health alerts", () => {
      const dietitianPermissions: ModulePermissions = {
        nutrition: "write",
        recovery: "read",
        training: "read",
        messages: "write",
        health: "none",
        devices: "none"
      };

      const filtered = filterAlertsForStaff(mixedAlerts, dietitianPermissions);

      // Dietitian receives LEA nutrition alert
      const hasNutritionAlert = filtered.some((a) => a.module === "nutrition");
      expect(hasNutritionAlert).toBe(true);

      // Dietitian does NOT receive health alerts
      const hasHealthAlert = filtered.some((a) => a.module === "health");
      expect(hasHealthAlert).toBe(false);
    });
  });

  describe("3. Alert Lifecycle (Acknowledge, Snooze, Annotate)", () => {
    const sampleAlert = evaluateAthleteAlerts({
      ...baseSnapshot,
      dailyRecords: [
        { date: "2026-10-23", checkInCompleted: false },
        { date: "2026-10-24", checkInCompleted: false },
        { date: "2026-10-25", checkInCompleted: false }
      ]
    })[0]!;

    it("acknowledges an alert", () => {
      const acked = acknowledgeAlert(sampleAlert, "coach-123", "Varga Tamás");

      expect(acked.status).toBe("acknowledged");
      expect(acked.acknowledgedBy).toBe("coach-123");
      expect(acked.acknowledgedAt).toBeDefined();
    });

    it("snoozes an alert for 48 hours", () => {
      const snoozed = snoozeAlert(sampleAlert, 48);

      expect(snoozed.status).toBe("snoozed");
      expect(snoozed.snoozedUntil).toBeDefined();
      const diffHours = (new Date(snoozed.snoozedUntil!).getTime() - Date.now()) / (3600 * 1000);
      expect(Math.round(diffHours)).toBe(48);
    });

    it("annotates an alert with staff notes", () => {
      const annotated = annotateAlert(
        sampleAlert,
        "coach-123",
        "Varga Tamás",
        "Vezetőedző",
        "Telefonon egyeztettem Zsomborral, tegnap este későn érkezett haza az edzőtáborból."
      );

      expect(annotated.annotations).toHaveLength(1);
      expect(annotated.annotations![0]!.authorRole).toBe("Vezetőedző");
      expect(annotated.annotations![0]!.text).toContain("Telefonon egyeztettem");
    });
  });
});
