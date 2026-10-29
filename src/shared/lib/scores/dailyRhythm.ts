/**
 * DAILY RHYTHM STATE MACHINE & FOCUS INSIGHTS
 *
 * Models the athlete's 24-hour daily cycle:
 * Morning (pre/post check-in) -> Daytime training -> Post-workout recovery -> Evening wind-down.
 * Generates rule-based plain Hungarian "Mai fókusz" and "Következő lépés" statements.
 */

import { ReadinessBand } from "@shared/lib/readiness";
import { SCORES_CONFIG } from "./config";
import { TargetStrainRangeResult } from "./strainScore";

export type DailyRhythmStage =
  | "morning_pending" // Check-in not yet completed
  | "morning_ready" // Check-in done, training ahead
  | "daytime_training" // Middle of the day, sessions underway
  | "post_training" // Key session done, recovery window open
  | "evening_winddown"; // Evening, bedtime focus

export interface DailyRhythmEvaluation {
  stage: DailyRhythmStage;
  focusSentenceHu: string;
  focusSentenceEn: string;
  nextStepLineHu: string;
  nextStepLineEn: string;
  isCheckInPending: boolean;
  showRecoveryPrompt: boolean;
  showBedtimeCard: boolean;
  isRestDaySuccess: boolean;
}

/**
 * Evaluates current athlete daily rhythm state.
 */
export function evaluateDailyRhythm(options: {
  hasCheckedIn: boolean;
  recoveryBand?: ReadinessBand;
  currentStrain: number;
  targetRange: TargetStrainRangeResult;
  completedSessionsCount: number;
  plannedWorkoutsCount: number;
  recommendedBedtime?: string;
  currentHour?: number;
  config?: typeof SCORES_CONFIG;
}): DailyRhythmEvaluation {
  const {
    hasCheckedIn,
    recoveryBand = "green",
    currentStrain,
    targetRange,
    completedSessionsCount,
    plannedWorkoutsCount,
    recommendedBedtime = "22:30",
    currentHour = new Date().getHours(),
    config = SCORES_CONFIG
  } = options;

  let stage: DailyRhythmStage;

  if (!hasCheckedIn) {
    stage = "morning_pending";
  } else if (currentHour >= config.dailyRhythm.eveningHourThreshold) {
    stage = "evening_winddown";
  } else if (completedSessionsCount > 0 && currentStrain >= targetRange.low) {
    stage = "post_training";
  } else if (currentHour < config.dailyRhythm.morningHourThreshold && completedSessionsCount === 0) {
    stage = "morning_ready";
  } else {
    stage = "daytime_training";
  }

  const isRestDay = targetRange.isRestDayTarget;
  const isRestDaySuccess = isRestDay && currentStrain <= targetRange.high;

  // 1. Focus Sentence Generation (Plain Hungarian)
  let focusSentenceHu: string;
  let focusSentenceEn: string;

  if (isRestDaySuccess) {
    focusSentenceHu =
      "Sikeres regenerációs nap a célsávban; a pihenés ma a fejlődés legfontosabb része.";
    focusSentenceEn =
      "Successful rest day in target range; recovery is the most critical driver of adaptation today.";
  } else if (recoveryBand === "red") {
    focusSentenceHu =
      "Magas idegrendszeri terheltség érzékelhető; a mai napon a kímélő mozgás és regeneráció élvez elsőbbséget.";
    focusSentenceEn =
      "Elevated physiological stress detected; gentle active recovery and rest take priority today.";
  } else if (recoveryBand === "amber") {
    focusSentenceHu =
      "Mérsékelt autonóm fáradtság áll fenn; szubmaximális aerob intenzitás vagy technikai munka javasolt.";
    focusSentenceEn =
      "Moderate autonomic fatigue present; controlled aerobic intensity or technical work is advised.";
  } else {
    // Green
    if (targetRange.status === "in_range") {
      focusSentenceHu =
        "A mai kulcsterhelés elvégezve a célsávban; a hangsúly most az izomzat tápanyag-visszatöltésére és pihentetésére kerül.";
      focusSentenceEn =
        "Key training accomplished within target zone; focus shifts to glycogen replenishment and rest.";
    } else if (targetRange.status === "above") {
      focusSentenceHu =
        "A mai terhelés meghaladta a célsávot; fordíts kiemelt figyelmet az esti fehérje- és folyadékpótlásra.";
      focusSentenceEn =
        "Today's strain exceeded target range; prioritize evening protein and hydration replenishment.";
    } else {
      focusSentenceHu =
        "Optimális regeneráció és idegrendszeri bázisállapot; a szervezet készen áll a tervezett minőségi edzésre.";
      focusSentenceEn =
        "Optimal recovery and autonomic readiness; your body is primed for today's key training stimulus.";
    }
  }

  // 2. Next Step Line Generation
  let nextStepLineHu: string;
  let nextStepLineEn: string;

  switch (stage) {
    case "morning_pending":
      nextStepLineHu = "Töltsd ki a reggeli check-int a pontos regenerációs pontszámhoz.";
      nextStepLineEn = "Complete morning check-in to unlock your exact recovery score.";
      break;

    case "morning_ready":
    case "daytime_training":
      if (plannedWorkoutsCount > 0 && targetRange.roomRemaining > 0) {
        nextStepLineHu = `Tervezett edzés elvégzése (${targetRange.roomDescriptionHu}).`;
        nextStepLineEn = `Execute planned workout (${targetRange.roomDescriptionEn}).`;
      } else if (targetRange.roomRemaining > 0) {
        nextStepLineHu = `Aktív edzésmunka (${targetRange.roomDescriptionHu}).`;
        nextStepLineEn = `Active training (${targetRange.roomDescriptionEn}).`;
      } else {
        nextStepLineHu = "A napi terhelési célsáv elérve; edzés levezetése és nyújtás.";
        nextStepLineEn = "Daily strain target reached; cool-down and mobility.";
      }
      break;

    case "post_training":
      nextStepLineHu = "Edzés utáni regeneráció: hidratáció, fehérjebevitel és hengerezés.";
      nextStepLineEn = "Post-workout recovery: hydration, protein intake, and mobility.";
      break;

    case "evening_winddown":
      nextStepLineHu = `Felkészülés az alvásra; javasolt lefekvés: ${recommendedBedtime}.`;
      nextStepLineEn = `Wind down for sleep; recommended bedtime: ${recommendedBedtime}.`;
      break;
  }

  return {
    stage,
    focusSentenceHu,
    focusSentenceEn,
    nextStepLineHu,
    nextStepLineEn,
    isCheckInPending: !hasCheckedIn,
    showRecoveryPrompt: stage === "post_training",
    showBedtimeCard: stage === "evening_winddown",
    isRestDaySuccess
  };
}
