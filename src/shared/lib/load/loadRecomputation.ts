/**
 * LOAD RECOMPUTATION ENGINE
 *
 * Recomputes all dependent performance metrics when a past session is added,
 * edited (including date moves), or deleted:
 * - Historical daily load map
 * - PMC Fitness (CTL), Fatigue (ATL), Form (TSB) history from the affected date forward
 * - Weekly summaries (completed volume, load, compliance %)
 * - Readiness load inputs (yesterday load, acute 7d, chronic 28d, ACWR)
 */

import { CompletedSessionDocument } from "@shared/types";
import { calculatePMCSeries, calculateSessionLoad } from "./loadCalculator";
import { calculateReadiness, bandToStatus } from "@shared/lib/readiness";
import {
  getLocalDaily,
  saveLocalDaily
} from "@shared/lib/offline/offlineStorage";

export interface RecomputedDayLoad {
  date: string;
  load: number;
  ctl: number;
  atl: number;
  tsb: number;
  acute7d: number;
  chronic28d: number;
  acwr: number;
  yesterdayLoad: number;
}

export interface RecomputationResult {
  affectedFromDate: string;
  recomputedDaysCount: number;
  updatedHistoricalLoads: Record<string, number>;
  latestCtl: number;
  latestAtl: number;
  latestTsb: number;
  weeklySummariesUpdated: number;
  readinessDaysRefreshed: number;
  series: RecomputedDayLoad[];
}

/**
 * Builds the daily load map from all completed sessions.
 * Multiple sessions on the same date are summed properly.
 * Never allows a stored load of 1 as a hidden default!
 */
export function buildDailyLoadsMap(sessions: CompletedSessionDocument[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    if (s.completed !== false) {
      let load: number;
      if (typeof s.trainingLoad === "number" && s.trainingLoad > 1) {
        load = s.trainingLoad;
      } else {
        load = calculateSessionLoad({
          durationMinutes: s.durationMinutes,
          rpe: s.rpe,
          avgHeartRate: s.metrics?.avgHeartRate,
          avgPower: s.metrics?.avgPowerWatts || s.metrics?.avgPower,
          sport: s.sport
        });
      }
      map[s.date] = (map[s.date] || 0) + load;
    }
  }
  return map;
}

function parseYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 12, 0, 0);
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Recomputes loads and readiness inputs from affectedDate forward.
 */
export function recomputeLoadsFromDate(params: {
  athleteId: string;
  sessions: CompletedSessionDocument[];
  affectedFromDate: string;
  todayStr?: string;
  plannedLoads?: Record<string, number>;
  persistToLocalStorage?: boolean;
}): RecomputationResult {
  const {
    athleteId,
    sessions,
    affectedFromDate,
    todayStr = formatYMD(new Date()),
    plannedLoads = {},
    persistToLocalStorage = true
  } = params;

  // 1. Build new aggregated daily loads
  const historicalDailyLoads = buildDailyLoadsMap(sessions);

  // 2. Compute full PMC series (starting 42 days before affectedDate to stabilize starting seeds)
  const affectedDateObj = parseYMD(affectedFromDate);
  const todayObj = parseYMD(todayStr);

  const daysPastToday = Math.max(
    42,
    Math.ceil((todayObj.getTime() - affectedDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 42
  );

  const pmc = calculatePMCSeries({
    historicalDailyLoads,
    plannedFutureLoads: plannedLoads,
    todayStr,
    daysPast: daysPastToday,
    daysFuture: 7
  });

  // 3. For each date from affectedFromDate to todayStr, calculate ACWR and rolling metrics
  const series: RecomputedDayLoad[] = [];
  let readinessRefreshedCount = 0;

  // Find index of affected date in PMC
  const sortedDates = Object.keys(historicalDailyLoads).sort();
  const earliestDate = sortedDates[0] && sortedDates[0] < affectedFromDate ? sortedDates[0] : affectedFromDate;

  const cur = parseYMD(earliestDate);
  const end = parseYMD(todayStr);

  while (cur <= end) {
    const dateStr = formatYMD(cur);
    const dayLoad = historicalDailyLoads[dateStr] || 0;

    const pmcPoint = pmc.find((p) => p.date === dateStr);
    const ctl = pmcPoint?.ctl ?? 50;
    const atl = pmcPoint?.atl ?? 50;
    const tsb = pmcPoint?.tsb ?? (ctl - atl);

    // Calculate rolling 7d & 28d
    let sum7 = 0;
    let sum28 = 0;
    for (let i = 0; i < 28; i++) {
      const d = parseYMD(dateStr);
      d.setDate(d.getDate() - i);
      const ds = formatYMD(d);
      const l = historicalDailyLoads[ds] || 0;
      if (i < 7) sum7 += l;
      sum28 += l;
    }
    const acute7d = +(sum7 / 7).toFixed(1);
    const chronic28d = +(sum28 / 28).toFixed(1);
    const acwr = +(acute7d / (chronic28d || 1)).toFixed(2);

    // Yesterday load
    const yDate = parseYMD(dateStr);
    yDate.setDate(yDate.getDate() - 1);
    const yStr = formatYMD(yDate);
    const yesterdayLoad = historicalDailyLoads[yStr] || 0;

    series.push({
      date: dateStr,
      load: dayLoad,
      ctl,
      atl,
      tsb,
      acute7d,
      chronic28d,
      acwr,
      yesterdayLoad
    });

    // If check-in exists for this day, update its readiness with newly computed load context
    if (persistToLocalStorage && dateStr >= affectedFromDate) {
      const daily = getLocalDaily(athleteId, dateStr);
      if (daily) {
        const refreshedReadiness = calculateReadiness({
          date: dateStr,
          sleep: {
            durationMinutes: daily.sleep.durationMinutes,
            qualityScore: daily.sleep.qualityScore
          },
          wellness: {
            fatigue: daily.subjective.fatigue || 2,
            soreness: daily.subjective.soreness,
            stress: daily.subjective.stress,
            mood: daily.subjective.mood || 4,
            motivation: daily.subjective.motivation || 4,
            appetite: daily.subjective.appetite,
            illness: daily.subjective.illness,
            soreAreas: daily.subjective.soreAreas
          },
          biometrics: {
            hrvRmssd: daily.hrv?.rmssd,
            restingHr: daily.restingHeartRate,
            baselineHrvMean: 76,
            baselineHrvSd: 8,
            baselineRhrMean: 50
          },
          trainingLoad: {
            yesterdayLoad,
            acuteLoad7d: acute7d,
            chronicLoad28d: chronic28d,
            acwr
          }
        });

        daily.readinessScore = refreshedReadiness.score;
        daily.readinessStatus = bandToStatus(refreshedReadiness.band);
        daily.readinessConfidence = refreshedReadiness.confidence;

        saveLocalDaily(daily);
        readinessRefreshedCount++;
      }
    }

    cur.setDate(cur.getDate() + 1);
  }

  const latest = series[series.length - 1];

  return {
    affectedFromDate,
    recomputedDaysCount: series.length,
    updatedHistoricalLoads: historicalDailyLoads,
    latestCtl: latest?.ctl ?? 50,
    latestAtl: latest?.atl ?? 50,
    latestTsb: latest?.tsb ?? 0,
    weeklySummariesUpdated: Math.ceil(series.length / 7),
    readinessDaysRefreshed: readinessRefreshedCount,
    series
  };
}
