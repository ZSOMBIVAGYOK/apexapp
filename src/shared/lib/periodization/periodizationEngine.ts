/**
 * PERIODIZATION & TAPERING ENGINE
 *
 * Implements backwards periodization from A-priority competition date
 * based on endurance sports physiology (Bompa, Friel, Mujika & Padilla):
 * - Backward phase timeline calculation (Race, Taper, Peak, Build, Base, Transition)
 * - Tapering volume decay schedule (exponential volume drop, intensity maintained)
 * - Race countdown calculator
 */

import {
  SeasonPhase,
  Competition,
  TaperDayPlan,
  TaperSchedule
} from "@shared/types/training";

export interface BackwardPeriodizationInput {
  aRaceDate: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD (defaults to today or 24 weeks prior to race)
  targetPeakWeeklyHours?: number; // default 10 hours
  phaseLengthsWeeks?: {
    race?: number; // default 1 week
    taper?: number; // default 2 weeks
    peak?: number; // default 2 weeks
    build?: number; // default 6 weeks
    base?: number; // default 8 weeks
    transition?: number; // default 2 weeks (or remaining duration)
  };
}

export interface RaceCountdown {
  daysRemaining: number;
  weeksRemaining: number;
  status: "past" | "today" | "upcoming";
  formattedHu: string;
  formattedEn: string;
}

/**
 * Format Date as YYYY-MM-DD in local time
 */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Adds days to a Date object and returns a new Date
 */
function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Generates backward periodization phases from an A-race target date
 */
