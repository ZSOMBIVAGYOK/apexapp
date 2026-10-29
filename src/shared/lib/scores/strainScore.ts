/**
 * STRAIN (TERHELÉS) & TARGET RANGE SCORING ENGINE
 *
 * Implements exponential diminishing-returns workload scoring relative
 * to individual athlete capacity (CTL and competition level).
 * Computes progressive daily strain (0-100), contributing sessions,
 * and target strain range (célsáv) from planned workouts or recovery state.
 *
 * NOTE: The target is a RANGE, not a score to exceed. No gamified deficit rewards.
 */

import { SCORES_CONFIG } from "./config";
import { ReadinessBand } from "@shared/lib/readiness";

export interface SessionContributionInput {
  sessionId: string;
  title: string;
  sport: string;
  durationMinutes: number;
  load: number;
  isManual?: boolean;
}

export interface DailyActivityInput {
  steps?: number;
  activeMinutes?: number;
}

export interface PlannedWorkoutLoadInput {
  id: string;
  title: string;
  plannedLoad: number;
  plannedDurationMinutes?: number;
  sport?: string;
}

export interface TargetStrainRangeResult {
  low: number; // 0-100
  high: number; // 0-100
  source: "plan" | "recovery";
  sourceLabelHu: "Terv" | "Regeneráció";
  sourceLabelEn: "Plan" | "Recovery";
  status: "below" | "in_range" | "above";
  statusLabelHu: "Alatta" | "Célsávban" | "Felette";
  statusLabelEn: "Below" | "In Target" | "Above";
  roomRemaining: number; // Strain points needed to reach lower bound, or 0 if inside/above
  roomDescriptionHu: string;
  roomDescriptionEn: string;
  softWarningHu?: string; // If planned strain exceeds recovery recommendation
  softWarningEn?: string;
  isRestDayTarget: boolean; // Target is in recovery zone
}

export interface ContributingSessionItem {
  sessionId: string;
  title: string;
  sport: string;
  durationMinutes: number;
  load: number;
  strainContribution: number;
  isManual: boolean;
}

export interface AthleteStrainScore {
  score: number; // 0-100
  dailyLoadTotal: number; // AU or TSS
  activityLoadContribution: number;
  kCapacity: number;
  targetRange: TargetStrainRangeResult;
  contributingSessions: ContributingSessionItem[];
  confidence: number; // 0-100%
  isManualOnly: boolean;
  isRestDaySuccess: boolean;
}

/**
 * Derives personal workload capacity coefficient k based on athlete level and chronic load (CTL).
 */
export function deriveAthleteK(
  level: string = "competitive_amateur",
  ctl?: number,
  config = SCORES_CONFIG
): number {
  const defaults = config.strain.kDefaultsByLevel;
  const levelKey = (level in defaults ? level : "competitive_amateur") as keyof typeof defaults;
  const baseK = defaults[levelKey];

  if (typeof ctl === "number" && ctl > 0) {
    const adaptiveK = Math.max(
      config.strain.adaptive.minK,
      baseK * config.strain.adaptive.levelWeight +
        ctl * config.strain.adaptive.ctlMultiplier * config.strain.adaptive.ctlWeight
    );
    return Math.round(adaptiveK);
  }

  return baseK;
}

/**
 * Maps raw daily training load into a 0-100 strain score using the diminishing-returns curve:
 * strain = 100 * (1 - exp(-load / k))
 */
export function loadToStrain(load: number, k: number, maxScore = 100): number {
  if (load <= 0 || k <= 0) return 0;
  const rawStrain = maxScore * (1 - Math.exp(-load / k));
  return Math.min(maxScore, Math.max(0, Math.round(rawStrain * 10) / 10));
}

/**
 * Inverts strain to load:
 * load = -k * ln(1 - strain / 100)
 */
export function strainToLoad(strain: number, k: number, maxScore = 100): number {
  if (strain <= 0 || k <= 0) return 0;
  if (strain >= maxScore) return k * 5; // practical ceiling
  return Math.round(-k * Math.log(1 - strain / maxScore));
}

/**
 * Calculates target strain range from planned workouts or recovery state.
 */
