/**
 * LOAD ANALYTICS ENGINE (PURE FUNCTIONS)
 *
 * Implements Bannister, Coggan, and Foster sports science load models:
 * - Session TSS (Power/HR) and Session-RPE (Foster)
 * - Chronic Training Load (CTL / Fitness, 42-day EWMA)
 * - Acute Training Load (ATL / Fatigue, 7-day EWMA)
 * - Training Stress Balance (TSB / Form = CTL - ATL)
 * - Weekly Ramp Rate (dCTL/week)
 * - Acute:Chronic Workload Ratio (ACWR)
 * - Training Monotony & Strain (Foster)
 * - Future load projection for performance management
 */

import {
  PMCDataPoint,
  LoadAnalyticsSummary,
  Competition,
  SeasonPhase
} from "@shared/types/training";

export interface SessionLoadInput {
  durationMinutes: number;
  rpe?: number; // 1-10 (Borg CR10)
  avgPower?: number; // Watts
  normalizedPower?: number; // Watts (NP)
  ftp?: number; // Functional Threshold Power (Watts)
  avgHeartRate?: number; // bpm
  maxHr?: number; // bpm
  restingHr?: number; // bpm
  lthr?: number; // Lactate Threshold Heart Rate (bpm)
  age?: number; // years
  sport?: string;
  sourcePreference?: "hr" | "power" | "rpe" | "auto";
}

export type LoadSourceType = "hr" | "power" | "rpe" | "estimated";

export interface SessionLoadDetailedResult {
  load: number;
  source: LoadSourceType;
  sourceLabelHu: string;
  sourceLabelEn: string;
  isEstimated: boolean;
  needsUserRpe: boolean;
}

/**
 * Calculates session training load with full source priority attribution:
 * Priority:
 * 1. Heart-rate based (TRIMP / hrTSS using athlete's max/threshold HR; if missing, estimated from age)
 * 2. Power-based (Coggan TSS using FTP and NP/avgPower)
 * 3. Session-RPE (Foster: duration x RPE)
 * 4. Duration & sport estimate (with prompt for user RPE)
 *
 * Never allows a stored load of 1 as a hidden default!
 */
