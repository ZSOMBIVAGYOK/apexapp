import { describe, it, expect } from "vitest";
import { SCORES_CONFIG } from "./config";
import {
  deriveAthleteK,
  loadToStrain,
  strainToLoad,
  calculateTargetStrainRange,
  calculateDailyStrain
} from "./strainScore";
import {
  calculateSleepNeed,
  calculateSleepScore,
  computeBedtimeRecommendation
} from "./sleepScore";
import { calculateRecoveryScore } from "./recoveryScore";
import { evaluateDailyRhythm } from "./dailyRhythm";
import { calculateWeeklyScoreSummary } from "./weeklySummary";
import { calculateDailyScores } from "./dailyScoresEngine";

describe("Scores Engine - Strain Calculations", () => {
  it("computes personal capacity coefficient k based on level and CTL", () => {
    // Level defaults without CTL
    expect(deriveAthleteK("hobby")).toBe(70);
    expect(deriveAthleteK("competitive_amateur")).toBe(100);
    expect(deriveAthleteK("national")).toBe(135);
    expect(deriveAthleteK("olympic")).toBe(185);

    // Adaptive k with CTL
    const adaptiveK = deriveAthleteK("competitive_amateur", 80);
    // baseK*0.4 + 80*1.6*0.6 = 40 + 76.8 = 117
    expect(adaptiveK).toBe(117);
  });

  it("maps daily load to 0-100 strain with diminishing returns curve", () => {
    const k = 100;
    // Zero load -> 0 strain
    expect(loadToStrain(0, k)).toBe(0);

    // Easy day: load ~25 -> strain ~22 (roughly 20-35)
    const easyStrain = loadToStrain(25, k);
    expect(easyStrain).toBeGreaterThanOrEqual(20);
    expect(easyStrain).toBeLessThanOrEqual(35);

    // Normal day: load ~55 -> strain ~42 (roughly 40-65)
    const normalStrain = loadToStrain(55, k);
    expect(normalStrain).toBeGreaterThanOrEqual(40);
    expect(normalStrain).toBeLessThanOrEqual(65);

    // Hard day: load ~150 -> strain ~78 (roughly 75-90)
    const hardStrain = loadToStrain(150, k);
    expect(hardStrain).toBeGreaterThanOrEqual(75);
    expect(hardStrain).toBeLessThanOrEqual(90);

    // Extreme day: load ~300 -> strain ~95, never reaches 100
    const extremeStrain = loadToStrain(300, k);
    expect(extremeStrain).toBeGreaterThan(90);
    expect(extremeStrain).toBeLessThan(100);

    // Round-trip inverter
    const restoredLoad = strainToLoad(normalStrain, k);
    expect(Math.abs(restoredLoad - 55)).toBeLessThanOrEqual(1);
  });

  it("sums multiple sessions in a day with progressive fill", () => {
    const sessions = [
      {
        sessionId: "s1",
        title: "Reggeli úszás",
        sport: "swimming",
        durationMinutes: 45,
        load: 40
      },
      {
        sessionId: "s2",
        title: "Délutáni futás",
        sport: "running",
        durationMinutes: 60,
        load: 65
      }
    ];

    const result = calculateDailyStrain({
      sessions,
      athleteLevel: "competitive_amateur"
    });

    expect(result.dailyLoadTotal).toBe(105);
    expect(result.contributingSessions).toHaveLength(2);
    expect(result.score).toBeGreaterThan(60);
    expect(result.score).toBeLessThan(75);
  });
});

