/**
 * Sports Nutrition Scientific Constants & Guidelines
 *
 * All values and algorithms are documented with scientific literature citations
 * to allow clinical dietitians and sports physicians to review and configure parameters.
 *
 * Citations:
 * 1. Thomas DT, Erdman KA, Burke LM. American College of Sports Medicine Joint Position Statement:
 *    "Nutrition and Athletic Performance." Med Sci Sports Exerc 2016; 48(3):543-568.
 * 2. Burke LM, Hawley JA, Wong SH, Jeukendrup AE. "Carbohydrates for training and competition."
 *    J Sports Sci 2011; 29(Suppl 1):S17-27.
 * 3. Jeukendrup AE. "A step towards personalized sports nutrition: carbohydrate intake during exercise."
 *    Sports Med 2014; 44(Suppl 1):S25-33.
 * 4. Kerksick CM, et al. "International Society of Sports Nutrition Position Stand: Nutrient Timing."
 *    J Int Soc Sports Nutr 2017; 14:33.
 * 5. Jäger R, et al. "International Society of Sports Nutrition Position Stand: Protein and Exercise."
 *    J Int Soc Sports Nutr 2017; 14:20.
 * 6. Mifflin MD, St Jeor ST, et al. "A new predictive equation for resting energy expenditure in healthy individuals."
 *    Am J Clin Nutr 1990; 51:241-247.
 * 7. Cunningham JJ. "A reanalysis of factors influencing basal metabolic rate in normal adults."
 *    Am J Clin Nutr 1980; 33:2372-2374.
 * 8. Sawka MN, et al. ACSM Position Stand: "Exercise and Fluid Replacement."
 *    Med Sci Sports Exerc 2007; 39(2):377-390.
 * 9. Mountjoy M, et al. "International Olympic Committee (IOC) consensus statement on Relative Energy
 *    Deficiency in Sport (REDs)." Br J Sports Med 2023; 57(17):1073-1097.
 */

import { NutritionDayType, NutritionGoal, ThirdPartyCertification } from "@shared/types/nutrition";

/**
 * Periodized macronutrient targets by Day Type
 * Units: g / kg body mass
 */
export interface MacroDayTypeRule {
  descriptionHu: string;
  descriptionEn: string;
  carbsGramsPerKg: {
    min: number;
    target: number;
    max: number;
  };
  proteinGramsPerKg: {
    min: number;
    target: number;
    max: number;
  };
  fatGramsPerKgMin: number; // Minimum recommended fat intake to preserve endocrine & immune function (ACSM 2016)
  plateRecommendation: {
    carbsPct: number;
    proteinPct: number;
    vegPct: number;
  };
}

