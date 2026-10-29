/**
 * SLEEP (ALVÁS) SCORING & NEED ENGINE
 *
 * Computes individualized daily sleep need, 7-day sleep debt tracking,
 * sleep performance score (0-100), sleep consistency, restorative stage ratio,
 * and intelligent evening bedtime recommendations.
 */

import { SCORES_CONFIG } from "./config";

export interface SleepSessionInput {
  durationMinutes: number;
  qualityScore?: number; // 1-5 (Hooper) or 1-10
  bedTime?: string; // ISO or "HH:mm"
  wakeTime?: string; // ISO or "HH:mm"
  deepMinutes?: number;
  remMinutes?: number;
  awakeMinutes?: number;
  efficiencyPercent?: number; // 0-100
  isManual?: boolean;
}

export interface HistoricalSleepDayInput {
  date: string;
  durationMinutes: number;
  needMinutes?: number;
  bedTime?: string;
  wakeTime?: string;
}

export interface SleepNeedBreakdown {
  baselineMinutes: number;
  strainExtraMinutes: number;
  debtRepaymentMinutes: number;
  napDeductionMinutes: number;
  totalNeedMinutes: number;
}

export interface BedtimeRecommendation {
  targetWakeTime: string; // "HH:mm"
  recommendedBedtime: string; // "HH:mm"
  latencyMinutes: number;
  textHu: string;
  textEn: string;
}

export interface AthleteSleepScore {
  score: number; // 0-100
  durationMinutes: number;
  needMinutes: number;
  debtMinutes: number; // Cumulative 7d debt
  consistency: number; // 0-100
  efficiency: number; // 0-100
  restorativeShare: number; // 0-100% (deep + rem)
  statusLabelHu: "Kiváló" | "Kielégítő" | "Elégtelen" | "Nincs adat";
  statusLabelEn: "Optimal" | "Sufficient" | "Deficient" | "No Data";
  breakdown: SleepNeedBreakdown;
  bedtimeRecommendation: BedtimeRecommendation;
  confidence: number;
  isManual: boolean;
}

/**
 * Calculates sleep need for tonight based on personal baseline, yesterday's strain,
 * cumulative 7-day sleep debt, and naps.
 */
export function calculateSleepNeed(options: {
  baselineMinutes?: number;
  yesterdayStrain?: number;
  sevenDayHistory?: HistoricalSleepDayInput[];
  napsMinutesToday?: number;
  config?: typeof SCORES_CONFIG;
}): SleepNeedBreakdown {
  const {
    baselineMinutes = SCORES_CONFIG.sleep.defaultBaselineMinutes,
    yesterdayStrain = 0,
    sevenDayHistory = [],
    napsMinutesToday = 0,
    config = SCORES_CONFIG
  } = options;

  // 1. Extra need from yesterday's strain (0 - 60 minutes)
  const strainExtra = Math.min(
    config.sleep.maxStrainExtraMinutes,
    Math.round(yesterdayStrain * config.sleep.strainExtraMultiplier)
  );

  // 2. Cumulative 7-day sleep debt
  let total7DayDebt = 0;
  for (const day of sevenDayHistory) {
    const dayNeed = day.needMinutes || baselineMinutes;
    if (day.durationMinutes < dayNeed) {
      total7DayDebt += dayNeed - day.durationMinutes;
    }
  }

  // Repayment for today: 25% of debt, capped at 45 minutes
  const debtRepayment = Math.min(
    config.sleep.maxDebtRepaymentMinutes,
    Math.round(total7DayDebt * config.sleep.debtRepaymentRatio)
  );

  // 3. Nap deduction
  const napDeduction = Math.max(0, napsMinutesToday);

  // 4. Net need clamped to healthy boundaries
  const rawNeed = baselineMinutes + strainExtra + debtRepayment - napDeduction;
  const clampedNeed = Math.min(
    config.sleep.maxNeedMinutes,
    Math.max(config.sleep.minHealthyMinutes, rawNeed)
  );

  return {
    baselineMinutes,
    strainExtraMinutes: strainExtra,
    debtRepaymentMinutes: debtRepayment,
    napDeductionMinutes: napDeduction,
    totalNeedMinutes: clampedNeed
  };
}