describe("Scores Engine - Target Strain Range", () => {
  it("prioritizes planned workout(s) as the primary target source ('plan')", () => {
    const plannedWorkouts = [
      {
        id: "p1",
        title: "Intervallum futás",
        plannedLoad: 70
      }
    ];

    const target = calculateTargetStrainRange({
      plannedWorkouts,
      recoveryBand: "green",
      kCapacity: 100,
      currentStrain: 20
    });

    expect(target.source).toBe("plan");
    expect(target.sourceLabelHu).toBe("Terv");
    // Planned load 70 -> expected strain ~50.3, halfWindow 8 -> ~42 to 58
    expect(target.low).toBeGreaterThanOrEqual(40);
    expect(target.high).toBeLessThanOrEqual(60);
    expect(target.status).toBe("below");
    expect(target.roomRemaining).toBeGreaterThan(0);
  });

  it("falls back to recovery-based recommendation when no planned workouts exist", () => {
    // Green recovery -> productive range [55, 80]
    const greenTarget = calculateTargetStrainRange({
      plannedWorkouts: [],
      recoveryBand: "green",
      kCapacity: 100,
      currentStrain: 60
    });
    expect(greenTarget.source).toBe("recovery");
    expect(greenTarget.low).toBe(55);
    expect(greenTarget.high).toBe(80);
    expect(greenTarget.status).toBe("in_range");
    expect(greenTarget.roomRemaining).toBe(0);

    // Amber recovery -> moderate range [35, 60]
    const amberTarget = calculateTargetStrainRange({
      plannedWorkouts: [],
      recoveryBand: "amber",
      kCapacity: 100,
      currentStrain: 20
    });
    expect(amberTarget.low).toBe(35);
    expect(amberTarget.high).toBe(60);

    // Red recovery -> recovery range [10, 35]
    const redTarget = calculateTargetStrainRange({
      plannedWorkouts: [],
      recoveryBand: "red",
      kCapacity: 100,
      currentStrain: 15
    });
    expect(redTarget.low).toBe(10);
    expect(redTarget.high).toBe(35);
    expect(redTarget.isRestDayTarget).toBe(true);
  });

  it("adjusts target range for season phase (taper/build) and high ACWR", () => {
    // Taper phase lowers range
    const taperTarget = calculateTargetStrainRange({
      plannedWorkouts: [],
      recoveryBand: "green",
      seasonPhase: "taper",
      kCapacity: 100,
      currentStrain: 30
    });
    expect(taperTarget.high).toBeLessThan(80);

    // Danger ACWR (>1.5) shifts range to recovery zone
    const spikeTarget = calculateTargetStrainRange({
      plannedWorkouts: [],
      recoveryBand: "green",
      acwr: 1.6,
      kCapacity: 100,
      currentStrain: 30
    });
    expect(spikeTarget.high).toBeLessThanOrEqual(35);
  });

  it("issues a gentle non-blocking hint when planned strain exceeds recovery recommendation", () => {
    const plannedWorkouts = [
      {
        id: "p1",
        title: "Kemény résztáv",
        plannedLoad: 160 // very heavy plan
      }
    ];

    const target = calculateTargetStrainRange({
      plannedWorkouts,
      recoveryBand: "amber", // amber rec is [35, 60]
      kCapacity: 100,
      currentStrain: 10
    });

    expect(target.softWarningHu).toContain("A mai terv erősebb");
  });
});

describe("Scores Engine - Sleep Need & Performance", () => {
  it("calculates sleep need including yesterday strain, debt repayment, and nap deductions", () => {
    const breakdown = calculateSleepNeed({
      baselineMinutes: 480, // 8h
      yesterdayStrain: 60, // +36 min strain extra
      sevenDayHistory: [
        { date: "2026-10-27", durationMinutes: 420, needMinutes: 480 }, // 60 min debt
        { date: "2026-10-26", durationMinutes: 400, needMinutes: 480 } // 80 min debt (total 140 min debt)
      ],
      napsMinutesToday: 20
    });

    // Baseline: 480
    // Strain extra: 60 * 0.6 = 36
    // Debt repayment: 25% of 140 = 35 (capped at 45)
    // Nap deduction: -20
    // Total need = 480 + 36 + 35 - 20 = 531 mins (~8.85 h)
    expect(breakdown.baselineMinutes).toBe(480);
    expect(breakdown.strainExtraMinutes).toBe(36);
    expect(breakdown.debtRepaymentMinutes).toBe(35);
    expect(breakdown.napDeductionMinutes).toBe(20);
    expect(breakdown.totalNeedMinutes).toBe(531);
  });

  it("calculates evening bedtime recommendation based on wake time and latency", () => {
    const rec = computeBedtimeRecommendation("07:00", 495, 15);
    // 07:00 (420 min) - 495 min - 15 min = 420 - 510 = -90 min -> 22:30
    expect(rec.recommendedBedtime).toBe("22:30");
    expect(rec.textHu).toContain("Ajánlott lefekvés: 22:30");
  });

  it("computes sleep score in device mode and manual mode with confidence parity", () => {
    // Device mode with stages
    const deviceResult = calculateSleepScore({
      lastNight: {
        durationMinutes: 460,
        deepMinutes: 90,
        remMinutes: 95,
        awakeMinutes: 30,
        isManual: false
      },
      userBaselineMinutes: 480
    });
    expect(deviceResult.score).toBeGreaterThanOrEqual(75);
    expect(deviceResult.confidence).toBe(SCORES_CONFIG.sleep.confidence.device);
    expect(deviceResult.isManual).toBe(false);

    // Manual mode with quality rating
    const manualResult = calculateSleepScore({
      lastNight: {
        durationMinutes: 450,
        qualityScore: 4,
        isManual: true
      },
      userBaselineMinutes: 480
    });
    expect(manualResult.score).toBeGreaterThanOrEqual(70);
    expect(manualResult.confidence).toBe(SCORES_CONFIG.sleep.confidence.manual);
    expect(manualResult.isManual).toBe(true);
  });
});