export const MACRO_RULES_BY_DAY_TYPE: Record<NutritionDayType, MacroDayTypeRule> = {
  rest: {
    descriptionHu: "Pihenőnap / Regeneráció: alacsonyabb szénhidrát, magas minőségű fehérje az izomzat megőrzéséhez.",
    descriptionEn: "Rest / Recovery Day: lower carbohydrates, high quality protein to support muscle repair.",
    carbsGramsPerKg: { min: 2.0, target: 2.5, max: 3.0 },
    proteinGramsPerKg: { min: 1.6, target: 1.8, max: 2.0 },
    fatGramsPerKgMin: 1.0,
    plateRecommendation: {
      carbsPct: 25, // 1/4 plate
      proteinPct: 25, // 1/4 plate
      vegPct: 50 // 1/2 plate vegetables & greens
    }
  },
  light: {
    descriptionHu: "Könnyű edzésnap (<1 óra könnyű/alacsony intenzitás): mérsékelt szénhidrát, optimális fehérjebevitel.",
    descriptionEn: "Light training day (<1h low intensity): moderate carbs, optimal protein intake.",
    carbsGramsPerKg: { min: 3.0, target: 4.0, max: 5.0 },
    proteinGramsPerKg: { min: 1.6, target: 1.8, max: 2.0 },
    fatGramsPerKgMin: 1.0,
    plateRecommendation: {
      carbsPct: 30,
      proteinPct: 30,
      vegPct: 40
    }
  },
  moderate: {
    descriptionHu: "Mérsékelt edzésnap (~1-2 óra közepes intenzitás vagy erőnlét): emelt glikogén-utánpótlás.",
    descriptionEn: "Moderate training day (~1-2h medium intensity or strength): elevated glycogen replenishment.",
    carbsGramsPerKg: { min: 5.0, target: 6.0, max: 7.0 },
    proteinGramsPerKg: { min: 1.7, target: 1.9, max: 2.2 },
    fatGramsPerKgMin: 0.9,
    plateRecommendation: {
      carbsPct: 40,
      proteinPct: 30,
      vegPct: 30
    }
  },
  hard: {
    descriptionHu: "Nehéz edzésnap (>2 óra magas intenzitás, intervallum vagy 2 edzés): magas szénhidrát a glikogénraktárak fenntartásához.",
    descriptionEn: "Hard training day (>2h high intensity, intervals, or two-a-day): high carbs to sustain glycogen.",
    carbsGramsPerKg: { min: 7.0, target: 8.5, max: 10.0 },
    proteinGramsPerKg: { min: 1.8, target: 2.0, max: 2.4 },
    fatGramsPerKgMin: 0.8,
    plateRecommendation: {
      carbsPct: 50, // 1/2 plate carbohydrates
      proteinPct: 25, // 1/4 plate protein
      vegPct: 25 // 1/4 plate vegetables
    }
  },
  competition: {
    descriptionHu: "Versenynap: maximális szénhidrát-elérhetőség, könnyen emészthető zsírszegény táplálék a gyomor védelmében.",
    descriptionEn: "Competition day: maximized carbohydrate availability, low fat & fiber to prevent GI distress.",
    carbsGramsPerKg: { min: 8.0, target: 10.0, max: 12.0 },
    proteinGramsPerKg: { min: 1.4, target: 1.6, max: 1.8 }, // Kept moderate on race day to avoid GI sluggishness
    fatGramsPerKgMin: 0.7,
    plateRecommendation: {
      carbsPct: 60,
      proteinPct: 25,
      vegPct: 15
    }
  }
};

/**
 * Goal Modifiers for Caloric Balance
 */
export interface GoalConfig {
  calorieMultiplier: number;
  calorieDeltaKcal: number;
  proteinModifierGramsPerKg: number;
  descriptionHu: string;
  descriptionEn: string;
}

export const GOAL_CONFIGS: Record<NutritionGoal, GoalConfig> = {
  maintain: {
    calorieMultiplier: 1.0,
    calorieDeltaKcal: 0,
    proteinModifierGramsPerKg: 0,
    descriptionHu: "Egyensúly fenntartása (0 kcal deficit/többlet)",
    descriptionEn: "Maintenance (energy balance)"
  },
  lose: {
    // Conservative athlete deficit: ~15% or -400 kcal, increasing protein to preserve lean body mass (Helms et al. 2014)
    calorieMultiplier: 0.85,
    calorieDeltaKcal: -400,
    proteinModifierGramsPerKg: +0.3,
    descriptionHu: "Fokozatos szálkásítás / testtömeg-csökkentés az izomtömeg védelmével (-15% deficit, +fehérje)",
    descriptionEn: "Gradual fat loss preserving lean mass (-15% deficit, higher protein)"
  },
  gain: {
    // Lean hypercaloric surplus: +10% or +350 kcal for hypertrophy
    calorieMultiplier: 1.10,
    calorieDeltaKcal: +350,
    proteinModifierGramsPerKg: +0.1,
    descriptionHu: "Izomtömeg-növelés kontrollált kalóriatöbblettel (+10% energiatöbblet)",
    descriptionEn: "Controlled hypercaloric surplus for lean mass accrual (+10%)"
  },
  performance: {
    // Fuelling first: fully covered energy for hard training blocks
    calorieMultiplier: 1.05,
    calorieDeltaKcal: +150,
    proteinModifierGramsPerKg: 0,
    descriptionHu: "Maximális sportteljesítmény és gyors regeneráció prioritása",
    descriptionEn: "Optimized for training adaptation and maximal recovery"
  }
};

