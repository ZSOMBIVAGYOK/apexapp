/**
 * PURE READINESS ENGINE
 *
 * Implements athlete readiness scoring, dual and hybrid calculation paths,
 * confidence evaluation, automated top-driver diagnostics, and cold-start calibration.
 * Zero UI dependencies; 100% deterministic & testable.
 */

import {
  ReadinessConfig,
  DEFAULT_READINESS_CONFIG
} from "./readinessConfig";

export type ReadinessBand = "green" | "amber" | "red";

export function bandToStatus(band?: ReadinessBand): "ready" | "caution" | "rest" {
  if (band === "green") return "ready";
  if (band === "amber") return "caution";
  return "rest";
}

export interface ReadinessInput {
  date: string; // YYYY-MM-DD
  sleep: {
    durationMinutes: number;
    qualityScore: number; // 1-5 (Hooper) or 1-10
    targetMinutes?: number;
    bedTime?: string;
    wakeTime?: string;
  };
  wellness: {
    fatigue: number; // 1-5 (1 = completely fresh, 5 = exhausted)
    soreness: number; // 1-5 (1 = none, 5 = extreme)
    stress: number; // 1-5 (1 = very calm, 5 = highly stressed)
    mood: number; // 1-5 (1 = very poor, 5 = great)
    motivation: number; // 1-5 (1 = no motivation, 5 = peak motivation)
    appetite?: number; // 1-5 (optional)
    illness?: boolean;
    soreAreas?: string[];
  };
  biometrics?: {
    hrvRmssd?: number;
    restingHr?: number;
    baselineHrvMean?: number;
    baselineHrvSd?: number;
    baselineRhrMean?: number;
    baselineRhrSd?: number;
  };
  trainingLoad?: {
    acuteLoad7d?: number;
    chronicLoad28d?: number;
    acwr?: number;
    yesterdayLoad?: number;
  };
  historicalDaysCount?: number;
  forcePath?: "auto" | "biometric" | "manual" | "hybrid";
}

export interface ReadinessDriverResult {
  id: string;
  labelHu: string;
  labelEn: string;
  impact: "positive" | "negative";
  category: "sleep" | "hrv" | "rhr" | "wellness" | "load";
  weight: number; // Magnitude of driver impact
}

export interface ReadinessResult {
  score: number; // 0-100 integer
  band: ReadinessBand;
  confidence: number; // 0-100%
  pathUsed: "biometric" | "manual" | "hybrid";
  drivers: ReadinessDriverResult[];
  isCalibrating: boolean;
  calibrationProgress: {
    daysCollected: number;
    daysRequired: number;
    percentage: number;
  };
  softMessageHu: string;
  softMessageEn: string;
  components: {
    sleepScore: number;
    wellnessScore?: number;
    biometricScore?: number;
    loadAdjustment: number;
  };
}

/**
 * Calculates athlete readiness from subjective and objective biometrics
 */
