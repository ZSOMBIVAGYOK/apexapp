import { describe, it, expect } from "vitest";
import {
  calculateWeeklyRecoverySummary,
  STANDARD_RECOVERY_ACTIVITIES,
  RECOVERY_CATEGORIES
} from "@shared/lib/recovery";
import { RecoveryActivityLog } from "@shared/types/recovery";

describe("Recovery Activities & Catalog", () => {
  it("1. Standard catalog contains all 7 required categories with required activities", () => {
    const categoryIds = RECOVERY_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain("mobility_gymnastics");
    expect(categoryIds).toContain("cold");
    expect(categoryIds).toContain("heat");
    expect(categoryIds).toContain("contrast");
    expect(categoryIds).toContain("massage_therapy");
    expect(categoryIds).toContain("sleep_relaxation");
    expect(categoryIds).toContain("other");

    // Standard activities count
    expect(STANDARD_RECOVERY_ACTIVITIES.length).toBeGreaterThanOrEqual(15);

    // Verify presence of required sports/recovery types
    const names = STANDARD_RECOVERY_ACTIVITIES.map((a) => a.nameHu);
    expect(names).toContain("Korrekciós torna");
    expect(names).toContain("SMR henger / Foam roller");
    expect(names).toContain("Jóga");
    expect(names).toContain("Légzőgyakorlat");
    expect(names).toContain("Hidegvizes merülés");
    expect(names).toContain("Jégfürdő");
    expect(names).toContain("Finn szauna");
    expect(names).toContain("Kontrasztfürdő / zuhany");
    expect(names).toContain("Sportmasszázs");
    expect(names).toContain("Kompressziós csizma");
  });

  it("2. calculateWeeklyRecoverySummary accurately aggregates minutes by category for the week", () => {
    // Reference Monday: 2026-10-19 to Sunday 2026-10-25
    const mockLogs: RecoveryActivityLog[] = [
      {
        id: "log-1",
        athleteId: "ath-1",
        date: "2026-10-20",
        startTime: "18:00",
        activityTypeId: "rec-finnish-sauna",
        activityName: "Finn szauna",
        category: "heat",
        durationMinutes: 30,
        temperatureCelsius: 85,
        perceivedEffect: 5,
        createdAt: "2026-10-20T18:00:00Z",
        updatedAt: "2026-10-20T18:00:00Z",
        updatedBy: "ath-1"
      },
      {
        id: "log-2",
        athleteId: "ath-1",
        date: "2026-10-20",
        startTime: "18:35",
        activityTypeId: "rec-cold-plunge",
        activityName: "Hidegvizes merülés",
        category: "cold",
        durationMinutes: 5,
        temperatureCelsius: 8,
        perceivedEffect: 4,
        createdAt: "2026-10-20T18:35:00Z",
        updatedAt: "2026-10-20T18:35:00Z",
        updatedBy: "ath-1"
      },
      {
        id: "log-3",
        athleteId: "ath-1",
        date: "2026-10-22",
        startTime: "19:00",
        activityTypeId: "rec-foam-roll",
        activityName: "SMR henger",
        category: "mobility_gymnastics",
        durationMinutes: 20,
        perceivedEffect: 4,
        createdAt: "2026-10-22T19:00:00Z",
        updatedAt: "2026-10-22T19:00:00Z",
        updatedBy: "ath-1"
      },
      // Previous week activity (2026-10-15) - should be excluded from this week's summary
      {
        id: "log-old",
        athleteId: "ath-1",
        date: "2026-10-15",
        startTime: "10:00",
        activityTypeId: "rec-sport-massage",
        activityName: "Sportmasszázs",
        category: "massage_therapy",
        durationMinutes: 60,
        perceivedEffect: 5,
        createdAt: "2026-10-15T10:00:00Z",
        updatedAt: "2026-10-15T10:00:00Z",
        updatedBy: "ath-1"
      }
    ];

    const summary = calculateWeeklyRecoverySummary(mockLogs, "2026-10-23");

    expect(summary.totalMinutes).toBe(55); // 30 + 5 + 20
    expect(summary.totalActivitiesCount).toBe(3);
    expect(summary.byCategory.heat).toBe(30);
    expect(summary.byCategory.cold).toBe(5);
    expect(summary.byCategory.mobility_gymnastics).toBe(20);
    expect(summary.byCategory.massage_therapy).toBe(0);
  });
});
