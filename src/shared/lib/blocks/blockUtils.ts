/**
 * Training Block Utility Functions
 *
 * Handles formatting, suggestions, volume / tonnage math,
 * estimated duration calculation, and file lap/set derivation.
 */

import {
  TrainingBlock,
  TrainingBlockRow,
  TrainingBlockType,
  TrainingBlockStats,
  RoundOverride
} from "@shared/types/training";
import { NormalizedLap, NormalizedStrengthSet } from "@shared/types/devices";
import { SessionTimeSeriesPoint } from "@shared/types/dataModel";
import {
  DEFAULT_SECONDS_PER_REP,
  LETTER_BLOCK_TYPES
} from "./blockConfig";

/**
 * Format duration in seconds to "mm:ss" or "h:mm:ss" string.
 */
export function formatDurationMmSs(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
    return "";
  }
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse a duration string like "1:00", "0:30", "1:30:00", "90" into seconds.
 */
export function parseDurationMmSs(str?: string): number | undefined {
  if (!str) return undefined;
  const trimmed = str.trim();
  if (!trimmed) return undefined;

  // Single integer number in seconds (e.g. "90" or "60")
  if (/^\d+$/.test(trimmed)) {
    const val = parseInt(trimmed, 10);
    return val > 0 ? val : undefined;
  }

  // Format "mm:ss" or "m:ss"
  const parts = trimmed.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
    const total = parts[0]! * 60 + parts[1]!;
    return total > 0 ? total : undefined;
  }

  // Format "hh:mm:ss" or "h:mm:ss"
  if (parts.length === 3 && !isNaN(parts[0]!) && !isNaN(parts[1]!) && !isNaN(parts[2]!)) {
    const total = parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    return total > 0 ? total : undefined;
  }

  return undefined;
}

/**
 * Suggest next block type in the sequence:
 * 1. Warmup
 * 2. Next unused letter (A, B, C...)
 * 3. Cooldown
 * 4. Other
 */
export function suggestNextBlockType(existingBlocks: TrainingBlock[] = []): TrainingBlockType {
  if (!existingBlocks || existingBlocks.length === 0) {
    return "warmup";
  }

  const hasWarmup = existingBlocks.some((b) => b.type === "warmup");
  if (!hasWarmup) {
    return "warmup";
  }

  // Find next letter
  for (const letter of LETTER_BLOCK_TYPES) {
    if (!existingBlocks.some((b) => b.type === letter)) {
      return letter;
    }
  }

  const hasCooldown = existingBlocks.some((b) => b.type === "cooldown");
  if (!hasCooldown) {
    return "cooldown";
  }

  return "other";
}

/**
 * Return human-readable title for a block type.
 */
export function getBlockTitle(block: TrainingBlock, isHu = true): string {
  if (block.type === "warmup") {
    return isHu ? "Bemelegítés" : "Warmup";
  }
  if (block.type === "cooldown") {
    return isHu ? "Levezetés" : "Cooldown";
  }
  if (block.type === "other") {
    return block.customTypeName?.trim() || (isHu ? "Egyéb blokk" : "Other Block");
  }
  if (LETTER_BLOCK_TYPES.includes(block.type as any)) {
    return isHu ? `${block.type} blokk` : `Block ${block.type}`;
  }
  return block.customTypeName || block.name || block.type;
}

/**
 * Generate one-line summary for block header:
 * e.g. "A blokk - 3 kör - 1:00 pihenő körök között - 2:00 pihenő utána"
 */
export function getBlockHeaderSummary(block: TrainingBlock, isHu = true): string {
  const title = getBlockTitle(block, isHu);
  const rounds = block.rounds && block.rounds > 0 ? block.rounds : 1;
  const parts: string[] = [title];

  // Rounds
  parts.push(isHu ? `${rounds} kör` : `${rounds} round${rounds > 1 ? "s" : ""}`);

  // Rest between rounds
  if (block.restBetweenRoundsSeconds && block.restBetweenRoundsSeconds > 0) {
    const formatted = formatDurationMmSs(block.restBetweenRoundsSeconds);
    parts.push(isHu ? `${formatted} pihenő körök között` : `${formatted} rest between rounds`);
  }

  // Rest after block
  if (block.restAfterBlockSeconds && block.restAfterBlockSeconds > 0) {
    const formatted = formatDurationMmSs(block.restAfterBlockSeconds);
    parts.push(isHu ? `${formatted} pihenő utána` : `${formatted} rest after block`);
  }

  return parts.join(" • ");
}

