import { describe, it, expect } from "vitest";
import {
  buildDailyLoadsMap,
  recomputeLoadsFromDate
} from "./loadRecomputation";
import { CompletedSessionDocument } from "@shared/types";

describe("Load Recomputation Engine - Retroactive Session Updates", () => {
  const ATHLETE_ID = "athlete-retro-01";
  const TODAY = "2026-10-27";

  const BASE_SESSIONS: CompletedSessionDocument[] = [
    {
      sessionId: "s1",
      athleteId: ATHLETE_ID,
      date: "2026-10-20",
      sport: "running",
      title: "Z2 Alapozó Futás",
      startTime: "08:00",
      durationMinutes: 60,
      rpe: 5,
      targetIntensityRpe: 5,
      trainingLoad: 300,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-20T08:00:00Z",
      updatedAt: "2026-10-20T08:00:00Z",
      updatedBy: ATHLETE_ID
    },
    {
      sessionId: "s2",
      athleteId: ATHLETE_ID,
      date: "2026-10-22",
      sport: "cycling",
      title: "Intervall Kerékpár",
      startTime: "17:00",
      durationMinutes: 75,
      rpe: 8,
      targetIntensityRpe: 8,
      trainingLoad: 600,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-22T17:00:00Z",
      updatedAt: "2026-10-22T17:00:00Z",
      updatedBy: ATHLETE_ID
    }
  ];

  it("1. builds daily loads map correctly from sessions", () => {
    const map = buildDailyLoadsMap(BASE_SESSIONS);
    expect(map["2026-10-20"]).toBe(300);
    expect(map["2026-10-22"]).toBe(600);
    expect(map["2026-10-21"]).toBeUndefined();
  });

  it("2. recomputes CTL, ATL, and TSB from affected date forward after inserting a past session", () => {
    // Insert a heavy session on 2026-10-21 (500 load)
    const newSession: CompletedSessionDocument = {
      sessionId: "s-retro",
      athleteId: ATHLETE_ID,
      date: "2026-10-21",
      sport: "strength",
      title: "Nehéz Erőedzés",
      startTime: "10:00",
      durationMinutes: 60,
      rpe: 9,
      targetIntensityRpe: 9,
      trainingLoad: 540,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-27T10:00:00Z",
      updatedAt: "2026-10-27T10:00:00Z",
      updatedBy: ATHLETE_ID
    };

    const updatedSessions = [...BASE_SESSIONS, newSession];

    const result = recomputeLoadsFromDate({
      athleteId: ATHLETE_ID,
      sessions: updatedSessions,
      affectedFromDate: "2026-10-21",
      todayStr: TODAY,
      persistToLocalStorage: false
    });

    expect(result.affectedFromDate).toBe("2026-10-21");
    expect(result.updatedHistoricalLoads["2026-10-21"]).toBe(540);

    // Verify 2026-10-21 point in series
    const point21 = result.series.find((p) => p.date === "2026-10-21");
    expect(point21).toBeDefined();
    expect(point21?.load).toBe(540);
    expect(point21?.yesterdayLoad).toBe(300); // 2026-10-20 load

    // Verify day after (2026-10-22) reflects the new yesterday load
    const point22 = result.series.find((p) => p.date === "2026-10-22");
    expect(point22?.yesterdayLoad).toBe(540);
  });

  it("3. handles moving session date: recalculates from earlier date forward", () => {
    // Session s2 moves from 2026-10-22 to 2026-10-18
    const movedSessions = BASE_SESSIONS.map((s) =>
      s.sessionId === "s2" ? { ...s, date: "2026-10-18" } : s
    );

    const result = recomputeLoadsFromDate({
      athleteId: ATHLETE_ID,
      sessions: movedSessions,
      affectedFromDate: "2026-10-18",
      todayStr: TODAY,
      persistToLocalStorage: false
    });

    expect(result.updatedHistoricalLoads["2026-10-18"]).toBe(600);
    expect(result.updatedHistoricalLoads["2026-10-22"]).toBeUndefined();

    // The load on 2026-10-22 is now 0
    const point22 = result.series.find((p) => p.date === "2026-10-22");
    expect(point22?.load).toBe(0);
  });

  it("4. recalculates acute 7d and chronic 28d rolling averages and ACWR correctly", () => {
    const result = recomputeLoadsFromDate({
      athleteId: ATHLETE_ID,
      sessions: BASE_SESSIONS,
      affectedFromDate: "2026-10-20",
      todayStr: TODAY,
      persistToLocalStorage: false
    });

    const todayPoint = result.series.find((p) => p.date === TODAY);
    expect(todayPoint).toBeDefined();
    expect(todayPoint!.acute7d).toBeGreaterThanOrEqual(0);
    expect(todayPoint!.chronic28d).toBeGreaterThanOrEqual(0);
    expect(todayPoint!.acwr).toBeGreaterThan(0);
  });

  it("5. reducing or deleting a session decreases fatigue (ATL)", () => {
    // Compare full sessions with sessions after s2 is deleted
    const resWithS2 = recomputeLoadsFromDate({
      athleteId: ATHLETE_ID,
      sessions: BASE_SESSIONS,
      affectedFromDate: "2026-10-20",
      todayStr: TODAY,
      persistToLocalStorage: false
    });

    const resWithoutS2 = recomputeLoadsFromDate({
      athleteId: ATHLETE_ID,
      sessions: [BASE_SESSIONS[0]!],
      affectedFromDate: "2026-10-22",
      todayStr: TODAY,
      persistToLocalStorage: false
    });

    expect(resWithoutS2.latestAtl).toBeLessThanOrEqual(resWithS2.latestAtl);
  });
});