/**
 * Baseline Hydration & Electrolytes (Sawka et al. 2007)
 */
export const HYDRATION_CONSTANTS = {
  baselineMlPerKg: 35, // 35 ml per kg body weight baseline daily fluid
  trainingFluidMlPerHour: 600, // 600 ml fluid per hour of baseline training
  heatMultiplier: 1.35, // Hot / humid environment multiplier
  sodiumBaselineMg: 2000,
  sodiumPerHourLongSessionMg: 450, // 450 mg sodium per hour when session > 60 min
  caffeineSafeMaxDailyMg: 400 // EFSA safety limit for healthy adults
};

/**
 * Intra-Workout Carbohydrate Tiers (Jeukendrup 2014)
 */
export interface IntraCarbTier {
  minDurationMinutes: number;
  maxDurationMinutes: number;
  carbsPerHourGrams: number;
  typeRecommendationHu: string;
  typeRecommendationEn: string;
}

export const INTRA_WORKOUT_CARB_TIERS: IntraCarbTier[] = [
  {
    minDurationMinutes: 0,
    maxDurationMinutes: 45,
    carbsPerHourGrams: 0,
    typeRecommendationHu: "Nem szükséges szénhidrátbevitel, elegendő a tiszta víz vagy elektrolitos folyadék.",
    typeRecommendationEn: "No carbohydrate ingestion needed, plain water or electrolytes are sufficient."
  },
  {
    minDurationMinutes: 45,
    maxDurationMinutes: 75,
    carbsPerHourGrams: 30,
    typeRecommendationHu: "Kismértékű szénhidrátbevitel vagy szénhidrátos szájöblítés (mouth rinse) a központi idegrendszer stimulálására.",
    typeRecommendationEn: "Small amounts of carbs or carb mouth-rinsing to stimulate the central nervous system."
  },
  {
    minDurationMinutes: 75,
    maxDurationMinutes: 150,
    carbsPerHourGrams: 60,
    typeRecommendationHu: "30-60 g/óra egyszerű szénhidrát (izotóniás ital, gél, banán). Egyszerű glükóz / maltodextrin bázis.",
    typeRecommendationEn: "30-60 g/hour single-source carbohydrate (isotonic drink, gels, banana). Glucose/maltodextrin based."
  },
  {
    minDurationMinutes: 150,
    maxDurationMinutes: 9999,
    carbsPerHourGrams: 90,
    typeRecommendationHu: "60-90 g/óra többféle transzportert használó szénhidrátkeverék (2:1 maltodextrin/glükóz : fruktóz arány) a maximális bélrendszeri felszívódáshoz.",
    typeRecommendationEn: "60-90 g/hour multiple-transportable carbohydrate mixture (2:1 glucose:fructose ratio) to maximize intestinal absorption."
  }
];

/**
 * Post-Workout Recovery Window Guidelines (ISSN 2017)
 */
export const POST_WORKOUT_GUIDELINES = {
  carbsPerKgRapidRecovery: 1.1, // 1.0 - 1.2 g/kg carbs within 2 hours
  proteinPerKg: 0.35, // 0.3 - 0.4 g/kg high biological value protein (20-35g)
  minLeucineGrams: 2.5, // Leucine trigger threshold for mTOR / muscle protein synthesis
  fluidReplacementPerKgLost: 1.25 // 1.25 - 1.5 liters per kg body mass lost
};

/**
 * Third-Party Anti-Doping Certification Programs
 * Athletes are strictly responsible for everything they ingest under WADA Strict Liability.
 */
export const THIRD_PARTY_CERTS: Record<
  ThirdPartyCertification,
  { labelHu: string; labelEn: string; trusted: boolean; descriptionHu: string }