/**
 * Helper to parse "HH:mm" or ISO into minutes from midnight.
 */
function timeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  }
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return parseInt(match[1]!, 10) * 60 + parseInt(match[2]!, 10);
  }
  return null;
}

/**
 * Formats minutes from midnight to "HH:mm".
 */
function minutesToTime(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculates consistency score based on variance of bed/wake times in the past 7 days.
 */
export function calculateSleepConsistency(
  history: HistoricalSleepDayInput[],
  currentBedTime?: string,
  currentWakeTime?: string
): number {
  const bedMinutes: number[] = [];
  const wakeMinutes: number[] = [];

  const addTime = (bed?: string, wake?: string) => {
    const b = timeToMinutes(bed);
    const w = timeToMinutes(wake);
    if (b !== null) bedMinutes.push(b > 720 ? b - 1440 : b); // Normalize past midnight
    if (w !== null) wakeMinutes.push(w);
  };

  addTime(currentBedTime, currentWakeTime);
  for (const h of history) {
    addTime(h.bedTime, h.wakeTime);
  }

  if (bedMinutes.length < 2 && wakeMinutes.length < 2) {
    return 80; // Reasonable default when history is starting
  }

  // Calculate standard deviation of wake times
  const calcSd = (arr: number[]) => {
    if (arr.length < 2) return 30;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  const bedSd = calcSd(bedMinutes);
  const wakeSd = calcSd(wakeMinutes);
  const avgSd = (bedSd + wakeSd) / 2;

  // 0-30 min SD -> 95-100% consistency; >120 min SD -> <50% consistency
  const score = Math.max(30, Math.min(100, Math.round(100 - (avgSd / 90) * 50)));
  return score;
}

/**
 * Computes bedtime recommendation for tonight.
 */
export function computeBedtimeRecommendation(
  targetWakeTime = "07:00",
  sleepNeedMinutes: number,
  latencyMinutes = 15
): BedtimeRecommendation {
  const wakeMins = timeToMinutes(targetWakeTime) ?? 7 * 60; // 07:00
  const recommendedBedMinutes = wakeMins - sleepNeedMinutes - latencyMinutes;
  const recommendedBedtime = minutesToTime(recommendedBedMinutes);

  return {
    targetWakeTime,
    recommendedBedtime,
    latencyMinutes,
    textHu: `Ajánlott lefekvés: ${recommendedBedtime} (${targetWakeTime}-s ébredéshez)`,
    textEn: `Recommended bedtime: ${recommendedBedtime} (for ${targetWakeTime} wake-up)`
  };
}

/**
 * Evaluates full Sleep Score (0-100) from last night's data.
 */
export function calculateSleepScore(options: {
  lastNight?: SleepSessionInput;
  yesterdayStrain?: number;
  sevenDayHistory?: HistoricalSleepDayInput[];
  userBaselineMinutes?: number;
  targetWakeTime?: string;
  config?: typeof SCORES_CONFIG;
}): AthleteSleepScore {
  const {
    lastNight,
    yesterdayStrain = 0,
    sevenDayHistory = [],
    userBaselineMinutes,
    targetWakeTime = "07:00",
    config = SCORES_CONFIG
  } = options;

  const breakdown = calculateSleepNeed({
    baselineMinutes: userBaselineMinutes,
    yesterdayStrain,
    sevenDayHistory,
    config
  });

  const bedtimeRec = computeBedtimeRecommendation(
    targetWakeTime,
    breakdown.totalNeedMinutes,
    config.sleep.defaultSleepLatencyMinutes
  );

  // If no sleep recorded yet
  if (!lastNight || lastNight.durationMinutes <= 0) {
    return {
      score: 0,
      durationMinutes: 0,
      needMinutes: breakdown.totalNeedMinutes,
      debtMinutes: 0,
      consistency: 0,
      efficiency: 0,
      restorativeShare: 0,
      statusLabelHu: "Nincs adat",
      statusLabelEn: "No Data",
      breakdown,
      bedtimeRecommendation: bedtimeRec,
      confidence: 0,
      isManual: true
    };
  }

  const duration = lastNight.durationMinutes;
  const need = breakdown.totalNeedMinutes;

  // 1. Duration vs Need Score (0-100)
  const durationRatio = duration / need;
  let durationScore: number;
  if (durationRatio >= 1.0) {
    durationScore = 100;
  } else if (durationRatio >= 0.9) {
    durationScore = 85 + (durationRatio - 0.9) * 150;
  } else if (durationRatio >= 0.75) {
    durationScore = 65 + (durationRatio - 0.75) * 133;
  } else if (durationRatio >= 0.6) {
    durationScore = 45 + (durationRatio - 0.6) * 133;
  } else {
    durationScore = Math.max(10, Math.round(durationRatio * 75));
  }
  durationScore = Math.min(100, Math.max(0, durationScore));

  // 2. Consistency Score
  const consistency = calculateSleepConsistency(
    sevenDayHistory,
    lastNight.bedTime,
    lastNight.wakeTime
  );

  // 3. Efficiency
  let efficiency = lastNight.efficiencyPercent;
  if (typeof efficiency !== "number" || efficiency <= 0) {
    if (lastNight.awakeMinutes && lastNight.durationMinutes > 0) {
      const totalBed = lastNight.durationMinutes + lastNight.awakeMinutes;
      efficiency = Math.round((lastNight.durationMinutes / totalBed) * 100);
    } else {
      // Estimated efficiency from quality or typical
      const q = lastNight.qualityScore || 4;
      efficiency = Math.min(95, Math.max(70, 75 + q * 4));
    }
  }

  // 4. Restorative share (Deep + REM)
  let restorativeShare = 0;
  const hasStages =
    typeof lastNight.deepMinutes === "number" && typeof lastNight.remMinutes === "number";

  if (hasStages && duration > 0) {
    const restorativeMins = (lastNight.deepMinutes || 0) + (lastNight.remMinutes || 0);
    const ratio = restorativeMins / duration;
    restorativeShare = Math.round(ratio * 100);
  }

  // 5. Score computation depending on device vs manual mode
  let finalScore: number;
  let confidence: number;
  const isManual = lastNight.isManual ?? !hasStages;

  if (!isManual && hasStages) {
    // Device mode with stages
    const w = config.sleep.weights.device;
    const restorativeRatioScore = Math.min(
      100,
      Math.max(40, Math.round((restorativeShare / 40) * 100))
    );

    finalScore =
      durationScore * w.durationVsNeed +
      efficiency * w.efficiency +
      consistency * w.consistency +
      restorativeRatioScore * w.restorative;
    confidence = config.sleep.confidence.device;
  } else {
    // Manual mode (or basic device without stages)
    const w = config.sleep.weights.manual;
    const qualityScore = Math.min(100, Math.max(20, (lastNight.qualityScore || 3) * 20));

    finalScore =
      durationScore * w.durationVsNeed +
      qualityScore * w.quality +
      consistency * w.consistency;
    confidence = config.sleep.confidence.manual;
  }

  finalScore = Math.min(100, Math.max(0, Math.round(finalScore)));

  // Labels
  let statusLabelHu: "Kiváló" | "Kielégítő" | "Elégtelen";
  let statusLabelEn: "Optimal" | "Sufficient" | "Deficient";
  if (finalScore >= 80) {
    statusLabelHu = "Kiváló";
    statusLabelEn = "Optimal";
  } else if (finalScore >= 60) {
    statusLabelHu = "Kielégítő";
    statusLabelEn = "Sufficient";
  } else {
    statusLabelHu = "Elégtelen";
    statusLabelEn = "Deficient";
  }

  // Calculate 7-day debt total
  let cumulativeDebt = Math.max(0, need - duration);
  for (const h of sevenDayHistory) {
    const dNeed = h.needMinutes || breakdown.baselineMinutes;
    if (h.durationMinutes < dNeed) {
      cumulativeDebt += dNeed - h.durationMinutes;
    }
  }

  return {
    score: finalScore,
    durationMinutes: duration,
    needMinutes: need,
    debtMinutes: cumulativeDebt,
    consistency,
    efficiency,
    restorativeShare,
    statusLabelHu,
    statusLabelEn,
    breakdown,
    bedtimeRecommendation: bedtimeRec,
    confidence,
    isManual
  };
}
