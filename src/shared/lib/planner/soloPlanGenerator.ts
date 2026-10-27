/**
 * SOLO MODE PERIODIZED PLAN GENERATOR
 *
 * Implements IPlanGenerator interface for generating structured periodized
 * training plans from templates, ready for pluggable AI engine expansion.
 */

import {
  SportType,
  PlannedWorkout,
  SeasonPhase,
  WorkoutBlock
} from "@shared/types/training";
import { generateBackwardPeriodization } from "@shared/lib/periodization/periodizationEngine";

export interface PlanGeneratorInput {
  athleteId: string;
  sport: SportType;
  level: "hobby" | "competitive" | "national" | "olympic";
  goal: string;
  aRaceDate: string; // YYYY-MM-DD
  trainingDaysPerWeek: number; // 3 to 6
  trainingDays?: number[]; // [1..7] where 1 is Monday
  weeklyAvailableHours: number; // e.g. 5 to 20
  startDate?: string; // YYYY-MM-DD
}

export interface GeneratedSeasonPlan {
  planId: string;
  sport: SportType;
  athleteId: string;
  phases: SeasonPhase[];
  workouts: PlannedWorkout[];
  weeklyWorkoutsCount: number;
  totalWorkoutsCount: number;
  createdAt: string;
  generatorType: "rule_based" | "ai_planner";
}

export interface IPlanGenerator {
  generatePlan(input: PlanGeneratorInput): GeneratedSeasonPlan;
}

/**
 * Format Date as YYYY-MM-DD
 */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Adds days to a Date
 */
function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

/**
 * Template workout block generator based on phase and workout intent
 */
function createWorkoutBlocks(
  _sport: SportType,
  phaseType: SeasonPhase["type"],
  intent: "endurance" | "intervals" | "tempo" | "recovery" | "race",
  durationMinutes: number
): WorkoutBlock[] {
  if (intent === "recovery") {
    return [
      {
        id: "b-1",
        name: "Aktív regeneráló melegítés",
        type: "warmup",
        durationMinutes: 10,
        targetType: "rpe",
        targetRpe: 3,
        description: "Nagyon könnyű laza átmozgatás, légzés és pulzus normalizálása."
      },
      {
        id: "b-2",
        name: "Z1-Z2 regeneráló mozgás",
        type: "main",
        durationMinutes: durationMinutes - 15,
        targetType: "hr_zone",
        targetZone: 1,
        description: "Folyamatos beszélgetős tempó, nulla feszültség."
      },
      {
        id: "b-3",
        name: "Levezetés és nyújtás",
        type: "cooldown",
        durationMinutes: 5,
        targetType: "rpe",
        targetRpe: 2,
        description: "Légzés lenyugtatása, levezetés."
      }
    ];
  }

  if (intent === "intervals") {
    const warmupMin = 15;
    const cooldownMin = 15;
    const mainMin = durationMinutes - (warmupMin + cooldownMin);
    const repeatDuration = phaseType === "build" ? 4 : 2; // mins
    const restDuration = 2; // mins
    const repeatReps = Math.max(3, Math.floor(mainMin / (repeatDuration + restDuration)));

    return [
      {
        id: "b-1",
        name: "Bemelegítés és progresszív fokozók",
        type: "warmup",
        durationMinutes: warmupMin,
        targetType: "hr_zone",
        targetZone: 2,
        description: "Fokozatos felépítés Z2-ig, a végén 3x15 mp dinamikus repülő."
      },
      {
        id: "b-2",
        name: `${repeatReps}x${repeatDuration} perc VO2max / Küszöb inger`,
        type: "interval",
        durationMinutes: repeatDuration,
        targetType: "rpe",
        targetRpe: 8,
        targetZone: 5,
        repeats: repeatReps,
        restDurationMinutes: restDuration,
        description: "Éles, kontrollált intenzitás egyenletes tempóban."
      },
      {
        id: "b-3",
        name: "Levezetés Z1",
        type: "cooldown",
        durationMinutes: cooldownMin,
        targetType: "hr_zone",
        targetZone: 1,
        description: "Nagyon könnyű kocogás/pörgetés a laktát kiürítésére."
      }
    ];
  }

  if (intent === "tempo") {
    const warmupMin = 15;
    const cooldownMin = 10;
    const mainMin = durationMinutes - (warmupMin + cooldownMin);

    return [
      {
        id: "b-1",
        name: "Bemelegítés Z1-Z2",
        type: "warmup",
        durationMinutes: warmupMin,
        targetType: "hr_zone",
        targetZone: 2,
        description: "Aerob felkészítés."
      },
      {
        id: "b-2",
        name: "Egyenletes küszöb/tempó blokk",
        type: "main",
        durationMinutes: mainMin,
        targetType: "rpe",
        targetRpe: 7,
        targetZone: 3,
        description: "Koncentrált tempó, félmaratoni/maratoni ritmusban."
      },
      {
        id: "b-3",
        name: "Levezetés",
        type: "cooldown",
        durationMinutes: cooldownMin,
        targetType: "rpe",
        targetRpe: 2,
        description: "Könnyű regeneráló levezetés."
      }
    ];
  }

  // Default: Endurance (Long steady)
  return [
    {
      id: "b-1",
      name: "Fokozatos felmelegedés",
      type: "warmup",
      durationMinutes: 10,
      targetType: "hr_zone",
      targetZone: 2,
      description: "Laza bevezető tempó."
    },
    {
      id: "b-2",
      name: "Z2 Aerob alap-állóképesség",
      type: "main",
      durationMinutes: durationMinutes - 20,
      targetType: "hr_zone",
      targetZone: 2,
      description: "Egyenletes zsírégető pulzuszóna, frissítés 20 percenként."
    },
    {
      id: "b-3",
      name: "Levezetés",
      type: "cooldown",
      durationMinutes: 10,
      targetType: "rpe",
      targetRpe: 2,
      description: "Pulzus megnyugtatása."
    }
  ];
}