/**
 * Calculate row volume and tonnage:
 * Total volume = rounds x sets (default 1) x reps x load (no double counting).
 * If roundOverrides are provided, sums exact per-round values.
 */
export function calculateRowVolume(
  row: TrainingBlockRow,
  rounds = 1
): { tonnageKg: number; totalReps: number } {
  if (row.type !== "exercise") {
    return { tonnageKg: 0, totalReps: 0 };
  }

  const effectiveRounds = Math.max(1, rounds);
  const sets = row.sets && row.sets > 0 ? row.sets : 1;

  if (row.roundOverrides && row.roundOverrides.length > 0) {
    let tonnage = 0;
    let repsCount = 0;

    for (let r = 1; r <= effectiveRounds; r++) {
      const override = row.roundOverrides.find((o) => o.roundNumber === r);
      const reps = override?.reps !== undefined ? override.reps : row.reps ?? 0;
      const load = override?.loadKg !== undefined ? override.loadKg : row.loadKg ?? 0;

      tonnage += reps * load * sets;
      repsCount += reps * sets;
    }

    return {
      tonnageKg: Math.round(tonnage * 10) / 10,
      totalReps: repsCount
    };
  }

  const reps = row.reps ?? 0;
  const load = row.loadKg ?? 0;
  const tonnage = effectiveRounds * sets * reps * load;
  const totalReps = effectiveRounds * sets * reps;

  return {
    tonnageKg: Math.round(tonnage * 10) / 10,
    totalReps
  };
}

/**
 * Calculate total volume / tonnage and reps for an entire block.
 */
export function calculateBlockVolume(
  block: TrainingBlock
): { tonnageKg: number; totalReps: number } {
  let tonnageKg = 0;
  let totalReps = 0;
  const rounds = block.rounds && block.rounds > 0 ? block.rounds : 1;
  const rows = block.rows || [];

  for (const row of rows) {
    const rowVol = calculateRowVolume(row, rounds);
    tonnageKg += rowVol.tonnageKg;
    totalReps += rowVol.totalReps;
  }

  return {
    tonnageKg: Math.round(tonnageKg * 10) / 10,
    totalReps
  };
}

/**
 * Calculate total session-wide tonnage and reps across all blocks.
 */
export function calculateSessionTonnage(
  blocks: TrainingBlock[] = []
): { totalTonnageKg: number; totalReps: number } {
  let totalTonnageKg = 0;
  let totalReps = 0;

  for (const b of blocks) {
    const vol = calculateBlockVolume(b);
    totalTonnageKg += vol.tonnageKg;
    totalReps += vol.totalReps;
  }

  return {
    totalTonnageKg: Math.round(totalTonnageKg * 10) / 10,
    totalReps
  };
}

/**
 * Compute estimated total duration in seconds for an array of blocks:
 * Takes into account all rounds, row work durations, reps x secondsPerRep,
 * rest between sets, rest between rounds, and rest after each block.
 */
