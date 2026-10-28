/**
 * Training Block Configuration & Constants
 *
 * Central configuration for rounds, rest durations, block types,
 * and estimated time calculations.
 */

export const DEFAULT_SECONDS_PER_REP = 4; // Configurable default seconds-per-rep for strength rows

export const QUICK_REST_DURATIONS: number[] = [30, 60, 90, 120, 180]; // In seconds: 0:30, 1:00, 1:30, 2:00, 3:00

export const LETTER_BLOCK_TYPES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export const STANDARD_BLOCK_TYPES = [
  { id: "warmup", nameHu: "Bemelegítés", nameEn: "Warmup" },
  { id: "A", nameHu: "A blokk", nameEn: "Block A" },
  { id: "B", nameHu: "B blokk", nameEn: "Block B" },
  { id: "C", nameHu: "C blokk", nameEn: "Block C" },
  { id: "D", nameHu: "D blokk", nameEn: "Block D" },
  { id: "E", nameHu: "E blokk", nameEn: "Block E" },
  { id: "F", nameHu: "F blokk", nameEn: "Block F" },
  { id: "cooldown", nameHu: "Levezetés", nameEn: "Cooldown" },
  { id: "other", nameHu: "Egyéb", nameEn: "Other" }
] as const;