> = {
  informed_sport: {
    labelHu: "Informed Sport (LGC)",
    labelEn: "Informed Sport (LGC)",
    trusted: true,
    descriptionHu: "Minden egyes gyártási tétel (batch) WADA tiltólistás anyagokra tesztelt ISO 17025 akkreditált laborban."
  },
  koelner_liste: {
    labelHu: "Kölner Liste (Kölni Lista)",
    labelEn: "Cologne List (Kölner Liste)",
    trusted: true,
    descriptionHu: "Német Olimpiai Bizottság által elismert, a Kölni Doppinganalitikai Intézet által auditált bevizsgálási rendszer."
  },
  nsf_sport: {
    labelHu: "NSF Certified for Sport",
    labelEn: "NSF Certified for Sport",
    trusted: true,
    descriptionHu: "Észak-amerikai független laboratóriumi tanúsítvány tiltott szerek és nehézfém-szennyeződések ellen."
  },
  bscg: {
    labelHu: "BSCG Certified Drug Free",
    labelEn: "BSCG Certified Drug Free",
    trusted: true,
    descriptionHu: "Banned Substances Control Group által auditált tételvizsgálat."
  },
  none: {
    labelHu: "Nincs független bevizsgálás",
    labelEn: "No 3rd party certification",
    trusted: false,
    descriptionHu: "FOKOZOTT DOPPINGKOCKÁZAT! A termék nem rendelkezik független tételvizsgálati igazolással."
  }
};

/**
 * Permanent Anti-Doping Legal & Medical Notice (WADA Strict Liability)
 */
export const ANTI_DOPING_NOTICE = {
  titleHu: "DOB- ÉS TÁPLÁLÉKKIEGÉSZÍTŐ FIGYELMEZTETÉS (WADA STRICT LIABILITY)",
  titleEn: "ANTI-DOPING COMPLIANCE WARNING (WADA STRICT LIABILITY)",
  bodyHu:
    "A WADA (Nemzetközi Doppingellenes Ügynökség) 'Objektív felelősség' (Strict Liability) szabálya szerint a sportoló kizárólagosan és személyesen felelős minden olyan tiltott anyagért, amely a mintájában kimutatható. Egyetlen étrend-kiegészítőre sem állítható, hogy 100%-ban garantáltan doppingmentes vagy kockázatmentes. Mindig ellenőrizd a termék összetevőit a hivatalos tiltólistán (HUNADO / WADA), rögzítsd a vásárolt termék tételszámát (batch number), és kizárólag független laboratórium (Informed Sport, Kölner Liste, NSF) által auditált termékeket használj!",
  bodyEn:
    "Under the WADA Strict Liability principle, athletes are personally responsible for any prohibited substance found in their sample. No dietary supplement can be guaranteed 100% risk-free. Always check ingredients against the current prohibited list (HUNADO / WADA), record the batch number of every container, and choose products certified by independent testing authorities (Informed Sport, Cologne List, NSF)."
};

/**
 * Low Energy Availability (LEA / REDs) Detection Thresholds
 * Source: Mountjoy M, et al. IOC Consensus on REDs (2023)
 */
export const LEA_THRESHOLDS = {
  consecutiveDaysTrigger: 3, // 3 consecutive days of significant energy deficit
  severeDeficitPercentage: 0.60, // Intake <60% of periodized target
  clinicalNoticeHu:
    "Megjegyzés: Az elmúlt napokban a rögzített energiabeviteled jelentősen elmaradt a magas edzésterheléshez javasolt energiaszükséglettől. Javasoljuk, hogy egyeztess a sportdietetikusoddal vagy sportorvosoddal az optimális energia-egyensúlyról és a regeneráció támogatásáról. (Ez a jelzés kizárólag tájékoztató jellegű, és nem minősül orvosi diagnózisnak.)",
  clinicalNoticeEn:
    "Notice: Over recent days, your logged energy intake has been substantially below the target required for your training volume. We encourage discussing your energy availability and recovery with your sports dietitian or sports physician. (This indicator is educational only and does not constitute a medical diagnosis.)"
};