export function calculateEstimatedDurationSeconds(
  blocks: TrainingBlock[] = [],
  secondsPerRep = DEFAULT_SECONDS_PER_REP
): number {
  let totalSeconds = 0;

  for (const block of blocks) {
    const rounds = block.rounds && block.rounds > 0 ? block.rounds : 1;
    const rows = block.rows || [];
    let blockWorkSeconds = 0;

    for (let r = 1; r <= rounds; r++) {
      let roundWork = 0;

      for (const row of rows) {
        const override = row.roundOverrides?.find((o) => o.roundNumber === r);

        if (row.type === "endurance") {
          const duration =
            override?.durationSeconds ??
            row.durationSeconds ??
            (row.distanceMeters ? Math.round(row.distanceMeters / 3) : 0);
          roundWork += duration;
        } else {
          // Exercise
          const sets = row.sets && row.sets > 0 ? row.sets : 1;
          const reps = override?.reps ?? row.reps ?? 0;
          const exerciseWork = reps * sets * secondsPerRep;
          const restBetweenSets = (row.restBetweenSetsSeconds || 0) * Math.max(0, sets - 1);
          roundWork += exerciseWork + restBetweenSets;
        }
      }

      blockWorkSeconds += roundWork;

      // Add rest between rounds (except after the final round)
      if (r < rounds && block.restBetweenRoundsSeconds) {
        blockWorkSeconds += block.restBetweenRoundsSeconds;
      }
    }

    // Add rest after the block
    const restAfter = block.restAfterBlockSeconds || 0;
    totalSeconds += blockWorkSeconds + restAfter;
  }

  return totalSeconds;
}

/**
 * Compute estimated duration in minutes (rounded to nearest minute, min 1).
 */
export function calculateEstimatedDurationMinutes(
  blocks: TrainingBlock[] = [],
  secondsPerRep = DEFAULT_SECONDS_PER_REP
): number {
  const seconds = calculateEstimatedDurationSeconds(blocks, secondsPerRep);
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * Calculate per-block stats from a time series and time range:
 * Avg HR, Max HR, Avg Power, Distance, Pace, Speed, Zone breakdown.
 */
export function calculateBlockTimeSeriesStats(
  block: TrainingBlock,
  points: SessionTimeSeriesPoint[] = [],
  maxHr = 190
): TrainingBlockStats | undefined {
  if (!block.timeRange || points.length === 0) {
    return undefined;
  }

  const { startOffsetSeconds, endOffsetSeconds } = block.timeRange;
  const filtered = points.filter(
    (p) => p.timeOffsetSeconds >= startOffsetSeconds && p.timeOffsetSeconds <= endOffsetSeconds
  );

  if (filtered.length === 0) {
    return undefined;
  }

  const durationSeconds = Math.max(1, endOffsetSeconds - startOffsetSeconds);
  let hrSum = 0;
  let hrCount = 0;
  let maxHeartRate = 0;
  let powerSum = 0;
  let powerCount = 0;
  const startDist = filtered[0]!.distanceMeters || 0;
  const endDist = filtered[filtered.length - 1]!.distanceMeters || 0;
  const distanceMeters = endDist > startDist ? Math.round(endDist - startDist) : undefined;

  const timeInZonesSeconds: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const p of filtered) {
    if (p.heartRate && p.heartRate > 30) {
      hrSum += p.heartRate;
      hrCount++;
      if (p.heartRate > maxHeartRate) maxHeartRate = p.heartRate;

      // Basic zone mapping (Z1: <60%, Z2: 60-70%, Z3: 70-80%, Z4: 80-90%, Z5: >90%)
      const pct = p.heartRate / maxHr;
      if (pct < 0.6) timeInZonesSeconds[1] = (timeInZonesSeconds[1] || 0) + 1;
      else if (pct < 0.7) timeInZonesSeconds[2] = (timeInZonesSeconds[2] || 0) + 1;
      else if (pct < 0.8) timeInZonesSeconds[3] = (timeInZonesSeconds[3] || 0) + 1;
      else if (pct < 0.9) timeInZonesSeconds[4] = (timeInZonesSeconds[4] || 0) + 1;
      else timeInZonesSeconds[5] = (timeInZonesSeconds[5] || 0) + 1;
    }
    if (p.powerWatts && p.powerWatts > 0) {
      powerSum += p.powerWatts;
      powerCount++;
    }
  }

  const avgHeartRate = hrCount > 0 ? Math.round(hrSum / hrCount) : undefined;
  const avgPowerWatts = powerCount > 0 ? Math.round(powerSum / powerCount) : undefined;

  let avgPace: string | undefined = undefined;
  let avgSpeedKmh: number | undefined = undefined;

  if (distanceMeters && distanceMeters > 50 && durationSeconds > 0) {
    const paceSec = Math.round(durationSeconds / (distanceMeters / 1000));
    avgPace = formatDurationMmSs(paceSec) + " /km";
    avgSpeedKmh = Math.round((distanceMeters / 1000 / (durationSeconds / 3600)) * 10) / 10;
  }

  const vol = calculateBlockVolume(block);

  return {
    durationSeconds,
    avgHeartRate,
    maxHeartRate: maxHeartRate > 0 ? maxHeartRate : undefined,
    avgPowerWatts,
    distanceMeters,
    avgPace,
    avgSpeedKmh,
    timeInZonesSeconds,
    tonnageKg: vol.tonnageKg,
    totalReps: vol.totalReps
  };
}