/**
 * Rule-based periodized plan generator
 */
export class RuleBasedPlanGenerator implements IPlanGenerator {
  public generatePlan(input: PlanGeneratorInput): GeneratedSeasonPlan {
    const {
      athleteId,
      sport,
      level,
      goal,
      aRaceDate,
      trainingDaysPerWeek,
      trainingDays,
      weeklyAvailableHours,
      startDate
    } = input;

    // 1. Generate periodization phases
    const phases = generateBackwardPeriodization({
      aRaceDate,
      startDate,
      targetPeakWeeklyHours: weeklyAvailableHours
    });

    const workouts: PlannedWorkout[] = [];
    const planId = `plan-${athleteId}-${Date.now()}`;
    const author = {
      id: "apex-solo-engine",
      name: "Apex Solo Generator",
      role: "solo_generator" as const
    };

    // Calculate daily workout template mapping for days of the week:
    // If explicit trainingDays array is provided (1=Mon ... 7=Sun), map to 0-based week offsets (d - 1)
    const effectiveDaysCount =
      trainingDays && trainingDays.length > 0 ? trainingDays.length : trainingDaysPerWeek;
    const dayIndices =
      trainingDays && trainingDays.length > 0
        ? trainingDays.map((d) => d - 1)
        : this.selectTrainingDayIndices(trainingDaysPerWeek);

    // Populate workouts for each phase
    phases.forEach((phase) => {
      const pStart = new Date(phase.startDate);
      const pEnd = new Date(phase.endDate);
      const phaseDays = Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const weeksInPhase = Math.max(1, Math.round(phaseDays / 7));

      for (let w = 0; w < weeksInPhase; w++) {
        const weekStartDate = addDays(pStart, w * 7);

        dayIndices.forEach((dayOffset, idx) => {
          const workoutDate = addDays(weekStartDate, dayOffset);
          if (workoutDate > pEnd) return;
          const dateStr = formatDate(workoutDate);

          // Assign workout type and duration based on phase and session index
          const { title, intent, durationMin, plannedLoad } = this.determineSessionProfile(
            phase.type,
            idx,
            effectiveDaysCount,
            phase.targetWeeklyVolumeMinutes
          );

          // If this is the actual race day
          const isRaceDay = dateStr === aRaceDate;
          const sessionTitle = isRaceDay ? `CÉLVERSENY: ${goal || "A-Verseny"}` : title;
          const sessionIntent = isRaceDay ? "race" : intent;

          const blocks = createWorkoutBlocks(sport, phase.type, sessionIntent, durationMin);

          workouts.push({
            id: `wo-${planId}-${dateStr}-${idx}`,
            athleteId,
            author,
            title: sessionTitle,
            sport,
            date: dateStr,
            plannedDurationMinutes: durationMin,
            plannedLoad,
            status: "scheduled",
            blocks,
            notes: `Fázis: ${phase.name}. Szint: ${level}. Cél: ${phase.description}`
          });
        });
      }
    });

    return {
      planId,
      sport,
      athleteId,
      phases,
      workouts,
      weeklyWorkoutsCount: trainingDaysPerWeek,
      totalWorkoutsCount: workouts.length,
      createdAt: new Date().toISOString(),
      generatorType: "rule_based"
    };
  }

