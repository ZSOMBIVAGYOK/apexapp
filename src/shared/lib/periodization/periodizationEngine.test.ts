import { describe, it, expect } from "vitest";
import {
  generateBackwardPeriodization,
  calculateTaperSchedule,
  calculateRaceCountdown,
  getPrimaryARace
} from "./periodizationEngine";
import { Competition } from "@shared/types/training";

describe("Periodization & Tapering Engine", () => {
  describe("generateBackwardPeriodization", () => {
    it("generates 6 contiguous phases working backward from the A-race date", () => {
      const aRaceDate = "2026-10-18";
      const phases = generateBackwardPeriodization({
        aRaceDate,
        targetPeakWeeklyHours: 12,
        phaseLengthsWeeks: {
          race: 1,
          taper: 2,
          peak: 2,
          build: 6,
          base: 8,
          transition: 2
        }
      });

      expect(phases).toHaveLength(6);

      const [trans, base, build, peak, taper, race] = phases;
      expect(trans!.type).toBe("transition");
      expect(base!.type).toBe("base");
      expect(build!.type).toBe("build");
      expect(peak!.type).toBe("peak");
      expect(taper!.type).toBe("taper");
      expect(race!.type).toBe("race");

      // Race ends on the exact A-race date
      expect(race!.endDate).toBe(aRaceDate);

      // Phases must be contiguous: day after peak end is taper start
      const peakEndDate = new Date(peak!.endDate);
      const dayAfterPeak = new Date(peakEndDate);
      dayAfterPeak.setDate(dayAfterPeak.getDate() + 1);
      const dayAfterPeakStr = dayAfterPeak.toISOString().split("T")[0];
      expect(taper!.startDate).toBe(dayAfterPeakStr);

      // Taper volume must be significantly reduced compared to Peak (Mujika & Padilla principle)
      expect(taper!.targetWeeklyVolumeMinutes).toBeLessThan(peak!.targetWeeklyVolumeMinutes);
      expect(taper!.targetWeeklyVolumeMinutes).toBeCloseTo(peak!.targetWeeklyVolumeMinutes * 0.55, -1);
    });
  });

  describe("calculateTaperSchedule", () => {
    it("calculates a 14-day exponential volume decay schedule", () => {
      const schedule = calculateTaperSchedule(10, "2026-10-04", 14);

      expect(schedule.days).toHaveLength(14);
      expect(schedule.preTaperWeeklyHours).toBe(10);

      const day1 = schedule.days[0]!;
      const day7 = schedule.days[6]!;
      const day14 = schedule.days[13]!;

      // Progressive volume reduction
      expect(day1.volumePercent).toBeGreaterThan(day7.volumePercent);
      expect(day7.volumePercent).toBeGreaterThan(day14.volumePercent);

      // Day 1 recommended minutes vs Day 14
      expect(day1.recommendedMinutes).toBeGreaterThan(day14.recommendedMinutes);

      // Has principles in Hungarian and English
      expect(schedule.principlesHu.length).toBeGreaterThan(0);
      expect(schedule.principlesEn.length).toBeGreaterThan(0);
    });
  });

  describe("calculateRaceCountdown", () => {
    it("calculates upcoming days and weeks remaining correctly", () => {
      const countdown = calculateRaceCountdown("2026-06-30", "2026-06-16");
      expect(countdown.status).toBe("upcoming");
      expect(countdown.daysRemaining).toBe(14);
      expect(countdown.weeksRemaining).toBe(2);
      expect(countdown.formattedHu).toContain("14 nap");
    });

    it("identifies today as race day", () => {
      const countdown = calculateRaceCountdown("2026-06-16", "2026-06-16");
      expect(countdown.status).toBe("today");
      expect(countdown.formattedHu).toContain("MA VAN A VERSENYNAP");
    });

    it("identifies past races correctly", () => {
      const countdown = calculateRaceCountdown("2026-06-10", "2026-06-16");
      expect(countdown.status).toBe("past");
    });
  });

  describe("getPrimaryARace", () => {
    it("finds the nearest upcoming A-priority race", () => {
      const competitions: Competition[] = [
        {
          id: "comp-c",
          title: "Local 5k",
          date: "2026-07-01",
          priority: "C",
          sport: "running"
        },
        {
          id: "comp-b",
          title: "Half Marathon Prep",
          date: "2026-08-15",
          priority: "B",
          sport: "running"
        },
        {
          id: "comp-a",
          title: "Budapest Marathon",
          date: "2026-10-18",
          priority: "A",
          sport: "running"
        }
      ];

      const primary = getPrimaryARace(competitions);
      expect(primary).toBeDefined();
      expect(primary?.id).toBe("comp-a");
      expect(primary?.priority).toBe("A");
    });
  });
});
