import { describe, it, expect } from "vitest";
import { calculateReadiness, ReadinessInput } from "./readinessEngine";
import { DEFAULT_READINESS_CONFIG } from "./readinessConfig";

describe("Readiness Engine", () => {
  const baseFreshWellness = {
    fatigue: 1, // Fresh
    soreness: 1, // None
    stress: 1, // Calm
    mood: 5, // Great
    motivation: 5 // Peak
  };

  const baseExhaustedWellness = {
    fatigue: 5, // Exhausted
    soreness: 5, // Extreme
    stress: 4, // High stress
    mood: 2, // Poor
    motivation: 2 // Low
  };

  describe("Manual Path", () => {
    it("computes green readiness band for an athlete with 8h sleep and fresh Hooper scores", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480, // 8 hours
          qualityScore: 5 // 5/5
        },
        wellness: baseFreshWellness,
        historicalDaysCount: 20
      };

      const result = calculateReadiness(input);

      expect(result.pathUsed).toBe("manual");
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.band).toBe("green");
      expect(result.isCalibrating).toBe(false);
      expect(result.drivers.length).toBeGreaterThanOrEqual(1);
      expect(result.drivers.some((d) => d.impact === "positive")).toBe(true);
    });

    it("computes red/amber band for severe sleep deficit and exhausted Hooper scores", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 240, // 4 hours
          qualityScore: 1
        },
        wellness: baseExhaustedWellness,
        historicalDaysCount: 20
      };

      const result = calculateReadiness(input);

      expect(result.score).toBeLessThan(35);
      expect(["amber", "red"]).toContain(result.band);
      expect(result.drivers.some((d) => d.id === "sleep_deficit")).toBe(true);
      expect(result.drivers.some((d) => d.id === "fatigue_high" || d.id === "soreness_high")).toBe(true);
    });

    it("applies severe penalty and caps readiness at 40 when illness is reported", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 4
        },
        wellness: {
          ...baseFreshWellness,
          illness: true
        },
        historicalDaysCount: 15
      };

      const result = calculateReadiness(input);

      expect(result.score).toBeLessThanOrEqual(40);
      expect(["red", "amber"]).toContain(result.band);
      expect(result.drivers.some((d) => d.id === "illness_active")).toBe(true);
    });
  });

  describe("Biometric Path & Deviations", () => {
    it("computes high biometric readiness when HRV and Resting HR match optimal baseline", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 5
        },
        wellness: baseFreshWellness,
        biometrics: {
          hrvRmssd: 85,
          restingHr: 48,
          baselineHrvMean: 82,
          baselineHrvSd: 8,
          baselineRhrMean: 49,
          baselineRhrSd: 3
        },
        historicalDaysCount: 28,
        forcePath: "biometric"
      };

      const result = calculateReadiness(input);

      expect(result.pathUsed).toBe("biometric");
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.band).toBe("green");
      expect(result.components.biometricScore).toBeDefined();
    });

    it("penalizes readiness when HRV is significantly suppressed below baseline", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 450,
          qualityScore: 3
        },
        wellness: baseFreshWellness,
        biometrics: {
          hrvRmssd: 50, // Mean is 85, SD is 10 -> z-score = -3.5 (severe suppression)
          restingHr: 58, // Elevated +8 bpm above baseline 50
          baselineHrvMean: 85,
          baselineHrvSd: 10,
          baselineRhrMean: 50,
          baselineRhrSd: 3
        },
        historicalDaysCount: 28,
        forcePath: "biometric"
      };

      const result = calculateReadiness(input);

      expect(result.score).toBeLessThan(55);
      expect(result.drivers.some((d) => d.id === "hrv_suppressed")).toBe(true);
      expect(result.drivers.some((d) => d.id === "rhr_elevated")).toBe(true);
    });
  });

  describe("Hybrid Path", () => {
    it("blends biometric and manual scores using configured weights", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 450,
          qualityScore: 4
        },
        wellness: {
          fatigue: 3,
          soreness: 3,
          stress: 2,
          mood: 4,
          motivation: 4
        },
        biometrics: {
          hrvRmssd: 75,
          restingHr: 52,
          baselineHrvMean: 75,
          baselineHrvSd: 7,
          baselineRhrMean: 52,
          baselineRhrSd: 3
        },
        historicalDaysCount: 20
      };

      const result = calculateReadiness(input);

      expect(result.pathUsed).toBe("hybrid");
      expect(result.components.biometricScore).toBeDefined();
      expect(result.components.wellnessScore).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(65);
    });
  });

  describe("Cold-Start Calibration", () => {
    it("flags isCalibrating=true and reports progress for athlete with < 14 days", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 4
        },
        wellness: baseFreshWellness,
        historicalDaysCount: 6 // Day 6 of 14
      };

      const result = calculateReadiness(input);

      expect(result.isCalibrating).toBe(true);
      expect(result.calibrationProgress.daysCollected).toBe(6);
      expect(result.calibrationProgress.daysRequired).toBe(14);
      expect(result.calibrationProgress.percentage).toBe(Math.round((6 / 14) * 100));
      expect(result.softMessageHu).toContain("Kalibrálás folyamatban");
      expect(result.softMessageEn).toContain("Calibration in progress");
    });

    it("flags isCalibrating=false once the athlete has logged >= 14 days", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 4
        },
        wellness: baseFreshWellness,
        historicalDaysCount: 14
      };

      const result = calculateReadiness(input);

      expect(result.isCalibrating).toBe(false);
      expect(result.calibrationProgress.percentage).toBe(100);
    });
  });

  describe("Confidence Evaluation", () => {
    it("reports ~60-70% confidence for purely manual check-ins without biometrics", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 4
        },
        wellness: baseFreshWellness,
        historicalDaysCount: 5
      };

      const result = calculateReadiness(input);

      expect(result.confidence).toBeGreaterThanOrEqual(60);
      expect(result.confidence).toBeLessThanOrEqual(70);
    });

    it("reports 95-100% confidence when full biometrics and 14+ historical days are present", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 5
        },
        wellness: baseFreshWellness,
        biometrics: {
          hrvRmssd: 80,
          restingHr: 50,
          baselineHrvMean: 78,
          baselineHrvSd: 6,
          baselineRhrMean: 50
        },
        historicalDaysCount: 20
      };

      const result = calculateReadiness(input);

      expect(result.confidence).toBe(100);
    });
  });

  describe("Training Load (ACWR) Penalty", () => {
    it("applies moderate deduction when ACWR is between 1.3 and 1.5", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 4
        },
        wellness: baseFreshWellness,
        trainingLoad: {
          acwr: 1.42
        },
        historicalDaysCount: 15
      };

      const result = calculateReadiness(input);

      expect(result.components.loadAdjustment).toBe(-DEFAULT_READINESS_CONFIG.thresholds.load.moderateDeduction);
      expect(result.drivers.some((d) => d.id === "acwr_spike")).toBe(true);
    });

    it("applies danger deduction when ACWR spikes above 1.5", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 480,
          qualityScore: 4
        },
        wellness: baseFreshWellness,
        trainingLoad: {
          acwr: 1.65
        },
        historicalDaysCount: 15
      };

      const result = calculateReadiness(input);

      expect(result.components.loadAdjustment).toBe(-DEFAULT_READINESS_CONFIG.thresholds.load.dangerDeduction);
      expect(result.drivers.some((d) => d.id === "acwr_spike")).toBe(true);
    });
  });

  describe("Top 3 Drivers Ranking", () => {
    it("limits drivers list to at most 3 items sorted by impact weight", () => {
      const input: ReadinessInput = {
        date: "2026-10-26",
        sleep: {
          durationMinutes: 300, // Deficit (-3h)
          qualityScore: 2
        },
        wellness: {
          fatigue: 5,
          soreness: 5,
          stress: 4,
          mood: 2,
          motivation: 2,
          illness: true,
          soreAreas: ["quads", "calves", "shoulders"]
        },
        biometrics: {
          hrvRmssd: 40,
          restingHr: 62,
          baselineHrvMean: 80,
          baselineHrvSd: 8,
          baselineRhrMean: 50
        },
        historicalDaysCount: 20
      };

      const result = calculateReadiness(input);

      expect(result.drivers.length).toBeLessThanOrEqual(3);
      // Top weight should be illness
      expect(result.drivers[0]?.id).toBe("illness_active");
    });
  });
});
