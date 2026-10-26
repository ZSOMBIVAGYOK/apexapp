import { describe, it, expect } from "vitest";
import { generateWeeklyReview } from "./weeklyReviewEngine";

describe("generateWeeklyReview", () => {
  it("should calculate progressive load within safe ramp rate and positive HRV rebound", () => {
    const res = generateWeeklyReview({
      weekStartDate: "2026-10-19",
      currentWeekLoadAu: 2450,
      previousWeekLoadAu: 2100,
      averageSleepHours: 8.1,
      sleepTargetHours: 8.0,
      readinessCounts: { green: 5, amber: 2, red: 0 },
      nutritionDaysAdherent: 6,
      nutritionTotalDays: 7,
      workoutsPlanned: 6,
      workoutsCompleted: 6,
      averageHrvMs: 84,
      baselineHrvMs: 78
    });

    expect(res.loadChangePercent).toBe(17);
    expect(res.isLoadSafe).toBe(true);
    expect(res.sleepDebtHours).toBe(0);
    expect(res.compliancePercent).toBe(100);
    expect(res.nutritionAdherencePercent).toBe(86);
    expect(res.readinessGreenPercent).toBe(71);
    expect(res.summaryHu).toContain("biztonságos adaptációs zónán belül");
    expect(res.summaryEn).toContain("optimal progressive overload");
  });

  it("should detect load spike when ramp exceeds 20%", () => {
    const res = generateWeeklyReview({
      weekStartDate: "2026-10-19",
      currentWeekLoadAu: 3200,
      previousWeekLoadAu: 2200, // +45% spike
      averageSleepHours: 6.8,
      sleepTargetHours: 8.0,
      readinessCounts: { green: 2, amber: 4, red: 1 },
      nutritionDaysAdherent: 4,
      nutritionTotalDays: 7,
      workoutsPlanned: 6,
      workoutsCompleted: 5,
      averageHrvMs: 65,
      baselineHrvMs: 78
    });

    expect(res.loadChangePercent).toBe(45);
    expect(res.isLoadSafe).toBe(false);
    expect(res.sleepDebtHours).toBeGreaterThan(0);
    expect(res.summaryHu).toContain("Figyelem: A heti összterhelés +45%-kal növekedett");
    expect(res.summaryEn).toContain("Caution: Weekly training load spiked");
  });
});