/**
 * Convert file laps (from FIT/TCX) into structured endurance blocks.
 */
export function deriveBlocksFromLaps(
  laps: NormalizedLap[] = []
): TrainingBlock[] {
  if (!laps || laps.length === 0) return [];

  let curOffset = 0;

  return laps.map((lap, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === laps.length - 1 && laps.length > 2;

    let type: TrainingBlockType;
    if (isFirst && laps.length > 1) {
      type = "warmup";
    } else if (isLast) {
      type = "cooldown";
    } else {
      const letterIdx = laps.length > 1 ? idx - 1 : idx;
      type = LETTER_BLOCK_TYPES[letterIdx] || "other";
    }

    const startOffsetSeconds = curOffset;
    const endOffsetSeconds = curOffset + lap.durationSeconds;
    curOffset = endOffsetSeconds;

    const row: TrainingBlockRow = {
      id: `lap-row-${idx}-${Date.now()}`,
      type: "endurance",
      durationSeconds: lap.durationSeconds,
      distanceMeters: lap.distanceMeters,
      target: lap.avgHeartRate ? `${lap.avgHeartRate} bpm` : undefined,
      result: lap.avgPaceSecondsPerKm ? `${formatDurationMmSs(lap.avgPaceSecondsPerKm)} /km` : undefined,
      completed: true
    };

    return {
      id: `lap-block-${idx}-${Date.now()}`,
      type,
      order: idx + 1,
      rounds: 1,
      completedRounds: 1,
      timeRange: {
        startOffsetSeconds,
        endOffsetSeconds
      },
      stats: {
        durationSeconds: lap.durationSeconds,
        distanceMeters: lap.distanceMeters,
        avgHeartRate: lap.avgHeartRate,
        maxHeartRate: lap.maxHeartRate,
        avgPowerWatts: lap.avgPowerWatts
      },
      rows: [row]
    };
  });
}

/**
 * Convert strength sets (FIT Message 225) into grouped exercise blocks with derived rest times.
 */
