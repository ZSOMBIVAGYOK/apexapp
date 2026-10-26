export interface WeeklyReviewInputs {
  weekStartDate: string;
  currentWeekLoadAu: number;
  previousWeekLoadAu: number;
  averageSleepHours: number;
  sleepTargetHours: number;
  readinessCounts: {
    green: number;
    amber: number;
    red: number;
  };
  nutritionDaysAdherent: number;
  nutritionTotalDays: number;
  workoutsPlanned: number;
  workoutsCompleted: number;
  averageHrvMs: number;
  baselineHrvMs: number;
}

export interface WeeklyReviewOutput {
  loadChangePercent: number;
  isLoadSafe: boolean;
  sleepDebtHours: number;
  compliancePercent: number;
  nutritionAdherencePercent: number;
  readinessGreenPercent: number;
  summaryHu: string;
  summaryEn: string;
  keyHighlightsHu: string[];
  keyHighlightsEn: string[];
}

/**
 * Pure rule-based weekly review generator (no external AI).
 * Evaluates physiological adaptation, training volume progression, sleep debt, and adherence.
 */
export function generateWeeklyReview(inputs: WeeklyReviewInputs): WeeklyReviewOutput {
  const {
    currentWeekLoadAu,
    previousWeekLoadAu,
    averageSleepHours,
    sleepTargetHours,
    readinessCounts,
    nutritionDaysAdherent,
    nutritionTotalDays,
    workoutsPlanned,
    workoutsCompleted,
    averageHrvMs,
    baselineHrvMs
  } = inputs;

  // 1. Load comparison
  const loadChangePercent = previousWeekLoadAu > 0
    ? Math.round(((currentWeekLoadAu - previousWeekLoadAu) / previousWeekLoadAu) * 100)
    : 0;
  const isLoadSafe = loadChangePercent <= 20;

  // 2. Sleep analysis
  const sleepDebtHours = Math.max(
    0,
    +(Math.max(0, sleepTargetHours - averageSleepHours) * 7).toFixed(1)
  );

  // 3. Compliance & Nutrition
  const compliancePercent = workoutsPlanned > 0
    ? Math.round((workoutsCompleted / workoutsPlanned) * 100)
    : 100;
  const nutritionAdherencePercent = nutritionTotalDays > 0
    ? Math.round((nutritionDaysAdherent / nutritionTotalDays) * 100)
    : 100;

  // 4. Readiness breakdown
  const totalDays = readinessCounts.green + readinessCounts.amber + readinessCounts.red || 7;
  const readinessGreenPercent = Math.round((readinessCounts.green / totalDays) * 100);

  // 5. HRV adaptation
  const hrvDiff = averageHrvMs - baselineHrvMs;
  const hrvStatus = hrvDiff >= 0 ? "positive" : hrvDiff >= -5 ? "neutral" : "suppressed";

  // Build rule-based textual narrative
  const summaryHuParts: string[] = [];
  const summaryEnParts: string[] = [];
  const highlightsHu: string[] = [];
  const highlightsEn: string[] = [];

  // Load paragraph
  if (isLoadSafe && loadChangePercent > 0) {
    summaryHuParts.push(
      `A heti összterhelés ${currentWeekLoadAu} AU volt (+${loadChangePercent}% az előző héthez képest), ami a biztonságos adaptációs zónán belül maradt (<20% heti emelkedés).`
    );
    summaryEnParts.push(
      `Total weekly load reached ${currentWeekLoadAu} AU (+${loadChangePercent}% vs prior week), staying within the optimal progressive overload window (<20% ramp).`
    );
    highlightsHu.push(`Kiegyensúlyozott terhelésnövekedés (+${loadChangePercent}%)`);
    highlightsEn.push(`Progressive load adaptation (+${loadChangePercent}%)`);
  } else if (!isLoadSafe) {
    summaryHuParts.push(
      `Figyelem: A heti összterhelés +${loadChangePercent}%-kal növekedett (${currentWeekLoadAu} AU), ami hirtelen terhelésugrást jelent. A következő héten konszolidációs mikrociklus javasolt.`
    );
    summaryEnParts.push(
      `Caution: Weekly training load spiked by +${loadChangePercent}% (${currentWeekLoadAu} AU). A consolidation microcycle is advised next week to mitigate injury risk.`
    );
    highlightsHu.push(`Terhelésugrás észlelve (+${loadChangePercent}%)`);
    highlightsEn.push(`Acute load spike detected (+${loadChangePercent}%)`);
  } else {
    summaryHuParts.push(
      `A heti összterhelés ${currentWeekLoadAu} AU volt (${loadChangePercent}% változás), ami regenerációs vagy szinten tartó mikrociklust jelez.`
    );
    summaryEnParts.push(
      `Weekly training load was ${currentWeekLoadAu} AU (${loadChangePercent}% change), reflecting a planned deload or recovery microcycle.`
    );
    highlightsHu.push(`Szintentartó/regeneráló volumen (${currentWeekLoadAu} AU)`);
    highlightsEn.push(`Maintenance/recovery volume (${currentWeekLoadAu} AU)`);
  }

  // Sleep paragraph
  if (sleepDebtHours <= 1.5) {
    summaryHuParts.push(
      `Az átlagos alvásidő ${averageSleepHours} óra volt éjszakánként, minimális alváshiánnyal (${sleepDebtHours} óra), ami hatékonyan támogatta a celluláris regenerációt.`
    );
    summaryEnParts.push(
      `Average sleep duration was ${averageSleepHours}h/night with minimal sleep debt (${sleepDebtHours}h), effectively facilitating hormonal and cellular recovery.`
    );
    highlightsHu.push(`Kiváló alvásstabilitás (átlag ${averageSleepHours} óra)`);
    highlightsEn.push(`Stable sleep duration (avg ${averageSleepHours}h)`);
  } else {
    summaryHuParts.push(
      `Az alvás átlagosan ${averageSleepHours} óra volt a cél ${sleepTargetHours} órával szemben, összesen ${sleepDebtHours} óra felhalmozott alvásadósságot eredményezve.`
    );
    summaryEnParts.push(
      `Average sleep fell to ${averageSleepHours}h vs ${sleepTargetHours}h target, accumulating ${sleepDebtHours}h of cumulative sleep debt.`
    );
    highlightsHu.push(`Felhalmozott alvásadósság (${sleepDebtHours} óra)`);
    highlightsEn.push(`Accumulated sleep deficit (${sleepDebtHours}h)`);
  }

  // HRV paragraph
  if (hrvStatus === "positive") {
    summaryHuParts.push(
      `Az autonóm idegrendszer kiválóan adaptálódott: a heti átlagos HRV (${averageHrvMs} ms) meghaladta a bázisértéket (+${hrvDiff} ms), stabil paraszimpatikus tónust jelezve.`
    );
    summaryEnParts.push(
      `Autonomic adaptation was strong: weekly average HRV (${averageHrvMs} ms) exceeded your rolling baseline (+${hrvDiff} ms), reflecting robust parasympathetic rebound.`
    );
    highlightsHu.push(`Pozitív HRV adaptáció (+${hrvDiff} ms bázishoz képest)`);
    highlightsEn.push(`Positive HRV rebound (+${hrvDiff} ms vs baseline)`);
  } else {
    summaryHuParts.push(
      `A heti HRV (${averageHrvMs} ms) enyhén elmaradt a személyes bázistól (${baselineHrvMs} ms), ami a kemény kulcsedzések utáni mérsékelt szimpatikus túlsúlyt tükrözi.`
    );
    summaryEnParts.push(
      `Weekly HRV (${averageHrvMs} ms) slightly dipped below baseline (${baselineHrvMs} ms), indicating sympathetic dominance following hard key sessions.`
    );
    highlightsHu.push(`Mérsékelt autonóm fáradtság (${averageHrvMs} ms HRV)`);
    highlightsEn.push(`Mild autonomic fatigue (${averageHrvMs} ms HRV)`);
  }

  // Compliance & Nutrition highlight
  highlightsHu.push(`Edzésterv megfelelés: ${compliancePercent}% (${workoutsCompleted}/${workoutsPlanned} edzés)`);
  highlightsEn.push(`Workout compliance: ${compliancePercent}% (${workoutsCompleted}/${workoutsPlanned} completed)`);

  highlightsHu.push(`Periodizált táplálkozás követése: ${nutritionAdherencePercent}%`);
  highlightsEn.push(`Nutritional macro adherence: ${nutritionAdherencePercent}%`);

  return {
    loadChangePercent,
    isLoadSafe,
    sleepDebtHours,
    compliancePercent,
    nutritionAdherencePercent,
    readinessGreenPercent,
    summaryHu: summaryHuParts.join(" "),
    summaryEn: summaryEnParts.join(" "),
    keyHighlightsHu: highlightsHu,
    keyHighlightsEn: highlightsEn
  };
}