export function calculateTargetStrainRange(options: {
  plannedWorkouts?: PlannedWorkoutLoadInput[];
  recoveryBand?: ReadinessBand;
  kCapacity: number;
  seasonPhase?: string;
  acwr?: number;
  currentStrain: number;
  config?: typeof SCORES_CONFIG;
}): TargetStrainRangeResult {
  const {
    plannedWorkouts = [],
    recoveryBand = "green",
    kCapacity,
    seasonPhase = "base",
    acwr = 1.0,
    currentStrain,
    config = SCORES_CONFIG
  } = options;

  const validPlans = plannedWorkouts.filter((p) => p.plannedLoad > 0);
  const totalPlannedLoad = validPlans.reduce((sum, p) => sum + p.plannedLoad, 0);

  // 1. Calculate recovery-based baseline recommendation
  const baseBand = config.targetRange.recoveryBands[recoveryBand] || config.targetRange.recoveryBands.green;
  let recLow = baseBand.low;
  let recHigh = baseBand.high;

  // Apply season phase delta
  const phaseDelta = config.targetRange.seasonPhaseDelta[seasonPhase] || 0;
  recLow = Math.max(5, recLow + phaseDelta);
  recHigh = Math.max(recLow + 10, recHigh + phaseDelta);

  // Apply ACWR adjustment
  if (acwr > config.targetRange.acwr.dangerThreshold) {
    // Danger ACWR (>1.5) -> Shift to recovery range
    recLow = Math.min(recLow, config.targetRange.recoveryBands.red.low);
    recHigh = Math.min(recHigh, config.targetRange.recoveryBands.red.high);
  } else if (acwr > config.targetRange.acwr.cautionThreshold) {
    // Caution ACWR (>1.3) -> Dampen upper boundary
    recHigh = Math.max(recLow + 5, recHigh - config.targetRange.acwr.cautionHighDampen);
  }

  recLow = Math.round(recLow);
  recHigh = Math.round(recHigh);

  let targetLow: number;
  let targetHigh: number;
  let source: "plan" | "recovery";
  let softWarningHu: string | undefined;
  let softWarningEn: string | undefined;

  // Priority 1: Planned workout exists
  if (validPlans.length > 0 && totalPlannedLoad > 0) {
    source = "plan";
    const expectedStrain = loadToStrain(totalPlannedLoad, kCapacity);
    const halfWin = config.targetRange.planHalfWindow;
    targetLow = Math.max(5, Math.round(expectedStrain - halfWin));
    targetHigh = Math.min(config.strain.maxScore, Math.round(expectedStrain + halfWin));

    // Check if planned strain exceeds recovery recommendation
    if (expectedStrain > recHigh + 5) {
      softWarningHu = "A mai terv erősebb, mint amit a regenerációd javasol.";
      softWarningEn = "Today's plan is heavier than suggested by your recovery state.";
    }
  } else {
    source = "recovery";
    targetLow = recLow;
    targetHigh = recHigh;
  }

  // Determine status
  let status: "below" | "in_range" | "above";
  let statusLabelHu: "Alatta" | "Célsávban" | "Felette";
  let statusLabelEn: "Below" | "In Target" | "Above";
  let roomRemaining = 0;
  let roomDescriptionHu = "";
  let roomDescriptionEn = "";

  const roundedStrain = Math.round(currentStrain);

  if (roundedStrain < targetLow) {
    status = "below";
    statusLabelHu = "Alatta";
    statusLabelEn = "Below";
    roomRemaining = Math.max(1, targetLow - roundedStrain);
    roomDescriptionHu = `még kb. ${roomRemaining} pont a célsávig`;
    roomDescriptionEn = `about ${roomRemaining} pts to target zone`;
  } else if (roundedStrain <= targetHigh) {
    status = "in_range";
    statusLabelHu = "Célsávban";
    statusLabelEn = "In Target";
    roomRemaining = 0;
    roomDescriptionHu = "Célsávban vagy a mai terheléssel";
    roomDescriptionEn = "Currently within today's target range";
  } else {
    status = "above";
    statusLabelHu = "Felette";
    statusLabelEn = "Above";
    roomRemaining = 0;
    const overPts = roundedStrain - targetHigh;
    roomDescriptionHu = `${overPts} ponttal a célsáv felett`;
    roomDescriptionEn = `${overPts} pts above target range`;
  }

  const isRestDayTarget = targetHigh <= config.dailyRhythm.restDayStrainCeiling || recoveryBand === "red";

  return {
    low: targetLow,
    high: targetHigh,
    source,
    sourceLabelHu: source === "plan" ? "Terv" : "Regeneráció",
    sourceLabelEn: source === "plan" ? "Plan" : "Recovery",
    status,
    statusLabelHu,
    statusLabelEn,
    roomRemaining,
    roomDescriptionHu,
    roomDescriptionEn,
    softWarningHu,
    softWarningEn,
    isRestDayTarget
  };
}