export function calculateSessionLoadDetailed(input: SessionLoadInput): SessionLoadDetailedResult {
  const {
    durationMinutes,
    rpe,
    avgPower,
    normalizedPower,
    ftp,
    avgHeartRate,
    maxHr,
    restingHr: _restingHr = 60,
    lthr,
    age,
    sport = "running",
    sourcePreference = "auto"
  } = input;

  if (durationMinutes <= 0) {
    return {
      load: 0,
      source: "estimated",
      sourceLabelHu: "becsült",
      sourceLabelEn: "estimated",
      isEstimated: true,
      needsUserRpe: false
    };
  }

  const durationSeconds = durationMinutes * 60;
  const durationHours = durationMinutes / 60;

  // 1. HEART-RATE BASED (TRIMP / hrTSS)
  const canUseHr = avgHeartRate && avgHeartRate > 35 && avgHeartRate < 240;
  if (canUseHr && (sourcePreference === "auto" || sourcePreference === "hr" || !avgPower)) {
    let effectiveMaxHr = maxHr;
    let isEstimatedMax = false;

    if (!effectiveMaxHr || effectiveMaxHr <= 100) {
      isEstimatedMax = true;
      if (age && age > 10 && age < 100) {
        effectiveMaxHr = Math.round(208 - 0.7 * age);
      } else {
        effectiveMaxHr = 185;
      }
    }

    const effectiveLthr = lthr && lthr > 100 ? lthr : Math.round(effectiveMaxHr * 0.85);

    // hrTSS calculation
    const hrIf = avgHeartRate / effectiveLthr;
    const hrTss = durationHours * Math.pow(hrIf, 2) * 100;

    // Minimum meaningful load for a completed workout is 5 (never 1!)
    const finalLoad = Math.max(5, Math.round(hrTss));

    return {
      load: finalLoad,
      source: "hr",
      sourceLabelHu: isEstimatedMax ? "becsült (pulzus)" : "pulzus alapú",
      sourceLabelEn: isEstimatedMax ? "estimated (HR)" : "heart rate based",
      isEstimated: isEstimatedMax,
      needsUserRpe: false
    };
  }

  // 2. POWER-BASED TSS (Coggan method)
  const power = normalizedPower || avgPower;
  const canUsePower = power && ftp && ftp > 0 && power > 0;
  if (canUsePower && (sourcePreference === "auto" || sourcePreference === "power")) {
    const intensityFactor = power / ftp;
    const tss = ((durationSeconds * power * intensityFactor) / (ftp * 3600)) * 100;
    const finalLoad = Math.max(5, Math.round(tss));

    return {
      load: finalLoad,
      source: "power",
      sourceLabelHu: "watt alapú",
      sourceLabelEn: "power based",
      isEstimated: false,
      needsUserRpe: false
    };
  }

  // 3. FOSTER SESSION-RPE (duration x RPE)
  if (typeof rpe === "number" && !isNaN(rpe)) {
    const clampedRpe = Math.max(1, Math.min(10, rpe));
    const sRpeLoad = Math.max(1, Math.round(durationMinutes * clampedRpe));

    return {
      load: sRpeLoad,
      source: "rpe",
      sourceLabelHu: "RPE alapú",
      sourceLabelEn: "RPE based",
      isEstimated: false,
      needsUserRpe: false
    };
  }

  // 4. SPORT & DURATION ESTIMATE (with prompt for user RPE)
  const sportDefaultRpe: Record<string, number> = {
    running: 6,
    trail_running: 7,
    cycling: 5,
    road_cycling: 5,
    mountain_biking: 6,
    swimming: 6,
    stand_up_paddling: 5,
    rowing: 6,
    kayak: 5,
    canoe: 5,
    hiking: 4,
    walking_hiking: 3,
    strength: 6,
    crossfit: 8,
    triathlon: 7,
    cross_country_skiing: 6
  };

  const defaultRpe = sportDefaultRpe[sport.toLowerCase()] || 5;
  const estimatedLoad = Math.max(5, Math.round(durationMinutes * defaultRpe));

  return {
    load: estimatedLoad,
    source: "estimated",
    sourceLabelHu: "becsült",
    sourceLabelEn: "estimated",
    isEstimated: true,
    needsUserRpe: true
  };
}

/**
 * Calculates session training load (returns numerical load for backward compatibility)
 */
export function calculateSessionLoad(input: SessionLoadInput): number {
  return calculateSessionLoadDetailed(input).load;
}

/**
 * Exponential decay time constants (Bannister impulse-response model)
 */
const TIME_CONSTANT_CTL = 42; // Fitness time decay (days)
const TIME_CONSTANT_ATL = 7; // Fatigue time decay (days)

export const LAMBDA_CTL = 1 - Math.exp(-1 / TIME_CONSTANT_CTL); // ~0.0235
export const LAMBDA_ATL = 1 - Math.exp(-1 / TIME_CONSTANT_ATL); // ~0.1331

/**
 * Computes a multi-day performance management series (CTL, ATL, TSB)
 * with projected future planned workouts
 */