export function deriveBlocksFromStrengthSets(
  sets: NormalizedStrengthSet[] = []
): TrainingBlock[] {
  if (!sets || sets.length === 0) return [];

  const blocks: TrainingBlock[] = [];
  const activeSets = sets.filter((s) => s.type === "active");

  if (activeSets.length === 0) return [];

  // Group active sets by exercise name / category
  const exerciseGroups: Array<{
    name: string;
    sets: NormalizedStrengthSet[];
    restAfterLastSetSeconds?: number;
    avgRestBetweenSetsSeconds?: number;
  }> = [];

  let currentGroup: { name: string; sets: NormalizedStrengthSet[] } | null = null;

  for (let i = 0; i < sets.length; i++) {
    const item = sets[i]!;

    if (item.type === "active") {
      const exName = item.exerciseName || `Gyakorlat ${exerciseGroups.length + 1}`;
      if (!currentGroup || currentGroup.name !== exName) {
        currentGroup = { name: exName, sets: [item] };
        exerciseGroups.push(currentGroup);
      } else {
        currentGroup.sets.push(item);
      }
    } else if (item.type === "rest" && currentGroup) {
      // Rest set immediately following active sets
      const nextActive = sets.slice(i + 1).find((s) => s.type === "active");
      const isSwitchingExercise = nextActive && nextActive.exerciseName !== currentGroup.name;

      if (isSwitchingExercise) {
        const lastGroup = exerciseGroups[exerciseGroups.length - 1];
        if (lastGroup) {
          lastGroup.restAfterLastSetSeconds = item.durationSeconds;
        }
      } else {
        const lastGroup = exerciseGroups[exerciseGroups.length - 1];
        if (lastGroup && !lastGroup.avgRestBetweenSetsSeconds) {
          lastGroup.avgRestBetweenSetsSeconds = item.durationSeconds;
        }
      }
    }
  }

  // Create blocks from exercise groups
  exerciseGroups.forEach((group, idx) => {
    const blockLetter = LETTER_BLOCK_TYPES[idx] || "other";
    const numRounds = group.sets.length;
    const firstSet = group.sets[0]!;

    // Create per-round overrides if reps or weight differ
    const hasVariation = group.sets.some(
      (s) => s.repetitions !== firstSet.repetitions || s.weightKg !== firstSet.weightKg
    );

    const roundOverrides: RoundOverride[] = group.sets.map((s, rIdx) => ({
      roundNumber: rIdx + 1,
      reps: s.repetitions || 8,
      loadKg: s.weightKg || 0,
      completed: true
    }));

    const row: TrainingBlockRow = {
      id: `strength-row-${idx}-${Date.now()}`,
      type: "exercise",
      exerciseName: group.name,
      sets: 1, // each round is 1 set
      reps: firstSet.repetitions || 8,
      loadKg: firstSet.weightKg || 0,
      restBetweenSetsSeconds: group.avgRestBetweenSetsSeconds,
      completed: true,
      roundOverrides: hasVariation ? roundOverrides : undefined
    };

    const block: TrainingBlock = {
      id: `strength-block-${idx}-${Date.now()}`,
      type: blockLetter as TrainingBlockType,
      order: idx + 1,
      rounds: numRounds,
      completedRounds: numRounds,
      restBetweenRoundsSeconds: group.avgRestBetweenSetsSeconds || 60,
      restAfterBlockSeconds: group.restAfterLastSetSeconds || 120,
      rows: [row]
    };

    const vol = calculateBlockVolume(block);
    block.stats = {
      tonnageKg: vol.tonnageKg,
      totalReps: vol.totalReps
    };

    blocks.push(block);
  });

  return blocks;
}

/**
 * Deep clone an array of blocks with brand-new IDs (for duplication and copying).
 */
export function cloneBlocks(blocks: TrainingBlock[] = []): TrainingBlock[] {
  return blocks.map((b, bIdx) => ({
    ...b,
    id: `block-${Date.now()}-${bIdx}-${Math.random().toString(36).substring(2, 7)}`,
    rows: (b.rows || []).map((r, rIdx) => ({
      ...r,
      id: `row-${Date.now()}-${rIdx}-${Math.random().toString(36).substring(2, 7)}`,
      roundOverrides: r.roundOverrides ? r.roundOverrides.map((o) => ({ ...o })) : undefined
    }))
  }));
}

/**
 * Convert a planned workout's blocks into completed session blocks:
 * Keeps the structure, initializes completed status, and aligns planned vs actual.
 */
export function convertPlannedWorkoutToCompletedBlocks(
  plannedBlocks?: TrainingBlock[]
): TrainingBlock[] {
  if (!plannedBlocks || plannedBlocks.length === 0) return [];

  return cloneBlocks(plannedBlocks).map((b) => ({
    ...b,
    completedRounds: b.rounds, // Default completed to planned
    rows: (b.rows || []).map((r) => ({
      ...r,
      completed: true,
      roundOverrides: r.roundOverrides?.map((o) => ({
        ...o,
        completed: true
      }))
    }))
  }));
}