/**
 * Calculates complete daily Strain score and contributing sessions breakdown.
 */
export function calculateDailyStrain(options: {
  sessions: SessionContributionInput[];
  activity?: DailyActivityInput;
  plannedWorkouts?: PlannedWorkoutLoadInput[];
  recoveryBand?: ReadinessBand;
  athleteLevel?: string;
  ctl?: number;
  seasonPhase?: string;
  acwr?: number;
  config?: typeof SCORES_CONFIG;
}): AthleteStrainScore {
  const {
    sessions = [],
    activity,
    plannedWorkouts = [],
    recoveryBand = "green",
    athleteLevel = "competitive_amateur",
    ctl,
    seasonPhase = "base",
    acwr = 1.0,
    config = SCORES_CONFIG
  } = options;

  const k = deriveAthleteK(athleteLevel, ctl, config);

  // 1. Calculate training session loads
  let sessionLoadSum = 0;
  let allManual = sessions.length > 0;

  const contributingSessions: ContributingSessionItem[] = [];

  for (const s of sessions) {
    if (s.load > 0) {
      sessionLoadSum += s.load;
      if (!s.isManual) allManual = false;

      // Incremental strain calculation for session contribution
      const partialStrain = loadToStrain(s.load, k);
      contributingSessions.push({
        sessionId: s.sessionId,
        title: s.title || "Edzés",
        sport: s.sport || "other",
        durationMinutes: s.durationMinutes || 0,
        load: Math.round(s.load),
        strainContribution: Math.round(partialStrain * 10) / 10,
        isManual: !!s.isManual
      });
    }
  }

  // 2. Activity contribution (steps / active minutes)
  let activityLoad = 0;
  if (activity) {
    const stepsPart = activity.steps ? activity.steps / config.strain.activityContribution.stepsDivisor : 0;
    const activePart = activity.activeMinutes
      ? activity.activeMinutes * config.strain.activityContribution.activeMinutesMultiplier
      : 0;
    activityLoad = Math.min(
      config.strain.activityContribution.maxAdditionalLoad,
      Math.round((stepsPart + activePart) * 10) / 10
    );
  }

  const totalDailyLoad = sessionLoadSum + activityLoad;
  const strainScore = loadToStrain(totalDailyLoad, k);

  // 3. Compute Target Range
  const targetRange = calculateTargetStrainRange({
    plannedWorkouts,
    recoveryBand,
    kCapacity: k,
    seasonPhase,
    acwr,
    currentStrain: strainScore,
    config
  });

  // 4. Resolve confidence
  let confidence: number;
  if (sessions.length === 0) {
    confidence = activity ? config.strain.confidence.fileImport : 100; // Baseline 0 is certain
  } else if (allManual) {
    confidence = config.strain.confidence.manualRpe;
  } else {
    confidence = config.strain.confidence.device;
  }

  // 5. Rest day success logic: if target is rest/recovery and strain is within range or below target ceiling
  const isRestDaySuccess =
    targetRange.isRestDayTarget && strainScore <= targetRange.high;

  return {
    score: Math.round(strainScore * 10) / 10,
    dailyLoadTotal: Math.round(totalDailyLoad),
    activityLoadContribution: activityLoad,
    kCapacity: k,
    targetRange,
    contributingSessions,
    confidence,
    isManualOnly: allManual && sessions.length > 0,
    isRestDaySuccess
  };
}