export function generateBackwardPeriodization(
  input: BackwardPeriodizationInput
): SeasonPhase[] {
  const { aRaceDate, targetPeakWeeklyHours = 10, phaseLengthsWeeks = {} } = input;

  const raceWeeks = phaseLengthsWeeks.race ?? 1;
  const taperWeeks = phaseLengthsWeeks.taper ?? 2;
  const peakWeeks = phaseLengthsWeeks.peak ?? 2;
  const buildWeeks = phaseLengthsWeeks.build ?? 6;
  const baseWeeks = phaseLengthsWeeks.base ?? 8;
  const transitionWeeks = phaseLengthsWeeks.transition ?? 2;

  const raceDay = new Date(aRaceDate);

  // We walk backward from raceDay:
  // 1. Race phase: ends on raceDay, starts (raceWeeks * 7 - 1) days earlier
  const raceEnd = new Date(raceDay);
  const raceStart = addDays(raceEnd, -(raceWeeks * 7 - 1));

  // 2. Taper phase: ends the day before raceStart
  const taperEnd = addDays(raceStart, -1);
  const taperStart = addDays(taperEnd, -(taperWeeks * 7 - 1));

  // 3. Peak phase: ends the day before taperStart
  const peakEnd = addDays(taperStart, -1);
  const peakStart = addDays(peakEnd, -(peakWeeks * 7 - 1));

  // 4. Build phase: ends the day before peakStart
  const buildEnd = addDays(peakStart, -1);
  const buildStart = addDays(buildEnd, -(buildWeeks * 7 - 1));

  // 5. Base phase: ends the day before buildStart
  const baseEnd = addDays(buildStart, -1);
  const baseStart = addDays(baseEnd, -(baseWeeks * 7 - 1));

  // 6. Transition phase: ends the day before baseStart
  const transEnd = addDays(baseStart, -1);
  const transStart = addDays(transEnd, -(transitionWeeks * 7 - 1));

  const peakMinutes = Math.round(targetPeakWeeklyHours * 60);

  const phases: SeasonPhase[] = [
    {
      id: `phase-transition-${formatDate(transStart)}`,
      name: "Átmeneti időszak (Transition)",
      type: "transition",
      startDate: formatDate(transStart),
      endDate: formatDate(transEnd),
      targetWeeklyVolumeMinutes: Math.round(peakMinutes * 0.4),
      targetWeeklyLoad: Math.round(peakMinutes * 0.4 * 6),
      description:
        "Aktív regeneráció, keresztedzések, mobilitás és mentális felfrissülés a kemény felkészülés megkezdése előtt."
    },
    {
      id: `phase-base-${formatDate(baseStart)}`,
      name: "Alapozó időszak (Base)",
      type: "base",
      startDate: formatDate(baseStart),
      endDate: formatDate(baseEnd),
      targetWeeklyVolumeMinutes: Math.round(peakMinutes * 0.85),
      targetWeeklyLoad: Math.round(peakMinutes * 0.85 * 6.5),
      description:
        "Aerob alapkapacitás felépítése (Z2), mitokondriális sűrűség növelése, izom- és ízületi terhelhetőség megalapozása."
    },
    {
      id: `phase-build-${formatDate(buildStart)}`,
      name: "Formába hozó időszak (Build)",
      type: "build",
      startDate: formatDate(buildStart),
      endDate: formatDate(buildEnd),
      targetWeeklyVolumeMinutes: Math.round(peakMinutes * 0.95),
      targetWeeklyLoad: Math.round(peakMinutes * 0.95 * 7.5),
      description:
        "Laktát-küszöb és VO2max fejlesztése, versenyspecifikus tempó és résztávos ingerek fokozatos növelése."
    },
    {
      id: `phase-peak-${formatDate(peakStart)}`,
      name: "Csúcsforma időszak (Peak)",
      type: "peak",
      startDate: formatDate(peakStart),
      endDate: formatDate(peakEnd),
      targetWeeklyVolumeMinutes: peakMinutes,
      targetWeeklyLoad: Math.round(peakMinutes * 8.0),
      description:
        "A legnagyobb versenyspecifikus terhelés és intenzitás. Szimulációs edzések, táplálkozási stratégia főpróbája."
    },
    {
      id: `phase-taper-${formatDate(taperStart)}`,
      name: "Formaidőzítés (Taper)",
      type: "taper",
      startDate: formatDate(taperStart),
      endDate: formatDate(taperEnd),
      targetWeeklyVolumeMinutes: Math.round(peakMinutes * 0.55),
      targetWeeklyLoad: Math.round(peakMinutes * 0.55 * 7.0),
      description:
        "Fokozatos volumen-csökkentés 40-50%-kal, az intenzitás (versenytempó) megőrzése mellett. Szuperkompenzáció elérése."
    },
    {
      id: `phase-race-${formatDate(raceStart)}`,
      name: "Versenynap / Versenyhét (Race)",
      type: "race",
      startDate: formatDate(raceStart),
      endDate: formatDate(raceEnd),
      targetWeeklyVolumeMinutes: Math.round(peakMinutes * 0.3),
      targetWeeklyLoad: Math.round(peakMinutes * 0.3 * 8.5),
      description:
        "A célverseny hete. Maximális mentális és fizikai frissesség (pozitív TSB), szénhidráttöltés, taktikai felkészülés."
    }
  ];

  return phases;
}

/**
 * Calculates a progressive exponential tapering curve over 14 days
 * based on Mujika & Padilla (2003) recommendations
 */