export function calculateReadiness(
  input: ReadinessInput,
  config: ReadinessConfig = DEFAULT_READINESS_CONFIG
): ReadinessResult {
  const {
    sleep,
    wellness,
    biometrics,
    trainingLoad,
    historicalDaysCount = 0,
    forcePath = "auto"
  } = input;

  const targetSleepMinutes = sleep.targetMinutes || config.thresholds.sleep.defaultTargetMinutes;

  // 1. Calculate Sleep Score (0-100)
  const sleepDurationRatio = Math.min(1.2, sleep.durationMinutes / targetSleepMinutes);
  let durationScore: number;
  if (sleepDurationRatio >= 1.0) {
    durationScore = 100;
  } else if (sleepDurationRatio >= 0.9) {
    // 90% - 100% of target
    durationScore = 85 + (sleepDurationRatio - 0.9) * 150;
  } else if (sleepDurationRatio >= 0.75) {
    // 75% - 90% of target (6h - 7.2h for 8h target)
    durationScore = 65 + (sleepDurationRatio - 0.75) * 133;
  } else if (sleepDurationRatio >= 0.6) {
    // 60% - 75% of target (4.8h - 6h)
    durationScore = 35 + (sleepDurationRatio - 0.6) * 200;
  } else {
    durationScore = Math.max(10, sleepDurationRatio * 58);
  }

  // Normalize sleep quality (supports 1-5 or 1-10)
  const normalizedSleepQuality =
    sleep.qualityScore <= 5 ? (sleep.qualityScore / 5) * 100 : (sleep.qualityScore / 10) * 100;

  const sleepScore = Math.round(durationScore * 0.65 + normalizedSleepQuality * 0.35);

  // 2. Calculate Manual / Subjective Hooper Score (0-100)
  // Invert negative metrics: 1 is best (100%), 5 is worst (0%)
  const fatigueScore = ((5 - Math.max(1, Math.min(5, wellness.fatigue))) / 4) * 100;
  const sorenessScore = ((5 - Math.max(1, Math.min(5, wellness.soreness))) / 4) * 100;
  const stressScore = ((5 - Math.max(1, Math.min(5, wellness.stress))) / 4) * 100;
  // Positive metrics: 1 is worst (0%), 5 is best (100%)
  const moodScore = ((Math.max(1, Math.min(5, wellness.mood)) - 1) / 4) * 100;
  const motivationScore = ((Math.max(1, Math.min(5, wellness.motivation)) - 1) / 4) * 100;

  const manualWeights = config.weights.manual;
  const subjectiveScore = Math.round(
    durationScore * manualWeights.sleepDuration +
    normalizedSleepQuality * manualWeights.sleepQuality +
    fatigueScore * manualWeights.fatigue +
    sorenessScore * manualWeights.soreness +
    stressScore * manualWeights.stress +
    moodScore * manualWeights.mood +
    motivationScore * manualWeights.motivation
  );

  // 3. Calculate Biometric Score (0-100) if biometrics available
  let biometricScore: number | undefined;
  let hrvZScore: number | undefined;
  let rhrDelta: number | undefined;

  const hasHrv = typeof biometrics?.hrvRmssd === "number" && biometrics.hrvRmssd > 0;
  const hasRhr = typeof biometrics?.restingHr === "number" && biometrics.restingHr > 0;
  const hasBiometrics = hasHrv || hasRhr;

  if (hasBiometrics) {
    let hrvScore = 80; // Default neutral baseline
    if (hasHrv && biometrics?.hrvRmssd) {
      if (
        typeof biometrics.baselineHrvMean === "number" &&
        typeof biometrics.baselineHrvSd === "number" &&
        biometrics.baselineHrvSd > 0
      ) {
        hrvZScore = (biometrics.hrvRmssd - biometrics.baselineHrvMean) / biometrics.baselineHrvSd;
        if (hrvZScore >= -0.75 && hrvZScore <= 1.0) {
          // Within optimal normal corridor
          hrvScore = 95 - Math.abs(hrvZScore) * 10;
        } else if (hrvZScore < -0.75 && hrvZScore >= -1.5) {
          // Moderately suppressed
          hrvScore = 75 + (hrvZScore + 0.75) * 30; // 52.5 - 75
        } else if (hrvZScore < -1.5) {
          // Significantly suppressed
          hrvScore = Math.max(15, 50 + (hrvZScore + 1.5) * 25);
        } else {
          // hrvZScore > 1.0 (possible parasympathetic saturation or great recovery)
          hrvScore = fatigueScore < 50 ? 65 : 90;
        }
      } else {
        // Cold-start estimation from population norm
        const rmssd = biometrics.hrvRmssd;
        if (rmssd >= 85) hrvScore = 95;
        else if (rmssd >= 65) hrvScore = 85;
        else if (rmssd >= 45) hrvScore = 72;
        else if (rmssd >= 30) hrvScore = 55;
        else hrvScore = 35;
      }
    }

    let rhrScore = 80;
    if (hasRhr && biometrics?.restingHr) {
      if (typeof biometrics.baselineRhrMean === "number") {
        rhrDelta = biometrics.restingHr - biometrics.baselineRhrMean;
        if (rhrDelta <= 0) {
          rhrScore = Math.min(100, 95 + Math.abs(rhrDelta) * 2);
        } else if (rhrDelta <= config.thresholds.restingHr.normalToleranceBpm) {
          rhrScore = 90 - rhrDelta * 5;
        } else if (rhrDelta <= config.thresholds.restingHr.severelyElevatedBpm) {
          rhrScore = 75 - (rhrDelta - 2) * 8;
        } else {
          rhrScore = Math.max(20, 45 - (rhrDelta - 6) * 5);
        }
      } else {
        const rhr = biometrics.restingHr;
        if (rhr <= 50) rhrScore = 95;
        else if (rhr <= 58) rhrScore = 85;
        else if (rhr <= 68) rhrScore = 72;
        else if (rhr <= 78) rhrScore = 55;
        else rhrScore = 35;
      }
    }

    const bioWeights = config.weights.biometric;
    biometricScore = Math.round(
      hrvScore * bioWeights.hrv +
      rhrScore * bioWeights.restingHr +
      durationScore * bioWeights.sleepDuration +
      normalizedSleepQuality * bioWeights.sleepQuality
    );
  }

  // 4. Determine Path Used & Base Score
  let pathUsed: "biometric" | "manual" | "hybrid";
  let baseScore: number;

  if (forcePath === "biometric" && biometricScore !== undefined) {
    pathUsed = "biometric";
    baseScore = biometricScore;
  } else if (forcePath === "manual" || !hasBiometrics || biometricScore === undefined) {
    pathUsed = "manual";
    baseScore = subjectiveScore;
  } else if (forcePath === "hybrid" || (hasBiometrics && biometricScore !== undefined)) {
    pathUsed = "hybrid";
    const { biometricWeight, manualWeight } = config.weights.hybrid;
    baseScore = Math.round(biometricScore * biometricWeight + subjectiveScore * manualWeight);
  } else {
    pathUsed = "manual";
    baseScore = subjectiveScore;
  }

  // 5. Apply Training Load Adjustments & Illness Penalties
  let loadAdjustment = 0;
  if (trainingLoad?.acwr !== undefined) {
    const acwr = trainingLoad.acwr;
    if (acwr > config.thresholds.load.dangerSpike) {
      loadAdjustment -= config.thresholds.load.dangerDeduction;
    } else if (acwr > config.thresholds.load.sweetSpotMax) {
      loadAdjustment -= config.thresholds.load.moderateDeduction;
    }
  }

  let penaltyAdjustment = 0;
  if (wellness.illness) {
    penaltyAdjustment -= config.thresholds.penalties.illnessDeduction;
  }
  if (wellness.soreness >= 4) {
    penaltyAdjustment -= config.thresholds.penalties.highSorenessDeduction;
  }

  let finalScore = baseScore + loadAdjustment + penaltyAdjustment;
  // If athlete is sick, clamp maximum readiness score to 40
  if (wellness.illness) {
    finalScore = Math.min(40, finalScore);
  }
  finalScore = Math.max(5, Math.min(100, Math.round(finalScore)));

  // 6. Readiness Band
  let band: ReadinessBand;
  if (finalScore >= config.thresholds.bands.greenMin) {
    band = "green";
  } else if (finalScore >= config.thresholds.bands.amberMin) {
    band = "amber";
  } else {
    band = "red";
  }

  // 7. Calculate Confidence Score (0-100%)
  let confidencePoints = 0;
  if (sleep.durationMinutes > 0) confidencePoints += 20;
  if (sleep.qualityScore > 0) confidencePoints += 10;
  if (
    wellness.fatigue > 0 &&
    wellness.soreness > 0 &&
    wellness.stress > 0 &&
    wellness.mood > 0 &&
    wellness.motivation > 0
  ) {
    confidencePoints += 30;
  }
  if (hasHrv) confidencePoints += 20;
  if (hasRhr) confidencePoints += 10;
  if (historicalDaysCount >= config.thresholds.calibration.minimumDays) {
    confidencePoints += 10;
  } else {
    confidencePoints += Math.round((historicalDaysCount / config.thresholds.calibration.minimumDays) * 10);
  }
  const confidence = Math.min(100, Math.max(20, confidencePoints));

  // 8. Extract & Rank Top 3 Physiological Drivers
  const allDrivers: ReadinessDriverResult[] = [];

  // Sleep driver
  const sleepDeltaMinutes = sleep.durationMinutes - targetSleepMinutes;
  const sleepDeltaHours = (Math.abs(sleepDeltaMinutes) / 60).toFixed(1);
  if (sleepDeltaMinutes <= -60) {
    allDrivers.push({
      id: "sleep_deficit",
      labelHu: `Alvásidő ${sleepDeltaHours} órával rövidebb a célodnál`,
      labelEn: `Sleep duration is ${sleepDeltaHours}h below your target`,
      impact: "negative",
      category: "sleep",
      weight: Math.abs(sleepDeltaMinutes) / 10
    });
  } else if (sleepDeltaMinutes >= 0 && normalizedSleepQuality >= 75) {
    allDrivers.push({
      id: "sleep_optimal",
      labelHu: "Kiváló alvásidő és minőségi pihenés",
      labelEn: "Optimal sleep duration and quality",
      impact: "positive",
      category: "sleep",
      weight: 18
    });
  }

  // Illness driver
  if (wellness.illness) {
    allDrivers.push({
      id: "illness_active",
      labelHu: "Jelzett betegségtünetek / gyulladásos terhelés",
      labelEn: "Reported illness symptoms / inflammatory stress",
      impact: "negative",
      category: "wellness",
      weight: 120
    });
  }

  // HRV driver
  if (hasHrv && hrvZScore !== undefined) {
    if (hrvZScore <= -0.75) {
      allDrivers.push({
        id: "hrv_suppressed",
        labelHu: `HRV a 28 napos bázis alatt (z: ${hrvZScore.toFixed(1)})`,
        labelEn: `HRV suppressed below 28d baseline (z: ${hrvZScore.toFixed(1)})`,
        impact: "negative",
        category: "hrv",
        weight: Math.min(60, Math.abs(hrvZScore) * 20)
      });
    } else if (hrvZScore >= -0.25 && hrvZScore <= 0.8) {
      allDrivers.push({
        id: "hrv_balanced",
        labelHu: "Kiegyensúlyozott vegetatív idegrendszer (normál HRV)",
        labelEn: "Balanced autonomic nervous system (HRV normal)",
        impact: "positive",
        category: "hrv",
        weight: 16
      });
    }
  }

  // Resting HR driver
  if (hasRhr && rhrDelta !== undefined) {
    if (rhrDelta >= 3) {
      allDrivers.push({
        id: "rhr_elevated",
        labelHu: `Nyugalmi pulzus +${Math.round(rhrDelta)} bpm-mel emelkedett`,
        labelEn: `Resting HR is +${Math.round(rhrDelta)} bpm elevated`,
        impact: "negative",
        category: "rhr",
        weight: Math.abs(rhrDelta) * 5
      });
    } else if (rhrDelta <= 0) {
      allDrivers.push({
        id: "rhr_low",
        labelHu: "Nyugalmi pulzus optimális, szív-érrendszer kipihent",
        labelEn: "Resting HR optimal, cardiovascular system rested",
        impact: "positive",
        category: "rhr",
        weight: 12
      });
    }
  }

  // Fatigue & Soreness drivers
  if (wellness.fatigue >= 4) {
    allDrivers.push({
      id: "fatigue_high",
      labelHu: "Jelentős szubjektív fáradtságérzet",
      labelEn: "High perceived fatigue",
      impact: "negative",
      category: "wellness",
      weight: wellness.fatigue * 6
    });
  } else if (wellness.fatigue <= 2) {
    allDrivers.push({
      id: "fatigue_fresh",
      labelHu: "Alacsony fáradtságszint, friss izomzat",
      labelEn: "Low fatigue level, fresh musculature",
      impact: "positive",
      category: "wellness",
      weight: 14
    });
  }

  if (wellness.soreness >= 4) {
    const soreAreaCount = wellness.soreAreas?.length || 0;
    const countText = soreAreaCount > 0 ? ` (${soreAreaCount} zóna)` : "";
    allDrivers.push({
      id: "soreness_high",
      labelHu: `Kifejezett izomláz${countText}`,
      labelEn: `Significant muscle soreness${countText}`,
      impact: "negative",
      category: "wellness",
      weight: wellness.soreness * 5 + soreAreaCount
    });
  }

  // Stress & Mood
  if (wellness.stress >= 4) {
    allDrivers.push({
      id: "stress_high",
      labelHu: "Megnövekedett mentális stressz-szint",
      labelEn: "Elevated mental stress level",
      impact: "negative",
      category: "wellness",
      weight: wellness.stress * 4
    });
  }

  if (wellness.mood >= 4 && wellness.motivation >= 4) {
    allDrivers.push({
      id: "motivation_peak",
      labelHu: "Kiváló mentális fókusz és edzésmotiváció",
      labelEn: "High mental focus and workout motivation",
      impact: "positive",
      category: "wellness",
      weight: 15
    });
  }

  // Training load driver
  if (trainingLoad?.acwr !== undefined && trainingLoad.acwr > 1.3) {
    allDrivers.push({
      id: "acwr_spike",
      labelHu: `Akut terhelési ugrás (ACWR: ${trainingLoad.acwr.toFixed(2)})`,
      labelEn: `Acute training load spike (ACWR: ${trainingLoad.acwr.toFixed(2)})`,
      impact: "negative",
      category: "load",
      weight: 22
    });
  }

  // Sort drivers by weight descending and pick top 3
  allDrivers.sort((a, b) => b.weight - a.weight);
  const drivers = allDrivers.slice(0, 3);

  // If no drivers triggered, add a default balanced driver
  if (drivers.length === 0) {
    drivers.push({
      id: "balanced_recovery",
      labelHu: "Kiegyensúlyozott regenerációs állapot",
      labelEn: "Balanced recovery state",
      impact: "positive",
      category: "wellness",
      weight: 10
    });
  }

  // 9. Cold Start Calibration State
  const minCalibrationDays = config.thresholds.calibration.minimumDays;
  const isCalibrating = historicalDaysCount < minCalibrationDays;
  const calibrationDaysCollected = Math.min(minCalibrationDays, historicalDaysCount);
  const calibrationPercentage = Math.round((calibrationDaysCollected / minCalibrationDays) * 100);

  const softMessageHu = isCalibrating
    ? `Kalibrálás folyamatban: a személyes bázisod és az értékek pontossága a rögzített napok számával növekszik (${calibrationDaysCollected}/${minCalibrationDays} nap).`
    : band === "green"
      ? "Készen állsz a magas intenzitású és kulcsedzés munkára."
      : band === "amber"
        ? "Mérsékelt regeneráció: javasolt a Z2 aerob terjedelem és a kontrollált terhelés."
        : "Csökkent regeneráció: fókuszálj az alvásra, nyújtásra és könnyű átmozgatásra.";

  const softMessageEn = isCalibrating
    ? `Calibration in progress: personalized baselines and accuracy improve with every logged day (${calibrationDaysCollected}/${minCalibrationDays} days).`
    : band === "green"
      ? "Fully ready for high-intensity key workouts."
      : band === "amber"
        ? "Moderate readiness: prioritize aerobic Z2 volume and controlled loading."
        : "Suppressed recovery: focus on sleep, mobility, and active recovery.";

  return {
    score: finalScore,
    band,
    confidence,
    pathUsed,
    drivers,
    isCalibrating,
    calibrationProgress: {
      daysCollected: calibrationDaysCollected,
      daysRequired: minCalibrationDays,
      percentage: calibrationPercentage
    },
    softMessageHu,
    softMessageEn,
    components: {
      sleepScore,
      wellnessScore: subjectiveScore,
      biometricScore,
      loadAdjustment: loadAdjustment + penaltyAdjustment
    }
  };
}
