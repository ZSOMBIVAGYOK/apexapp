/**
 * WEEKLY SUMMARY ("HETI KÖR") & INSIGHT ENGINE
 *
 * Computes 7-day retrospective scores:
 * - Average recovery score
 * - Total strain volume
 * - Average sleep score & duration
 * - Days in target range count (rest day in range counts as success)
 * - Best and hardest days
 * - Plain Hungarian weekly synthesis insight sentence
 */

import { ReadinessBand } from "@shared/lib/readiness";

export interface DayScoreSummary {
  date: string;
  dayNameHu: string;
  recoveryScore?: number;
  recoveryBand?: ReadinessBand;
  strainScore?: number;
  strainTargetLow?: number;
  strainTargetHigh?: number;
  sleepScore?: number;
  sleepDurationMinutes?: number;
}

export interface WeeklyScoreSummary {
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  avgRecoveryScore: number;
  avgRecoveryBand: ReadinessBand;
  totalStrain: number;
  avgDailyStrain: number;
  avgSleepScore: number;
  avgSleepDurationHours: number;
  daysInTargetRange: number; // e.g. 5
  totalDaysEvaluated: number; // e.g. 7
  targetRangeCompliancePercent: number; // e.g. 71%
  bestDay: {
    date: string;
    dayNameHu: string;
    recoveryScore: number;
    reasonHu: string;
  } | null;
  hardestDay: {
    date: string;
    dayNameHu: string;
    strainScore: number;
    reasonHu: string;
  } | null;
  insightSentenceHu: string;
  insightSentenceEn: string;
}

const HU_DAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

/**
 * Evaluates weekly performance and compliance.
 */
export function calculateWeeklyScoreSummary(days: DayScoreSummary[]): WeeklyScoreSummary {
  if (days.length === 0) {
    return {
      startDate: "",
      endDate: "",
      avgRecoveryScore: 0,
      avgRecoveryBand: "amber",
      totalStrain: 0,
      avgDailyStrain: 0,
      avgSleepScore: 0,
      avgSleepDurationHours: 0,
      daysInTargetRange: 0,
      totalDaysEvaluated: 0,
      targetRangeCompliancePercent: 0,
      bestDay: null,
      hardestDay: null,
      insightSentenceHu: "Nincs elegendő rögzített adat a heti szintézishez.",
      insightSentenceEn: "Insufficient data recorded for weekly synthesis."
    };
  }

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const startDate = sorted[0]!.date;
  const endDate = sorted[sorted.length - 1]!.date;

  let recoverySum = 0;
  let recoveryCount = 0;
  let strainSum = 0;
  let sleepScoreSum = 0;
  let sleepDurationSum = 0;
  let sleepCount = 0;
  let daysInTargetCount = 0;

  let bestDayCandidate: { date: string; dayNameHu: string; score: number } | null = null;
  let hardestDayCandidate: { date: string; dayNameHu: string; strain: number } | null = null;

  for (const d of sorted) {
    // Day name
    const dateObj = new Date(d.date);
    const dayName = !isNaN(dateObj.getTime()) ? HU_DAYS[dateObj.getDay()] || d.date : d.date;

    // Recovery
    if (typeof d.recoveryScore === "number" && d.recoveryScore > 0) {
      recoverySum += d.recoveryScore;
      recoveryCount++;
      if (!bestDayCandidate || d.recoveryScore > bestDayCandidate.score) {
        bestDayCandidate = { date: d.date, dayNameHu: dayName, score: d.recoveryScore };
      }
    }

    // Strain
    if (typeof d.strainScore === "number") {
      strainSum += d.strainScore;
      if (!hardestDayCandidate || d.strainScore > hardestDayCandidate.strain) {
        hardestDayCandidate = { date: d.date, dayNameHu: dayName, strain: d.strainScore };
      }

      // Target range check
      const low = d.strainTargetLow ?? 25;
      const high = d.strainTargetHigh ?? 70;
      if (d.strainScore >= low && d.strainScore <= high) {
        daysInTargetCount++;
      }
    }

    // Sleep
    if (typeof d.sleepScore === "number" && d.sleepScore > 0) {
      sleepScoreSum += d.sleepScore;
      sleepDurationSum += d.sleepDurationMinutes || 0;
      sleepCount++;
    }
  }

  const avgRecovery = recoveryCount > 0 ? Math.round(recoverySum / recoveryCount) : 0;
  const avgBand: ReadinessBand =
    avgRecovery >= 67 ? "green" : avgRecovery >= 34 ? "amber" : "red";
  const avgDailyStrain = Math.round((strainSum / sorted.length) * 10) / 10;
  const avgSleepScore = sleepCount > 0 ? Math.round(sleepScoreSum / sleepCount) : 0;
  const avgSleepDurationHours =
    sleepCount > 0 ? Math.round((sleepDurationSum / sleepCount / 60) * 10) / 10 : 0;

  const compliancePercent =
    sorted.length > 0 ? Math.round((daysInTargetCount / sorted.length) * 100) : 0;

  // Insight Sentence
  let insightSentenceHu: string;
  let insightSentenceEn: string;

  if (compliancePercent >= 70 && avgRecovery >= 60) {
    insightSentenceHu =
      "Kiváló heti egyensúly: a terhelés stabilan a célsávban maradt, a regeneráció támogatta az adaptációt.";
    insightSentenceEn =
      "Superb weekly rhythm: strain consistently hit target zones while recovery sustained adaptation.";
  } else if (daysInTargetCount >= 4 && avgRecovery < 45) {
    insightSentenceHu =
      "A terhelési volumen teljesült, de a heti kipihentség csökkent; a következő mikrociklus elején alacsonyabb intenzitás indokolt.";
    insightSentenceEn =
      "Target training volume completed, but autonomic recovery dipped; lower intensity recommended next week.";
  } else if (compliancePercent < 50 && strainSum > 350) {
    insightSentenceHu =
      "A terhelés több napon meghaladta a javasolt sávot; figyelj a fokozott alvásigényre a túlterhelés elkerüléséért.";
    insightSentenceEn =
      "Strain exceeded target ranges on multiple days; prioritize sleep to avoid non-functional overreaching.";
  } else {
    insightSentenceHu =
      "Kiegyensúlyozott edzéshét: a pihenőnapok és edzésnapok aránya biztosította a folyamatos felkészülést.";
    insightSentenceEn =
      "Balanced training week: ratio of training and recovery days maintained progress without acute spikes.";
  }

  return {
    startDate,
    endDate,
    avgRecoveryScore: avgRecovery,
    avgRecoveryBand: avgBand,
    totalStrain: Math.round(strainSum * 10) / 10,
    avgDailyStrain,
    avgSleepScore,
    avgSleepDurationHours,
    daysInTargetRange: daysInTargetCount,
    totalDaysEvaluated: sorted.length,
    targetRangeCompliancePercent: compliancePercent,
    bestDay: bestDayCandidate
      ? {
          date: bestDayCandidate.date,
          dayNameHu: bestDayCandidate.dayNameHu,
          recoveryScore: bestDayCandidate.score,
          reasonHu: "Legmagasabb autonóm regenerációs pontszám"
        }
      : null,
    hardestDay: hardestDayCandidate
      ? {
          date: hardestDayCandidate.date,
          dayNameHu: hardestDayCandidate.dayNameHu,
          strainScore: hardestDayCandidate.strain,
          reasonHu: "A hét legnagyobb kumulatív edzésterhelése"
        }
      : null,
    insightSentenceHu,
    insightSentenceEn
  };
}
