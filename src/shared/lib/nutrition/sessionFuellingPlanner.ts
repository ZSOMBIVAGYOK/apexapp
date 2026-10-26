/**
 * Session Fuelling Planner
 *
 * Generates evidence-based pre-, during-, and post-workout nutritional strategies
 * based on exercise duration, intensity (RPE), sport discipline, and athlete body weight.
 *
 * Citations:
 * - Jeukendrup AE. Sports Med 2014 (Intra-workout carbohydrate transport tiers)
 * - Thomas DT et al. ACSM Joint Position Stand 2016 (Nutritional timing)
 * - Kerksick CM et al. ISSN Position Stand 2017 (Nutrient timing & recovery)
 */

import { WorkoutFuellingPlan } from "@shared/types/nutrition";
import { INTRA_WORKOUT_CARB_TIERS, POST_WORKOUT_GUIDELINES } from "./nutritionConstants";

export interface PlanSessionFuellingInput {
  workoutId: string;
  title: string;
  sport: string;
  durationMinutes: number;
  intensityRpe: number; // 1-10
  athleteWeightKg: number;
  isHotOrHumid?: boolean;
}

export function planSessionFuelling(input: PlanSessionFuellingInput): WorkoutFuellingPlan {
  const {
    workoutId,
    title,
    sport,
    durationMinutes,
    intensityRpe,
    athleteWeightKg,
    isHotOrHumid = false
  } = input;

  const validWeight = Math.max(35, athleteWeightKg);
  const durationHours = durationMinutes / 60;

  // 1. PRE-SESSION FUELLING (1-3 hours before & 30 min before)
  // Higher intensity or longer duration justifies more proactive pre-fuelling
  const preCarbsGrams = Math.round(
    durationMinutes > 90 || intensityRpe >= 7
      ? validWeight * 1.5 // ~1.5 g/kg
      : validWeight * 1.0 // ~1.0 g/kg
  );
  const preFluidMl = Math.round(validWeight * 6); // 5-7 ml/kg ~ 400-500ml

  const preGuidelines: string[] = [
    `2-3 órával edzés előtt: fogyassz ${preCarbsGrams}g összetett, könnyen emészthető szénhidrátot (pl. zabkása, jázminrizs, banán).`,
    `Fogyassz ~${preFluidMl} ml folyadékot az edzés előtti órákban a megfelelő hidráltsághoz.`,
    "Kerüld a magas zsírtartalmú, rostban gazdag vagy puffasztó ételeket a gyomor-bélrendszeri diszkomfort (GI distress) elkerülése érdekében.",
    intensityRpe >= 8
      ? "Magas intenzitású felkészülés: 30-45 perccel a start előtt 25-30g gyors szénhidrát (gél vagy gyümölcspüré) javasolt."
      : "Könnyű indítás: elegendő a normál étkezési ritmus fenntartása."
  ];

  // 2. DURING-SESSION FUELLING (Hourly carb & hydration tiers)
  let carbsPerHour = 0;
  let intraGuidelineText = "";

  for (const tier of INTRA_WORKOUT_CARB_TIERS) {
    if (
      durationMinutes > tier.minDurationMinutes &&
      durationMinutes <= tier.maxDurationMinutes
    ) {
      carbsPerHour = tier.carbsPerHourGrams;
      intraGuidelineText = tier.typeRecommendationHu;
      break;
    }
  }

  // Adjust for low intensity recovery workouts: if RPE <= 4, carbs/hour can be minimal
  if (intensityRpe <= 4 && durationMinutes <= 75) {
    carbsPerHour = 0;
    intraGuidelineText = "Könnyű regeneráló intenzitás: víz és elektrolitok elégségesek.";
  }

  const totalCarbsGrams = Math.round(carbsPerHour * durationHours);
  const fluidPerHourMl = isHotOrHumid ? 750 : 550;
  const totalFluidMl = Math.round(fluidPerHourMl * durationHours);
  const sodiumPerHourMg = durationMinutes >= 60 || isHotOrHumid ? 450 : 0;
  const totalSodiumMg = Math.round(sodiumPerHourMg * durationHours);

  const duringGuidelines: string[] = [
    intraGuidelineText,
    `Folyadékpótlás: ~${fluidPerHourMl} ml/óra, 15-20 percenként kis kortyokban fogyasztva.`
  ];

  if (sodiumPerHourMg > 0) {
    duringGuidelines.push(
      `Elektrolitok: ~${sodiumPerHourMg} mg nátrium/óra izotóniás italból vagy sótablettából a görcsök és hiponatrémia megelőzésére.`
    );
  }

  if (carbsPerHour >= 60) {
    duringGuidelines.push(
      "60+ g/óra esetén használj többkomponensű szénhidrátot (glükóz : fruktóz 2:1 arányban), hogy a bélrendszeri SGLT1 és GLUT5 transzporterek egyaránt telítődjenek."
    );
  }

  // 3. POST-SESSION RECOVERY FUELLING (0-2 hours window)
  const postCarbsGrams = Math.round(
    validWeight * POST_WORKOUT_GUIDELINES.carbsPerKgRapidRecovery
  );
  const postProteinGrams = Math.round(
    Math.min(40, Math.max(20, validWeight * POST_WORKOUT_GUIDELINES.proteinPerKg))
  );
  const postFluidMl = Math.round(Math.max(500, totalFluidMl * 0.75));

  const postGuidelines: string[] = [
    `Fehérjebevitel: ${postProteinGrams}g minőségi fehérje (~2.5-3g leucinnal) az izomfehérje-szintézis (MPS) maximalizálásához 45-60 percen belül.`,
    `Glikogén-visszatöltés: ${postCarbsGrams}g gyors/közepes szénhidrát a lemerült izom- és májglikogén raktárak regenerációjához.`,
    `Rehidráció: fogyassz ~${postFluidMl} ml vizet vagy regeneráló italt a folyadék- és elektrolit-egyensúly helyreállítására.`
  ];

  return {
    workoutId,
    title,
    sport,
    durationMinutes,
    intensityRpe,
    preSession: {
      timingText: "Edzés előtt (1-3 órával)",
      carbsGrams: preCarbsGrams,
      fluidMl: preFluidMl,
      guidelines: preGuidelines
    },
    duringSession: {
      timingText: "Edzés közben (óránként)",
      carbsPerHourGrams: carbsPerHour,
      totalCarbsGrams,
      fluidPerHourMl,
      totalFluidMl,
      sodiumPerHourMg,
      totalSodiumMg,
      guidelines: duringGuidelines
    },
    postSession: {
      timingText: "Edzés után (0-2 órán belül)",
      carbsGrams: postCarbsGrams,
      proteinGrams: postProteinGrams,
      fluidMl: postFluidMl,
      guidelines: postGuidelines
    }
  };
}