export function calculateTaperSchedule(
  preTaperWeeklyHours: number,
  taperStartDate: string,
  taperDurationDays: number = 14
): TaperSchedule {
  const preTaperDailyMinutes = (preTaperWeeklyHours * 60) / 7;
  const start = new Date(taperStartDate);
  const days: TaperDayPlan[] = [];

  // Exponential decay model: V(t) = preTaper * (0.45 + 0.50 * exp(-k * t))
  // Results in ~85% on day 1 down to ~35% on day 13 and light shakeout on day 14.
  const decayRate = 0.12;

  for (let i = 0; i < taperDurationDays; i++) {
    const curDate = addDays(start, i);
    const dateStr = formatDate(curDate);
    const daysUntilRace = taperDurationDays - i;

    // Decay ratio from ~0.90 down to ~0.30
    const decayMultiplier = 0.35 + 0.55 * Math.exp(-decayRate * i);
    const volumePercent = Math.round(decayMultiplier * 100);
    const recommendedMinutes = Math.max(15, Math.round(preTaperDailyMinutes * decayMultiplier));

    let guidelinesHu = "Rövid, minőségi inger a versenytempó fenntartására.";
    let guidelinesEn = "Short, high-quality touch to maintain race neuromuscular patterns.";

    if (daysUntilRace > 10) {
      guidelinesHu = "Kezdődik a formaidőzítés: 15-20% volumencsökkentés, de az intenzitást tartsd meg.";
      guidelinesEn = "Taper begins: 15-20% volume drop, but maintain race-pace intensity bursts.";
    } else if (daysUntilRace > 4) {
      guidelinesHu = "Jelentős volumencsökkentés (40-50%). Rövid résztávok versenytempón, sok alvás és pihenés.";
      guidelinesEn = "Significant volume drop (40-50%). Short bursts at race pace, prioritize sleep.";
    } else if (daysUntilRace === 1) {
      guidelinesHu = "Átmozgató nap: 15-20 perc nagyon könnyű mozgás 2-3 rövid 15 mp lendülettel. Szénhidráttöltés.";
      guidelinesEn = "Pre-race shakeout: 15-20 min easy with 2-3 short 15s pickups. Carb-loading.";
    }

    days.push({
      dayIndex: i + 1,
      daysUntilRace,
      date: dateStr,
      volumePercent,
      recommendedMinutes,
      guidelinesHu,
      guidelinesEn
    });
  }

  return {
    preTaperWeeklyHours,
    taperDurationDays,
    totalVolumeReductionPercent: 50,
    days,
    principlesHu: [
      "Volumen csökkentése 40-60%-kal: az edzések időtartama rövidül, nem az intenzitásuk.",
      "Intenzitás megőrzése: végezz rövid, éles ingereket a célversenytempón az izom-ideg kapcsolatok frissítésére.",
      "Gyakoriság fenntartása: heti edzésnapok száma ne csökkenjen 20%-nál többel (a rutin segít az izomtónus megőrzésében).",
      "Alvás és regeneráció maximalizálása: a szervezet ekkor építi újjá a glikogénraktárakat és a mikrosérüléseket."
    ],
    principlesEn: [
      "Reduce volume by 40-60%: shorten session duration while maintaining key quality.",
      "Maintain intensity: perform short, crisp race-pace bursts to maintain neuromuscular sharpness.",
      "Preserve training frequency: keep weekly session frequency within 80% of regular routine.",
      "Maximize sleep and nutrition: allow glycogen supercompensation and tissue repair."
    ]
  };
}

/**
 * Calculates countdown to an A-priority competition
 */
export function calculateRaceCountdown(
  raceDate: string,
  referenceDateStr?: string
): RaceCountdown {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const race = new Date(raceDate);

  // Normalize to start of day
  const refMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const raceMidnight = new Date(race.getFullYear(), race.getMonth(), race.getDate());

  const diffMs = raceMidnight.getTime() - refMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const weeksRemaining = Math.max(0, Math.floor(diffDays / 7));

  if (diffDays < 0) {
    return {
      daysRemaining: 0,
      weeksRemaining: 0,
      status: "past",
      formattedHu: "A verseny lezajlott",
      formattedEn: "Competition completed"
    };
  }

  if (diffDays === 0) {
    return {
      daysRemaining: 0,
      weeksRemaining: 0,
      status: "today",
      formattedHu: "MA VAN A VERSENYNAP!",
      formattedEn: "RACE DAY TODAY!"
    };
  }

  return {
    daysRemaining: diffDays,
    weeksRemaining,
    status: "upcoming",
    formattedHu: `${diffDays} nap van hátra (${weeksRemaining} hét)`,
    formattedEn: `${diffDays} days remaining (${weeksRemaining} weeks)`
  };
}

/**
 * Finds the primary A-race from a list of competitions
 */
export function getPrimaryARace(competitions: Competition[]): Competition | undefined {
  const now = formatDate(new Date());
  // Upcoming A-race with nearest date
  const upcomingARaces = competitions
    .filter((c) => c.priority === "A" && c.date >= now)
    .sort((a, b) => a.date.localeCompare(b.date));

  return upcomingARaces[0] || competitions.find((c) => c.priority === "A");
}
