/**
 * Low Energy Availability (LEA / REDs) Conservative Alert Detector
 *
 * Implements a non-diagnostic, sensitive safeguard for athletes.
 * When an athlete logs sustained low caloric intake far below targets
 * in the presence of continuous training demands, the system surfaces
 * an educational suggestion to consult their sports dietitian or team physician.
 *
 * Explicitly NOT a medical diagnosis (respecting eating disorder / REDs safety).
 */

import { LowEnergyAvailabilityAlert } from "@shared/types/nutrition";
import { LEA_THRESHOLDS } from "./nutritionConstants";

export interface DayIntakeAndLoad {
  date: string;
  consumedCalories: number;
  targetCalories: number;
  trainingLoadTss?: number;
}

export function detectLowEnergyAvailability(
  recentDays: DayIntakeAndLoad[]
): LowEnergyAvailabilityAlert {
  const defaultResult: LowEnergyAvailabilityAlert = {
    triggered: false,
    consecutiveDays: 0,
    avgIntakeCalories: 0,
    avgDeficitCalories: 0,
    message: "",
    disclaimer: LEA_THRESHOLDS.clinicalNoticeHu
  };

  if (!recentDays || recentDays.length < LEA_THRESHOLDS.consecutiveDaysTrigger) {
    return defaultResult;
  }

  // Sort chronologically ascending
  const sorted = [...recentDays].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Look for a trailing streak of severe deficit days ending on the most recent day
  let streak = 0;
  const severeDays: DayIntakeAndLoad[] = [];

  for (let i = sorted.length - 1; i >= 0; i--) {
    const day = sorted[i]!;
    const deficitRatio = day.consumedCalories / Math.max(1200, day.targetCalories);
    const hasMeaningfulTraining = (day.trainingLoadTss ?? 0) >= 40 || day.targetCalories >= 2400;

    // Severe deficit condition: logged intake <60% of target with active training load,
    // or intake <1400 kcal while training
    if (
      day.consumedCalories > 0 &&
      deficitRatio <= LEA_THRESHOLDS.severeDeficitPercentage &&
      hasMeaningfulTraining
    ) {
      streak++;
      severeDays.push(day);
    } else {
      break; // Streak broken
    }
  }

  if (streak >= LEA_THRESHOLDS.consecutiveDaysTrigger) {
    const totalIntake = severeDays.reduce((acc, d) => acc + d.consumedCalories, 0);
    const totalTarget = severeDays.reduce((acc, d) => acc + d.targetCalories, 0);
    const avgIntake = Math.round(totalIntake / severeDays.length);
    const avgDeficit = Math.round((totalTarget - totalIntake) / severeDays.length);

    return {
      triggered: true,
      consecutiveDays: streak,
      avgIntakeCalories: avgIntake,
      avgDeficitCalories: avgDeficit,
      message: `Az elmúlt ${streak} egymást követő napon a rögzített energiabeviteled átlagosan napi ${avgDeficit} kcal-val maradt el az edzésterheléshez javasolt célodtól.`,
      disclaimer: LEA_THRESHOLDS.clinicalNoticeHu
    };
  }

  return defaultResult;
}
