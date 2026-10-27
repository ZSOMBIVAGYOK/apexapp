import { describe, it, expect } from "vitest";
import {
  isBetterValue,
  formatRecordDisplay,
  detectRecordBeat,
  getRecordProgression
} from "./recordsService";
import { AthleteRecord } from "@shared/types/records";
import { CompletedSessionDocument } from "@shared/types/dataModel";

describe("Athlete Records & Record Beat Detection", () => {
  it("1. isBetterValue correctly respects metric direction (lower is better for time, higher for weight/reps)", () => {
    // Time for distance: lower is better
    expect(isBetterValue("time_for_distance", 1180, 1200)).toBe(true);
    expect(isBetterValue("time_for_distance", 1250, 1200)).toBe(false);

    // Weight: higher is better
    expect(isBetterValue("weight_reps_1rm", 150, 140)).toBe(true);
    expect(isBetterValue("weight_reps_1rm", 130, 140)).toBe(false);

    // Max reps: higher is better
    expect(isBetterValue("max_reps", 30, 25)).toBe(true);
    expect(isBetterValue("max_reps", 20, 25)).toBe(false);
  });

  it("2. formatRecordDisplay formats seconds, meters, and weights correctly", () => {
    // Time formatting: 1182 seconds -> 19:42
    expect(formatRecordDisplay("time_for_distance", 1182)).toBe("19:42");
    // Long duration: 3725 seconds -> 1:02:05
    expect(formatRecordDisplay("time_for_distance", 3725)).toBe("1:02:05");

    // Distance in time
    expect(formatRecordDisplay("distance_in_time", 3250)).toBe("3.25 km");
    expect(formatRecordDisplay("distance_in_time", 800)).toBe("800 m");

    // Weight and reps
    expect(formatRecordDisplay("weight_reps_1rm", 145)).toBe("145 kg");
    expect(formatRecordDisplay("max_reps", 28)).toBe("28 db");
  });

  it("3. detectRecordBeat detects when a logged session beats an existing personal best", () => {
    const existingRecords: AthleteRecord[] = [
      {
        id: "rec-5k",
        athleteId: "ath-1",
        sportId: "running",
        sportName: "Futás",
        discipline: "5 km",
        recordType: "time_for_distance",
        value: 1260, // 21:00
        displayValue: "21:00",
        date: "2026-09-15",
        isCurrentBest: true,
        createdAt: "2026-09-15T10:00:00Z",
        updatedAt: "2026-09-15T10:00:00Z"
      }
    ];

    // Session 5000m run in 1182s (19:42) -> beats 21:00!
    const session: CompletedSessionDocument = {
      sessionId: "sess-pb",
      athleteId: "ath-1",
      date: "2026-10-20",
      sport: "running",
      title: "5k Tempo PB",
      startTime: "09:00",
      durationMinutes: 20,
      durationSeconds: 1182,
      rpe: 9,
      targetIntensityRpe: 9,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-20T09:00:00Z",
      updatedAt: "2026-10-20T09:00:00Z",
      updatedBy: "ath-1",
      metrics: { distanceMeters: 5050 } // within 3% tolerance of 5000m
    };

    const prompt = detectRecordBeat(session, existingRecords);
    expect(prompt).not.toBeNull();
    expect(prompt?.discipline).toBe("5 km");
    expect(prompt?.newValue).toBe(1182);
    expect(prompt?.newDisplayValue).toBe("19:42");
    expect(prompt?.previousBestDisplayValue).toBe("21:00");
  });

  it("4. detectRecordBeat returns null if session is slower or sport does not match", () => {
    const existingRecords: AthleteRecord[] = [
      {
        id: "rec-5k",
        athleteId: "ath-1",
        sportId: "running",
        sportName: "Futás",
        discipline: "5 km",
        recordType: "time_for_distance",
        value: 1182, // 19:42
        displayValue: "19:42",
        date: "2026-09-15",
        isCurrentBest: true,
        createdAt: "2026-09-15T10:00:00Z",
        updatedAt: "2026-09-15T10:00:00Z"
      }
    ];

    // Slower session: 5000m run in 1300s (21:40)
    const slowerSession: CompletedSessionDocument = {
      sessionId: "sess-slow",
      athleteId: "ath-1",
      date: "2026-10-21",
      sport: "running",
      title: "Easy 5k",
      startTime: "09:00",
      durationMinutes: 22,
      durationSeconds: 1300,
      rpe: 5,
      targetIntensityRpe: 5,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-21T09:00:00Z",
      updatedAt: "2026-10-21T09:00:00Z",
      updatedBy: "ath-1",
      metrics: { distanceMeters: 5000 }
    };

    expect(detectRecordBeat(slowerSession, existingRecords)).toBeNull();
  });

  it("5. getRecordProgression returns records chronologically sorted", () => {
    const records: AthleteRecord[] = [
      {
        id: "rec-3",
        athleteId: "ath-1",
        sportId: "running",
        sportName: "Futás",
        discipline: "5 km",
        recordType: "time_for_distance",
        value: 1182,
        displayValue: "19:42",
        date: "2026-10-20",
        isCurrentBest: true,
        createdAt: "2026-10-20T10:00:00Z",
        updatedAt: "2026-10-20T10:00:00Z"
      },
      {
        id: "rec-1",
        athleteId: "ath-1",
        sportId: "running",
        sportName: "Futás",
        discipline: "5 km",
        recordType: "time_for_distance",
        value: 1320,
        displayValue: "22:00",
        date: "2026-06-01",
        isCurrentBest: false,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z"
      },
      {
        id: "rec-2",
        athleteId: "ath-1",
        sportId: "running",
        sportName: "Futás",
        discipline: "5 km",
        recordType: "time_for_distance",
        value: 1260,
        displayValue: "21:00",
        date: "2026-08-15",
        isCurrentBest: false,
        createdAt: "2026-08-15T10:00:00Z",
        updatedAt: "2026-08-15T10:00:00Z"
      }
    ];

    const progression = getRecordProgression(records, "running", "5 km");
    expect(progression.map((r) => r.date)).toEqual([
      "2026-06-01",
      "2026-08-15",
      "2026-10-20"
    ]);
  });
});
