import { describe, it, expect } from "vitest";
import {
  computeEquipmentState,
  evaluateMaintenanceTask,
  hasDueMaintenance,
  hasOverdueMaintenance
} from "./equipmentService";
import { EquipmentItem } from "@shared/types/equipment";
import { CompletedSessionDocument } from "@shared/types/dataModel";

describe("Equipment & Maintenance Service", () => {
  const baseEquipment: EquipmentItem = {
    id: "eq-shoes-1",
    athleteId: "ath-01",
    name: "Nike ZoomX Vaporfly",
    type: "shoes",
    brand: "Nike",
    model: "Vaporfly 3",
    purchaseDate: "2026-10-01",
    startingUsageKm: 50,
    startingUsageHours: 4,
    sportIds: ["running"],
    status: "active",
    totalKm: 50,
    totalHours: 4,
    maintenanceTasks: [
      {
        id: "task-replace",
        name: "Cipőcsere ajánlott",
        mode: "distance",
        intervalValue: 500,
        lastResetDate: "2026-10-01",
        lastResetUsageKm: 50,
        currentUsageSinceReset: 0,
        remaining: 500,
        remainingPercent: 100,
        status: "ok"
      },
      {
        id: "task-check",
        name: "Szemrevételezés",
        mode: "time",
        intervalValue: 30, // 30 days
        lastResetDate: "2026-10-01",
        lastResetUsageKm: 50,
        currentUsageSinceReset: 0,
        remaining: 30,
        remainingPercent: 100,
        status: "ok"
      }
    ],
    maintenanceHistory: [],
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  };

  const mockSessions: CompletedSessionDocument[] = [
    {
      sessionId: "sess-1",
      athleteId: "ath-01",
      date: "2026-10-05",
      sport: "running",
      title: "5k Tempo",
      startTime: "08:00",
      durationMinutes: 25,
      rpe: 7,
      targetIntensityRpe: 7,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-05T08:00:00Z",
      updatedAt: "2026-10-05T08:00:00Z",
      updatedBy: "ath-01",
      equipmentIds: ["eq-shoes-1"],
      metrics: { distanceMeters: 5000 }
    },
    {
      sessionId: "sess-2",
      athleteId: "ath-01",
      date: "2026-10-10",
      sport: "running",
      title: "15k Long Run",
      startTime: "09:00",
      durationMinutes: 75,
      rpe: 6,
      targetIntensityRpe: 6,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-10T09:00:00Z",
      updatedAt: "2026-10-10T09:00:00Z",
      updatedBy: "ath-01",
      equipmentIds: ["eq-shoes-1"],
      metrics: { distanceMeters: 15000 }
    }
  ];

  it("1. Accurately calculates equipment totals from starting usage + linked sessions", () => {
    const computed = computeEquipmentState([baseEquipment], mockSessions, "2026-10-15")[0]!;

    // 50 starting + 5km + 15km = 70 km
    expect(computed.totalKm).toBe(70);
    // 4 starting hours + (25m + 75m)/60 = 4 + 1.666 = 5.7 hours
    expect(computed.totalHours).toBeCloseTo(5.7, 1);
  });

  it("2. Accurately evaluates distance-based maintenance countdown and percentage", () => {
    const distanceTask = baseEquipment.maintenanceTasks[0]!;
    const evaluated = evaluateMaintenanceTask(distanceTask, mockSessions, "2026-10-15");

    // Elapsed distance since 2026-10-01 is 20 km
    expect(evaluated.currentUsageSinceReset).toBe(20);
    // Remaining is 500 - 20 = 480 km
    expect(evaluated.remaining).toBe(480);
    expect(evaluated.remainingPercent).toBe(96);
    expect(evaluated.status).toBe("ok");
  });

  it("3. Correctly triggers 'due_soon' (<15%) and 'overdue' (<=0) statuses", () => {
    // Heavy mileage sessions
    const heavySessions: CompletedSessionDocument[] = [
      {
        sessionId: "sess-marathon-1",
        athleteId: "ath-01",
        date: "2026-10-05",
        sport: "running",
        title: "Ultra 450k",
        startTime: "08:00",
        durationMinutes: 2000,
        rpe: 8,
        targetIntensityRpe: 8,
        completed: true,
        source: "manual",
        confidence: 1,
        createdAt: "2026-10-05T08:00:00Z",
        updatedAt: "2026-10-05T08:00:00Z",
        updatedBy: "ath-01",
        equipmentIds: ["eq-shoes-1"],
        metrics: { distanceMeters: 450000 } // 450 km (50 remaining out of 500 = 10% -> due_soon)
      }
    ];

    const distanceTask = baseEquipment.maintenanceTasks[0]!;
    const dueSoonEval = evaluateMaintenanceTask(distanceTask, heavySessions, "2026-10-15");
    expect(dueSoonEval.remaining).toBe(50);
    expect(dueSoonEval.remainingPercent).toBe(10);
    expect(dueSoonEval.status).toBe("due_soon");

    // Overdue sessions (550 km elapsed)
    const overdueSessions: CompletedSessionDocument[] = [
      {
        ...heavySessions[0]!,
        metrics: { distanceMeters: 550000 }
      }
    ];

    const overdueEval = evaluateMaintenanceTask(distanceTask, overdueSessions, "2026-10-15");
    expect(overdueEval.remaining).toBe(-50);
    expect(overdueEval.remainingPercent).toBe(0);
    expect(overdueEval.status).toBe("overdue");
  });

  it("4. Accurately evaluates time-based maintenance countdown", () => {
    const timeTask = baseEquipment.maintenanceTasks[1]!;
    // 20 days elapsed from 2026-10-01 to 2026-10-21 (interval: 30 days)
    const evaluated = evaluateMaintenanceTask(timeTask, mockSessions, "2026-10-21");

    expect(evaluated.currentUsageSinceReset).toBe(20);
    expect(evaluated.remaining).toBe(10);
    expect(evaluated.status).toBe("ok");

    // 32 days elapsed -> overdue
    const evaluatedOverdue = evaluateMaintenanceTask(timeTask, mockSessions, "2026-11-02");
    expect(evaluatedOverdue.currentUsageSinceReset).toBe(32);
    expect(evaluatedOverdue.remaining).toBe(-2);
    expect(evaluatedOverdue.status).toBe("overdue");
  });

  it("5. Correctly detects due maintenance in equipment list", () => {
    const freshList = computeEquipmentState([baseEquipment], mockSessions, "2026-10-15");
    expect(hasDueMaintenance(freshList).hasDue).toBe(false);
    expect(hasOverdueMaintenance(freshList)).toBe(false);

    // List with overdue item
    const overdueList = computeEquipmentState([baseEquipment], mockSessions, "2026-11-15");
    const dueReport = hasDueMaintenance(overdueList);
    expect(dueReport.hasDue).toBe(true);
    expect(dueReport.overdueCount).toBeGreaterThanOrEqual(1);
    expect(hasOverdueMaintenance(overdueList)).toBe(true);
  });

  it("6. Dynamic recomputation remains robust when sessions are added, backdated or deleted", () => {
    // State with 2 sessions: 70 km
    const stateA = computeEquipmentState([baseEquipment], mockSessions, "2026-10-15")[0]!;
    expect(stateA.totalKm).toBe(70);

    // Backdated session added between sess-1 and sess-2 (2026-10-07: 10 km)
    const backdatedSession: CompletedSessionDocument = {
      sessionId: "sess-backdated",
      athleteId: "ath-01",
      date: "2026-10-07",
      sport: "running",
      title: "Backdated run",
      startTime: "10:00",
      durationMinutes: 50,
      rpe: 5,
      targetIntensityRpe: 5,
      completed: true,
      source: "manual",
      confidence: 1,
      createdAt: "2026-10-16T08:00:00Z",
      updatedAt: "2026-10-16T08:00:00Z",
      updatedBy: "ath-01",
      equipmentIds: ["eq-shoes-1"],
      metrics: { distanceMeters: 10000 }
    };

    const stateB = computeEquipmentState(
      [baseEquipment],
      [...mockSessions, backdatedSession],
      "2026-10-15"
    )[0]!;
    expect(stateB.totalKm).toBe(80);

    // Delete sess-1 (5 km removed): total should be 50 + 15 + 10 = 75 km
    const stateC = computeEquipmentState(
      [baseEquipment],
      [mockSessions[1]!, backdatedSession],
      "2026-10-15"
    )[0]!;
    expect(stateC.totalKm).toBe(75);
  });
});