export function calculatePMCSeries(params: {
  historicalDailyLoads: Record<string, number>; // date YYYY-MM-DD -> load
  plannedFutureLoads: Record<string, number>; // date YYYY-MM-DD -> load
  todayStr: string; // YYYY-MM-DD
  daysPast?: number; // Default 42 days history
  daysFuture?: number; // Default 28 days future projection
  competitions?: Competition[];
  phases?: SeasonPhase[];
}): PMCDataPoint[] {
  const {
    historicalDailyLoads,
    plannedFutureLoads,
    todayStr,
    daysPast = 42,
    daysFuture = 28,
    competitions = [],
    phases = []
  } = params;

  const today = new Date(todayStr);
  const totalDays = daysPast + daysFuture + 1;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysPast);

  const series: PMCDataPoint[] = [];

  let currentCtl = 45; // Reasonable default starting seed if no prior data
  let currentAtl = 45;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0] as string;
    const isFuture = dateStr > todayStr;

    // Load source: historical if in past/today, planned if future
    const load = isFuture
      ? plannedFutureLoads[dateStr] || 0
      : historicalDailyLoads[dateStr] || 0;

    // Calculate TSB before today's workout for morning freshness
    const tsb = Math.round(currentCtl - currentAtl);

    // Apply exponential decay updates
    currentCtl = currentCtl + LAMBDA_CTL * (load - currentCtl);
    currentAtl = currentAtl + LAMBDA_ATL * (load - currentAtl);

    // Find if a competition falls on this date
    const race = competitions.find((c) => c.date === dateStr);

    // Find active phase
    const phase = phases.find((p) => dateStr >= p.startDate && dateStr <= p.endDate);

    const monthNames = ["Jan", "Feb", "Már", "Ápr", "Máj", "Jún", "Júl", "Aug", "Szep", "Okt", "Nov", "Dec"];
    const dayLabel = `${monthNames[d.getMonth()]} ${d.getDate()}`;

    series.push({
      date: dateStr,
      dayLabel,
      dayLoad: Math.round(load),
      ctl: Math.round(currentCtl),
      atl: Math.round(currentAtl),
      tsb,
      isProjected: isFuture,
      race,
      phase
    });
  }

  return series;
}

/**
 * Computes load analytics summary (today's CTL/ATL/TSB, ramp rate, ACWR, Foster monotony and strain)
 */
export function calculateLoadSummary(
  historicalDailyLoads: Record<string, number>,
  plannedLoads: Record<string, number>,
  todayStr: string
): LoadAnalyticsSummary {
  const pmc = calculatePMCSeries({
    historicalDailyLoads,
    plannedFutureLoads: plannedLoads,
    todayStr,
    daysPast: 42,
    daysFuture: 7
  });

  const todayPoint = pmc.find((p) => p.date === todayStr) || pmc[pmc.length - 8] || {
    ctl: 50,
    atl: 50,
    tsb: 0
  };

  // 1. Weekly Ramp Rate (CTL today - CTL 7 days ago)
  const sevenDaysAgoDate = new Date(todayStr);
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split("T")[0];
  const sevenDaysAgoPoint = pmc.find((p) => p.date === sevenDaysAgoStr);
  const weeklyRampRate = sevenDaysAgoPoint
    ? +(todayPoint.ctl - sevenDaysAgoPoint.ctl).toFixed(1)
    : 0;

  // 2. Acute & Chronic Loads for ACWR
  // Acute = last 7 days average daily load
  // Chronic = last 28 days average daily load
  const last7DaysLoads: number[] = [];
  const last28DaysLoads: number[] = [];

  for (let i = 0; i < 28; i++) {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0] as string;
    const load = historicalDailyLoads[dateKey] || 0;
    last28DaysLoads.push(load);
    if (i < 7) {
      last7DaysLoads.push(load);
    }
  }

  const last7Sum = last7DaysLoads.reduce((a, b) => a + b, 0);
  const last28Sum = last28DaysLoads.reduce((a, b) => a + b, 0);

  const acuteAvg = last7Sum / 7;
  const chronicAvg = last28Sum / 28;
  const acwr = chronicAvg > 0 ? +(acuteAvg / chronicAvg).toFixed(2) : 1.0;

  // 3. Foster Monotony & Strain (over last 7 days)
  // Mean daily load
  const mean7 = acuteAvg;
  // Standard deviation
  const variance7 =
    last7DaysLoads.reduce((acc, val) => acc + Math.pow(val - mean7, 2), 0) / 7;
  const sd7 = Math.sqrt(variance7);
  // Monotony = Mean / SD (Foster 1998, capped at 4.0)
  const monotony =
    sd7 > 0
      ? Math.min(4.0, +(mean7 / sd7).toFixed(2))
      : mean7 > 0
      ? 4.0
      : 1.0;
  // Strain = Total Load x Monotony
  const strain = Math.round(last7Sum * monotony);

  // 4. Compliance: Planned vs Completed in last 7 days
  let plannedSum7 = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0] as string;
    plannedSum7 += plannedLoads[dateKey] || historicalDailyLoads[dateKey] || 0;
  }
  const weeklyCompliancePercent =
    plannedSum7 > 0 ? Math.min(150, Math.round((last7Sum / plannedSum7) * 100)) : 100;

  return {
    todayCtl: todayPoint.ctl,
    todayAtl: todayPoint.atl,
    todayTsb: todayPoint.tsb,
    weeklyRampRate,
    acwr,
    monotony,
    strain,
    weeklyTotalLoad: Math.round(last7Sum),
    weeklyCompletedHours: +(last7Sum / (60 * 6)).toFixed(1), // Estimated from load
    weeklyCompliancePercent
  };
}

