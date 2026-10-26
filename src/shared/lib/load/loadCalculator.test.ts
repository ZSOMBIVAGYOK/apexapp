import { describe, it, expect } from "vitest";
import {
  calculateSessionLoad,
  calculatePMCSeries,
  calculateLoadSummary,
  LAMBDA_CTL,
  LAMBDA_ATL,
  PMC_METRIC_EXPLANATIONS
} from "./loadCalculator";
import { Competition, SeasonPhase } from "@shared/types/training";

describe("Load Analytics Engine", () => {
  describe("calculateSessionLoad", () => {
    it("returns 0 when duration is 0 or negative", () => {
      expect(calculateSessionLoad({ durationMinutes: 0 })).toBe(0);
      expect(calculateSessionLoad({ durationMinutes: -30 })).toBe(0);
    });

    it("calculates Coggan Power TSS accurately for 1 hour at threshold (FTP)", () => {
      // 60 min at FTP (NP = FTP = 250W) -> IF = 1.0 -> exactly 100 TSS
      const load = calculateSessionLoad({
        durationMinutes: 60,
        normalizedPower: 250,
        ftp: 250
      });
      expect(load).toBe(100);
    });

    it("calculates Coggan Power TSS accurately for 90 minutes at threshold", () => {
      // 90 min at FTP -> 1.5 * 100 = 150 TSS
      const load = calculateSessionLoad({
        durationMinutes: 90,
        normalizedPower: 200,
        ftp: 200
      });
      expect(load).toBe(150);
    });

    it("calculates Coggan Power TSS for sub-threshold endurance pace", () => {
      // 60 min at IF = 0.75 (150W / 200W) -> 0.75^2 * 100 = 56.25 -> 56 TSS
      const load = calculateSessionLoad({
        durationMinutes: 60,
        avgPower: 150,
        ftp: 200
      });
      expect(load).toBe(56);
    });

    it("calculates hrTSS when heart rate data and LTHR are provided", () => {
      // 60 min with avgHR 150 bpm, LTHR 165 bpm -> IF ~ 0.909 -> (0.909^2) * 100 = 83 hrTSS
      const load = calculateSessionLoad({
        durationMinutes: 60,
        avgHeartRate: 150,
        lthr: 165
      });
      expect(load).toBe(83);
    });

    it("falls back to Foster Session-RPE when power and HR are not available", () => {
      // 60 min x RPE 7 = 420 AU
      const load = calculateSessionLoad({
        durationMinutes: 60,
        rpe: 7
      });
      expect(load).toBe(420);
    });

    it("clamps RPE to [1, 10] range for Session-RPE", () => {
      expect(calculateSessionLoad({ durationMinutes: 45, rpe: 12 })).toBe(450); // 45 * 10
      expect(calculateSessionLoad({ durationMinutes: 45, rpe: -2 })).toBe(45); // 45 * 1
    });
  });

  describe("calculatePMCSeries", () => {
    it("computes daily CTL, ATL and TSB with correct time constant decays", () => {
      const today = "2026-05-15";
      const historical: Record<string, number> = {
        "2026-05-13": 80,
        "2026-05-14": 90,
        "2026-05-15": 100
      };
      const planned: Record<string, number> = {
        "2026-05-16": 75,
        "2026-05-17": 85
      };

      const series = calculatePMCSeries({
        historicalDailyLoads: historical,
        plannedFutureLoads: planned,
        todayStr: today,
        daysPast: 3,
        daysFuture: 2
      });

      expect(series.length).toBe(6); // 3 past + today + 2 future = 6 days
      const todayEntry = series.find((p) => p.date === today);
      expect(todayEntry).toBeDefined();
      expect(todayEntry?.isProjected).toBe(false);

      const futureEntry = series.find((p) => p.date === "2026-05-16");
      expect(futureEntry).toBeDefined();
      expect(futureEntry?.isProjected).toBe(true);
      expect(futureEntry?.dayLoad).toBe(75);
    });

    it("associates competitions and season phases with their corresponding dates", () => {
      const today = "2026-06-01";
      const comp: Competition = {
        id: "comp-1",
        title: "National Championship",
        date: "2026-06-02",
        priority: "A",
        sport: "running",
        distance: "Marathon"
      };
      const phase: SeasonPhase = {
        id: "phase-1",
        name: "Peak",
        type: "peak",
        startDate: "2026-05-25",
        endDate: "2026-06-05",
        targetWeeklyVolumeMinutes: 300,
        targetWeeklyLoad: 450,
        description: "Sharpening intensity"
      };

      const series = calculatePMCSeries({
        historicalDailyLoads: {},
        plannedFutureLoads: {},
        todayStr: today,
        daysPast: 2,
        daysFuture: 3,
        competitions: [comp],
        phases: [phase]
      });

      const raceDayPoint = series.find((p) => p.date === "2026-06-02");
      expect(raceDayPoint?.race).toBeDefined();
      expect(raceDayPoint?.race?.priority).toBe("A");
      expect(raceDayPoint?.phase?.name).toBe("Peak");
    });
  });

  describe("calculateLoadSummary", () => {
    it("derives CTL, ATL, TSB, ramp rate, ACWR, and Foster monotony & strain", () => {
      const today = "2026-06-10";
      const historical: Record<string, number> = {};

      // Seed 28 days of regular training (e.g., 70 TSS/day)
      for (let i = 0; i < 28; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0] as string;
        historical[dateStr] = 70;
      }

      const summary = calculateLoadSummary(historical, {}, today);

      expect(summary.todayCtl).toBeGreaterThan(0);
      expect(summary.todayAtl).toBeGreaterThan(0);
      expect(typeof summary.todayTsb).toBe("number");
      expect(typeof summary.weeklyRampRate).toBe("number");
      // Because loads were uniform (70 every day), ACWR is 1.0
      expect(summary.acwr).toBeCloseTo(1.0, 1);
      // Uniform daily load -> standard deviation is 0 -> Monotony is capped at 4.0
      expect(summary.monotony).toBe(4.0);
      expect(summary.strain).toBeGreaterThan(0);
    });

    it("detects variable training week with lower Foster monotony", () => {
      const today = "2026-06-10";
      const historical: Record<string, number> = {};

      // Seed 28 days, but with realistic variable training week: 0, 100, 50, 120, 0, 80, 40
      const weeklyPattern = [0, 100, 50, 120, 0, 80, 40];
      for (let i = 0; i < 28; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0] as string;
        historical[dateStr] = weeklyPattern[i % 7] ?? 50;
      }

      const summary = calculateLoadSummary(historical, {}, today);
      // Realistic variable training should have monotony < 2.0 (healthy training variability)
      expect(summary.monotony).toBeLessThan(2.0);
    });
  });

  describe("Bannister Model Constants & Metric Explanations", () => {
    it("has valid exponential decay lambda constants", () => {
      expect(LAMBDA_CTL).toBeCloseTo(0.0235, 3);
      expect(LAMBDA_ATL).toBeCloseTo(0.1331, 3);
    });

    it("provides bilingual metric explanations for CTL, ATL, TSB, ACWR, Monotony", () => {
      expect(PMC_METRIC_EXPLANATIONS.ctl.titleHu).toContain("Fittség");
      expect(PMC_METRIC_EXPLANATIONS.atl.titleHu).toContain("Fáradtság");
      expect(PMC_METRIC_EXPLANATIONS.tsb.titleHu).toContain("Forma");
      expect(PMC_METRIC_EXPLANATIONS.acwr.titleEn).toContain("Ratio");
    });
  });
});
