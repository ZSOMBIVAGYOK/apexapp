import { describe, it, expect } from "vitest";
import {
  formatDurationMmSs,
  parseDurationMmSs,
  suggestNextBlockType,
  getBlockHeaderSummary,
  calculateRowVolume,
  calculateBlockVolume,
  calculateSessionTonnage,
  calculateEstimatedDurationSeconds,
  calculateEstimatedDurationMinutes,
  calculateBlockTimeSeriesStats,
  deriveBlocksFromLaps,
  deriveBlocksFromStrengthSets,
  cloneBlocks,
  convertPlannedWorkoutToCompletedBlocks
} from "./blockUtils";
import { TrainingBlock, TrainingBlockRow } from "@shared/types/training";
import { NormalizedLap, NormalizedStrengthSet } from "@shared/types/devices";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";

describe("Training Block Subsystem Unit Tests", () => {
  describe("1. Duration Formatting and Parsing", () => {
    it("formats durations in seconds to mm:ss format", () => {
      expect(formatDurationMmSs(0)).toBe("");
      expect(formatDurationMmSs(30)).toBe("0:30");
      expect(formatDurationMmSs(60)).toBe("1:00");
      expect(formatDurationMmSs(90)).toBe("1:30");
      expect(formatDurationMmSs(125)).toBe("2:05");
      expect(formatDurationMmSs(3600)).toBe("1:00:00");
      expect(formatDurationMmSs(3725)).toBe("1:02:05");
    });

    it("parses mm:ss, m:ss, and integer strings to seconds", () => {
      expect(parseDurationMmSs("0:30")).toBe(30);
      expect(parseDurationMmSs("1:00")).toBe(60);
      expect(parseDurationMmSs("1:30")).toBe(90);
      expect(parseDurationMmSs("2:00")).toBe(120);
      expect(parseDurationMmSs("90")).toBe(90);
      expect(parseDurationMmSs("1:00:00")).toBe(3600);
      expect(parseDurationMmSs("")).toBeUndefined();
      expect(parseDurationMmSs(undefined)).toBeUndefined();
    });
  });

  describe("2. Block Ordering & Lettering Suggestions", () => {
    it("suggests warmup first when no blocks exist", () => {
      expect(suggestNextBlockType([])).toBe("warmup");
    });

    it("suggests 'A' when only warmup exists", () => {
      const blocks: TrainingBlock[] = [
        { id: "1", type: "warmup", order: 1, rounds: 1, rows: [] }
      ];
      expect(suggestNextBlockType(blocks)).toBe("A");
    });

    it("suggests sequential letters A -> B -> C", () => {
      const blocks1: TrainingBlock[] = [
        { id: "1", type: "warmup", order: 1, rounds: 1, rows: [] },
        { id: "2", type: "A", order: 2, rounds: 3, rows: [] }
      ];
      expect(suggestNextBlockType(blocks1)).toBe("B");

      const blocks2: TrainingBlock[] = [
        ...blocks1,
        { id: "3", type: "B", order: 3, rounds: 3, rows: [] }
      ];
      expect(suggestNextBlockType(blocks2)).toBe("C");
    });

    it("suggests cooldown when all letter blocks are used", () => {
      const allLetters: TrainingBlock[] = [
        { id: "w", type: "warmup", order: 1, rounds: 1, rows: [] },
        { id: "a", type: "A", order: 2, rounds: 1, rows: [] },
        { id: "b", type: "B", order: 3, rounds: 1, rows: [] },
        { id: "c", type: "C", order: 4, rounds: 1, rows: [] },
        { id: "d", type: "D", order: 5, rounds: 1, rows: [] },
        { id: "e", type: "E", order: 6, rounds: 1, rows: [] },
        { id: "f", type: "F", order: 7, rounds: 1, rows: [] },
        { id: "g", type: "G", order: 8, rounds: 1, rows: [] },
        { id: "h", type: "H", order: 9, rounds: 1, rows: [] }
      ];
      expect(suggestNextBlockType(allLetters)).toBe("cooldown");
    });
  });

  describe("3. Block Header Summaries", () => {
    it("formats a one-line summary with rounds and rests", () => {
      const block: TrainingBlock = {
        id: "b1",
        type: "A",
        order: 1,
        rounds: 3,
        restBetweenRoundsSeconds: 60,
        restAfterBlockSeconds: 120,
        rows: []
      };
      const summary = getBlockHeaderSummary(block, true);
      expect(summary).toBe("A blokk • 3 kör • 1:00 pihenő körök között • 2:00 pihenő utána");
    });

    it("omits empty rests from summary", () => {
      const block: TrainingBlock = {
        id: "b1",
        type: "warmup",
        order: 1,
        rounds: 1,
        rows: []
      };
      const summary = getBlockHeaderSummary(block, true);
      expect(summary).toBe("Bemelegítés • 1 kör");
    });
  });

  describe("4. Rounds and Volume Calculations (no double counting)", () => {
    it("computes row volume: rounds x sets x reps x load", () => {
      const row: TrainingBlockRow = {
        id: "r1",
        type: "exercise",
        exerciseName: "Guggolás",
        sets: 1,
        reps: 5,
        loadKg: 100
      };
      // 3 rounds, 1 set, 5 reps @ 100kg = 1500 kg
      const result = calculateRowVolume(row, 3);
      expect(result.tonnageKg).toBe(1500);
      expect(result.totalReps).toBe(15);
    });

    it("respects sets default of 1 if sets is omitted or 0", () => {
      const row: TrainingBlockRow = {
        id: "r1",
        type: "exercise",
        reps: 10,
        loadKg: 50
      };
      const result = calculateRowVolume(row, 2);
      // 2 rounds x 1 set x 10 reps x 50kg = 1000 kg
      expect(result.tonnageKg).toBe(1000);
      expect(result.totalReps).toBe(20);
    });

    it("computes row volume with per-round overrides (Körönkénti eltérés)", () => {
      const row: TrainingBlockRow = {
        id: "r1",
        type: "exercise",
        exerciseName: "Fekvenyomás",
        sets: 1,
        reps: 8,
        loadKg: 60,
        roundOverrides: [
          { roundNumber: 1, reps: 8, loadKg: 60 },
          { roundNumber: 2, reps: 8, loadKg: 65 },
          { roundNumber: 3, reps: 6, loadKg: 70 }
        ]
      };
      // Round 1: 8 * 60 = 480
      // Round 2: 8 * 65 = 520
      // Round 3: 6 * 70 = 420
      // Total = 1420 kg, total reps = 22
      const result = calculateRowVolume(row, 3);
      expect(result.tonnageKg).toBe(1420);
      expect(result.totalReps).toBe(22);
    });

    it("computes block volume and total session tonnage across multiple blocks", () => {
      const blockA: TrainingBlock = {
        id: "ba",
        type: "A",
        order: 1,
        rounds: 3,
        rows: [
          { id: "r1", type: "exercise", reps: 5, loadKg: 80 } // 3 * 5 * 80 = 1200
        ]
      };
      const blockB: TrainingBlock = {
        id: "bb",
        type: "B",
        order: 2,
        rounds: 2,
        rows: [
          { id: "r2", type: "exercise", reps: 10, loadKg: 20 } // 2 * 10 * 20 = 400
        ]
      };

      const volA = calculateBlockVolume(blockA);
      expect(volA.tonnageKg).toBe(1200);

      const sessionTonnage = calculateSessionTonnage([blockA, blockB]);
      expect(sessionTonnage.totalTonnageKg).toBe(1600);
      expect(sessionTonnage.totalReps).toBe(35);
    });
  });

  describe("5. Estimated Total Duration Calculation", () => {
    it("computes total duration including rounds, rep work times, and rest periods", () => {
      const blocks: TrainingBlock[] = [
        {
          id: "b1",
          type: "warmup",
          order: 1,
          rounds: 1,
          rows: [
            { id: "w1", type: "endurance", durationSeconds: 600 } // 10 min = 600s
          ],
          restAfterBlockSeconds: 120 // 2 min = 120s
        },
        {
          id: "b2",
          type: "A",
          order: 2,
          rounds: 3,
          restBetweenRoundsSeconds: 60, // 2 pauses of 60s = 120s
          restAfterBlockSeconds: 180, // 3 min = 180s
          rows: [
            // 5 reps @ 4s/rep = 20s work per round. 3 rounds = 60s
            { id: "a1", type: "exercise", reps: 5 }
          ]
        }
      ];

      // Block 1: 600s work + 120s after = 720s
      // Block 2:
      //   Round 1: 20s
      //   Rest between: 60s
      //   Round 2: 20s
      //   Rest between: 60s
      //   Round 3: 20s
      //   Rest after: 180s
      //   Total Block 2 = 20 + 60 + 20 + 60 + 20 + 180 = 360s
      // Total = 720 + 360 = 1080s (18 minutes)
      const sec = calculateEstimatedDurationSeconds(blocks, 4);
      expect(sec).toBe(1080);
      expect(calculateEstimatedDurationMinutes(blocks, 4)).toBe(18);
    });
  });

  describe("6. Lap to Block Conversion (from File)", () => {
    it("converts 3 laps into warmup, A, and cooldown blocks with timeRanges", () => {
      const laps: NormalizedLap[] = [
        { index: 0, startTime: "2026-10-28T10:00:00Z", durationSeconds: 600, distanceMeters: 1500, avgHeartRate: 135 },
        { index: 1, startTime: "2026-10-28T10:10:00Z", durationSeconds: 1200, distanceMeters: 4000, avgHeartRate: 165 },
        { index: 2, startTime: "2026-10-28T10:30:00Z", durationSeconds: 300, distanceMeters: 800, avgHeartRate: 125 }
      ];

      const blocks = deriveBlocksFromLaps(laps);
      expect(blocks).toHaveLength(3);

      expect(blocks[0]!.type).toBe("warmup");
      expect(blocks[0]!.timeRange?.startOffsetSeconds).toBe(0);
      expect(blocks[0]!.timeRange?.endOffsetSeconds).toBe(600);

      expect(blocks[1]!.type).toBe("A");
      expect(blocks[1]!.timeRange?.startOffsetSeconds).toBe(600);
      expect(blocks[1]!.timeRange?.endOffsetSeconds).toBe(1800);

      expect(blocks[2]!.type).toBe("cooldown");
      expect(blocks[2]!.timeRange?.startOffsetSeconds).toBe(1800);
      expect(blocks[2]!.timeRange?.endOffsetSeconds).toBe(2100);
    });
  });

  describe("7. Strength Sets and Rest Derivation (FIT Msg 225)", () => {
    it("groups consecutive active sets of the same exercise and derives rest durations", () => {
      const sets: NormalizedStrengthSet[] = [
        { index: 0, type: "active", exerciseName: "Guggolás", repetitions: 8, weightKg: 80, durationSeconds: 35 },
        { index: 1, type: "rest", durationSeconds: 90 },
        { index: 2, type: "active", exerciseName: "Guggolás", repetitions: 8, weightKg: 80, durationSeconds: 35 },
        { index: 3, type: "rest", durationSeconds: 150 }, // Rest before next exercise
        { index: 4, type: "active", exerciseName: "Fekvenyomás", repetitions: 10, weightKg: 60, durationSeconds: 30 }
      ];

      const blocks = deriveBlocksFromStrengthSets(sets);
      expect(blocks).toHaveLength(2);

      // Block A: Guggolás (2 rounds)
      expect(blocks[0]!.type).toBe("A");
      expect(blocks[0]!.rounds).toBe(2);
      expect(blocks[0]!.rows![0]!.exerciseName).toBe("Guggolás");
      expect(blocks[0]!.restBetweenRoundsSeconds).toBe(90);
      expect(blocks[0]!.restAfterBlockSeconds).toBe(150);

      // Block B: Fekvenyomás (1 round)
      expect(blocks[1]!.type).toBe("B");
      expect(blocks[1]!.rounds).toBe(1);
      expect(blocks[1]!.rows![0]!.exerciseName).toBe("Fekvenyomás");
    });
  });

  describe("8. Per-Block Time Series Statistics", () => {
    it("computes HR, power, distance and pace within a block timeRange", () => {
      const points: SessionTimeSeriesPoint[] = [
        { timeOffsetSeconds: 0, heartRate: 120, distanceMeters: 0 },
        { timeOffsetSeconds: 300, heartRate: 140, distanceMeters: 800 },
        { timeOffsetSeconds: 600, heartRate: 160, distanceMeters: 1600 },
        { timeOffsetSeconds: 900, heartRate: 170, distanceMeters: 2500 },
        { timeOffsetSeconds: 1200, heartRate: 150, distanceMeters: 3300 }
      ];

      const block: TrainingBlock = {
        id: "b1",
        type: "A",
        order: 1,
        rounds: 1,
        timeRange: {
          startOffsetSeconds: 300,
          endOffsetSeconds: 900
        },
        rows: []
      };

      const stats = calculateBlockTimeSeriesStats(block, points, 190);
      expect(stats).toBeDefined();
      expect(stats!.durationSeconds).toBe(600);
      // HR points inside [300, 900]: 140, 160, 170 -> avg = 157, max = 170
      expect(stats!.avgHeartRate).toBe(157);
      expect(stats!.maxHeartRate).toBe(170);
      // Distance inside: 2500 - 800 = 1700m
      expect(stats!.distanceMeters).toBe(1700);
    });
  });

  describe("9. Cloning and Planned-to-Completed Conversion", () => {
    it("clones blocks with new IDs preserving rounds and rests", () => {
      const original: TrainingBlock[] = [
        {
          id: "orig-1",
          type: "A",
          order: 1,
          rounds: 3,
          restBetweenRoundsSeconds: 60,
          restAfterBlockSeconds: 120,
          rows: [
            { id: "r1", type: "exercise", reps: 8, loadKg: 50 }
          ]
        }
      ];

      const cloned = cloneBlocks(original);
      expect(cloned[0]!.id).not.toBe(original[0]!.id);
      expect(cloned[0]!.rows![0]!.id).not.toBe(original[0]!.rows![0]!.id);
      expect(cloned[0]!.rounds).toBe(3);
      expect(cloned[0]!.restBetweenRoundsSeconds).toBe(60);
      expect(cloned[0]!.restAfterBlockSeconds).toBe(120);
    });

    it("converts planned blocks to completed blocks with completed flags", () => {
      const planned: TrainingBlock[] = [
        {
          id: "plan-1",
          type: "A",
          order: 1,
          rounds: 3,
          rows: [{ id: "pr1", type: "exercise", reps: 10, loadKg: 40 }]
        }
      ];

      const completed = convertPlannedWorkoutToCompletedBlocks(planned);
      expect(completed[0]!.completedRounds).toBe(3);
      expect(completed[0]!.rows![0]!.completed).toBe(true);
    });
  });
});