/**
 * Performance management metric explanations in plain Hungarian and English
 */
export const PMC_METRIC_EXPLANATIONS = {
  ctl: {
    abbr: "CTL",
    titleHu: "Fittség (Krónikus Edzésterhelés)",
    titleEn: "Fitness (Chronic Training Load)",
    descHu:
      "Az elmúlt 42 nap exponenciálisan súlyozott terhelési átlaga. Azt mutatja, mekkora edzettségi és fizikai kapacitást építettél fel. Minél magasabb, annál nagyobb állóképességi munkabírásra vagy képes.",
    descEn:
      "42-day exponentially weighted rolling average of daily training load. Represents physiological foundation and endurance capacity."
  },
  atl: {
    abbr: "ATL",
    titleHu: "Fáradtság (Akut Edzésterhelés)",
    titleEn: "Fatigue (Acute Training Load)",
    descHu:
      "Az elmúlt 7 nap terhelési átlaga. Gyorsan reagál a kemény edzésnapokra és pihenőnapokra. Jelzi a szervezetben jelenleg felhalmozódott akut fáradtságot.",
    descEn:
      "7-day exponentially weighted rolling average of daily load. Represents accumulated short-term physiological stress and muscle fatigue."
  },
  tsb: {
    abbr: "TSB",
    titleHu: "Forma (Edzési Stressz Egyensúly)",
    titleEn: "Form (Training Stress Balance)",
    descHu:
      "Képlete: Fittség - Fáradtság (CTL - ATL). Ha pozitív (+5 és +25 között), friss vagy és készen állsz a csúcsteljesítményre (csúcsforma versenyen). Ha negatív (-10 alatt), kimerült vagy az építő edzésektől.",
    descEn:
      "Calculated as Fitness - Fatigue (CTL - ATL). Positive (+5 to +25) indicates race readiness and freshness. Highly negative indicates deep fatigue."
  },
  rampRate: {
    abbr: "Ramp Rate",
    titleHu: "Heti Fittség Növekedési Ütem",
    titleEn: "Weekly Fitness Ramp Rate",
    descHu:
      "A CTL heti emelkedésének mértéke. Az optimális biztonságos tartomány heti +3 és +7 TSS/AU között van. A +8 feletti ugrás megnöveli a túlterhelés és sérülés kockázatát.",
    descEn:
      "Rate of weekly CTL progression. Safe optimal corridor is +3 to +7 TSS/week. >8 increases overtraining and injury risks."
  },
  acwr: {
    abbr: "ACWR",
    titleHu: "Akut : Krónikus Terhelési Arány",
    titleEn: "Acute to Chronic Workload Ratio",
    descHu:
      "A 7 napos akut terhelés aránya a 28 napos krónikus terheléshez. Az optimális 'sweet spot' tartomány 0.8 és 1.3 között van. 1.5 felett hirtelen terhelési ugrás áll fenn.",
    descEn:
      "Ratio of acute (7d) to chronic (28d) training load. The optimal adaptation zone is 0.8 - 1.3. Spikes above 1.5 increase injury hazard."
  },
  monotony: {
    abbr: "Monotony",
    titleHu: "Edzés Monotónia (Foster)",
    titleEn: "Training Monotony (Foster)",
    descHu:
      "Az edzések változatosságát méri a napi terhelések szórása alapján. Ha az érték > 2.0, hiányoznak a könnyű regeneráló napok, ami túledzettséghez vezet.",
    descEn:
      "Measures day-to-day training variability (Mean / SD). Values > 2.0 indicate lack of light recovery days and risk of stagnation."
  }
};
