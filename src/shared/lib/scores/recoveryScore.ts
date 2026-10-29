/**
 * RECOVERY (REGENERÁCIÓ) SCORING ENGINE
 *
 * Wraps the existing readiness engine, exposing normalized 0-100 score,
 * semantic recovery band (green / amber / red), confidence percentage,
 * and top 3 physiological drivers.
 */

import {
  calculateReadiness,
  ReadinessInput,
  ReadinessResult,
  ReadinessBand
} from "@shared/lib/readiness";
import { SCORES_CONFIG } from "./config";

export interface AthleteRecoveryScore {
  score: number; // 0-100
  band: ReadinessBand;
  confidence: number; // 0-100%
  statusLabelHu: "Kipihent" | "Közepes" | "Fáradt" | "Függőben";
  statusLabelEn: "Recovered" | "Moderate" | "Fatigued" | "Pending";
  pathUsed: "biometric" | "manual" | "hybrid";
  topDrivers: Array<{
    id: string;
    labelHu: string;
    labelEn: string;
    impact: "positive" | "negative";
    category: string;
  }>;
  softMessageHu: string;
  softMessageEn: string;
  isCalibrating: boolean;
  rawReadinessResult: ReadinessResult;
}

export function bandToRecoveryLabel(
  band: ReadinessBand
): { hu: "Kipihent" | "Közepes" | "Fáradt"; en: "Recovered" | "Moderate" | "Fatigued" } {
  if (band === "green") {
    return { hu: "Kipihent", en: "Recovered" };
  }
  if (band === "amber") {
    return { hu: "Közepes", en: "Moderate" };
  }
  return { hu: "Fáradt", en: "Fatigued" };
}

/**
 * Calculates Recovery score from athlete daily input.
 */
export function calculateRecoveryScore(
  input: ReadinessInput,
  config = SCORES_CONFIG
): AthleteRecoveryScore {
  const readiness = calculateReadiness(input);
  const band = readiness.score >= config.recovery.greenMin
    ? "green"
    : readiness.score >= config.recovery.amberMin
    ? "amber"
    : "red";
  const labels = bandToRecoveryLabel(band);

  return {
    score: readiness.score,
    band,
    confidence: readiness.confidence,
    statusLabelHu: labels.hu,
    statusLabelEn: labels.en,
    pathUsed: readiness.pathUsed,
    topDrivers: readiness.drivers.slice(0, 3).map((d) => ({
      id: d.id,
      labelHu: d.labelHu,
      labelEn: d.labelEn,
      impact: d.impact,
      category: d.category
    })),
    softMessageHu: readiness.softMessageHu,
    softMessageEn: readiness.softMessageEn,
    isCalibrating: readiness.isCalibrating,
    rawReadinessResult: readiness
  };
}