describe("Scores Engine - Recovery & Daily Rhythm State Machine", () => {
  it("evaluates recovery score through readiness engine wrapper", () => {
    const rec = calculateRecoveryScore({
      date: "2026-10-29",
      sleep: { durationMinutes: 480, qualityScore: 4 },
      wellness: {
        fatigue: 2,
        soreness: 1,
        stress: 2,
        mood: 4,
        motivation: 5
      }
    });

    expect(rec.score).toBeGreaterThanOrEqual(67);
    expect(rec.band).toBe("green");
    expect(rec.statusLabelHu).toBe("Kipihent");
  });

  it("transitions daily rhythm from morning pending to post-training and evening winddown", () => {
    const targetRange = calculateTargetStrainRange({
      plannedWorkouts: [{ id: "p", title: "Run", plannedLoad: 60 }],
      kCapacity: 100,
      currentStrain: 0
    });

    // 1. Morning before check-in -> pending
    const morningPending = evaluateDailyRhythm({
      hasCheckedIn: false,
      currentStrain: 0,
      targetRange,
      completedSessionsCount: 0,
      plannedWorkoutsCount: 1,
      currentHour: 8
    });
    expect(morningPending.stage).toBe("morning_pending");
    expect(morningPending.isCheckInPending).toBe(true);

    // 2. Daytime after check-in -> daytime_training
    const daytime = evaluateDailyRhythm({
      hasCheckedIn: true,
      currentStrain: 20,
      targetRange,
      completedSessionsCount: 0,
      plannedWorkoutsCount: 1,
      currentHour: 14
    });
    expect(daytime.stage).toBe("daytime_training");

    // 3. Post training -> in target range
    const postTraining = evaluateDailyRhythm({
      hasCheckedIn: true,
      currentStrain: targetRange.low + 5,
      targetRange: { ...targetRange, status: "in_range", roomRemaining: 0 },
      completedSessionsCount: 1,
      plannedWorkoutsCount: 1,
      currentHour: 17
    });
    expect(postTraining.stage).toBe("post_training");
    expect(postTraining.showRecoveryPrompt).toBe(true);

    // 4. Evening winddown
    const evening = evaluateDailyRhythm({
      hasCheckedIn: true,
      currentStrain: 50,
      targetRange,
      completedSessionsCount: 1,
      plannedWorkoutsCount: 1,
      currentHour: 21
    });
    expect(evening.stage).toBe("evening_winddown");
    expect(evening.showBedtimeCard).toBe(true);
  });

  it("treats rest days within target range as successful without broken streaks", () => {
    const restTarget = calculateTargetStrainRange({
      plannedWorkouts: [],
      recoveryBand: "red",
      kCapacity: 100,
      currentStrain: 12
    });

    const rhythm = evaluateDailyRhythm({
      hasCheckedIn: true,
      recoveryBand: "red",
      currentStrain: 12,
      targetRange: restTarget,
      completedSessionsCount: 0,
      plannedWorkoutsCount: 0,
      currentHour: 16
    });

    expect(rhythm.isRestDaySuccess).toBe(true);
    expect(rhythm.focusSentenceHu).toContain("Sikeres regenerációs nap");
  });
});

describe("Scores Engine - Unified Record & Weekly Summary", () => {
  it("calculates unified daily scores record without fabricating missing values", () => {
    const record = calculateDailyScores({
      athleteId: "test-001",
      date: "2026-10-29",
      dailyDoc: null, // No check-in
      sessions: []
    });

    expect(record.hasCheckIn).toBe(false);
    expect(record.recoveryScore).toBe(0);
    expect(record.strainScore).toBe(0);
    expect(record.sleepScore).toBe(0);
    expect(record.rhythm.isCheckInPending).toBe(true);
  });

  it("computes 7-day weekly score summary with insight sentence", () => {
    const days = [
      { date: "2026-10-23", dayNameHu: "Péntek", recoveryScore: 78, strainScore: 50, sleepScore: 82, sleepDurationMinutes: 480 },
      { date: "2026-10-24", dayNameHu: "Szombat", recoveryScore: 85, strainScore: 75, sleepScore: 85, sleepDurationMinutes: 510 },
      { date: "2026-10-25", dayNameHu: "Vasárnap", recoveryScore: 60, strainScore: 20, sleepScore: 76, sleepDurationMinutes: 460 },
      { date: "2026-10-26", dayNameHu: "Hétfő", recoveryScore: 72, strainScore: 45, sleepScore: 80, sleepDurationMinutes: 470 },
      { date: "2026-10-27", dayNameHu: "Kedd", recoveryScore: 80, strainScore: 60, sleepScore: 84, sleepDurationMinutes: 490 },
      { date: "2026-10-28", dayNameHu: "Szerda", recoveryScore: 74, strainScore: 55, sleepScore: 78, sleepDurationMinutes: 465 },
      { date: "2026-10-29", dayNameHu: "Csütörtök", recoveryScore: 82, strainScore: 58, sleepScore: 86, sleepDurationMinutes: 500 }
    ];

    const weekly = calculateWeeklyScoreSummary(days);
    expect(weekly.avgRecoveryScore).toBeGreaterThanOrEqual(70);
    expect(weekly.avgRecoveryBand).toBe("green");
    expect(weekly.totalStrain).toBeGreaterThan(300);
    expect(weekly.daysInTargetRange).toBeGreaterThanOrEqual(5);
    expect(weekly.bestDay?.dayNameHu).toBe("Szombat");
    expect(weekly.insightSentenceHu).toContain("Kiváló heti egyensúly");
  });
});