  private selectTrainingDayIndices(daysPerWeek: number): number[] {
    switch (daysPerWeek) {
      case 3:
        return [1, 3, 5]; // Tue, Thu, Sat
      case 4:
        return [1, 3, 5, 6]; // Tue, Thu, Sat, Sun
      case 5:
        return [1, 2, 4, 5, 6]; // Tue, Wed, Fri, Sat, Sun
      case 6:
        return [1, 2, 3, 4, 5, 6]; // Mon-Sat
      default:
        return [1, 3, 5];
    }
  }

  private determineSessionProfile(
    phaseType: SeasonPhase["type"],
    sessionIndex: number,
    totalDaysPerWeek: number,
    weeklyVolumeMinutes: number
  ): {
    title: string;
    intent: "endurance" | "intervals" | "tempo" | "recovery" | "race";
    durationMin: number;
    plannedLoad: number;
  } {
    const avgDuration = Math.round(weeklyVolumeMinutes / totalDaysPerWeek);

    if (phaseType === "taper") {
      if (sessionIndex === 0) {
        return {
          title: "Formaidőzítő élesítés (rövid tempó)",
          intent: "intervals",
          durationMin: Math.round(avgDuration * 0.8),
          plannedLoad: 45
        };
      }
      return {
        title: "Könnyű regeneráló átmozgatás",
        intent: "recovery",
        durationMin: Math.round(avgDuration * 0.6),
        plannedLoad: 25
      };
    }

    if (phaseType === "base") {
      if (sessionIndex === totalDaysPerWeek - 1) {
        // Last session is long run/ride
        return {
          title: "Hosszú Z2 állóképességi edzés",
          intent: "endurance",
          durationMin: Math.round(avgDuration * 1.5),
          plannedLoad: 90
        };
      }
      if (sessionIndex === 0) {
        return {
          title: "Progresszív aerob ritmusfutás",
          intent: "tempo",
          durationMin: avgDuration,
          plannedLoad: 65
        };
      }
      return {
        title: "Alapozó Z2 állóképesség",
        intent: "endurance",
        durationMin: avgDuration,
        plannedLoad: 50
      };
    }

    if (phaseType === "build" || phaseType === "peak") {
      if (sessionIndex === 0) {
        return {
          title: "VO2max / Küszöb résztávos edzés",
          intent: "intervals",
          durationMin: Math.round(avgDuration * 1.1),
          plannedLoad: 85
        };
      }
      if (sessionIndex === 1) {
        return {
          title: "Z4 Küszöb tempóblokk",
          intent: "tempo",
          durationMin: avgDuration,
          plannedLoad: 75
        };
      }
      if (sessionIndex === totalDaysPerWeek - 1) {
        return {
          title: "Hosszú specifikus állóképesség",
          intent: "endurance",
          durationMin: Math.round(avgDuration * 1.4),
          plannedLoad: 95
        };
      }
      return {
        title: "Könnyű regeneráló edzés Z1",
        intent: "recovery",
        durationMin: Math.round(avgDuration * 0.7),
        plannedLoad: 35
      };
    }

    // Default
    return {
      title: "Általános állóképességi edzés",
      intent: "endurance",
      durationMin: avgDuration,
      plannedLoad: 50
    };
  }
}

/**
 * Singleton instance of rule based plan generator
 */
export const soloPlanGenerator = new RuleBasedPlanGenerator();
