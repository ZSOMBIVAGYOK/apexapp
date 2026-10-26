/**
 * THRESHOLDS & 5-ZONE CALCULATION ENGINE
 *
 * Implements standard physiological zone models:
 * - Heart Rate: Joe Friel / Seiler 5-zone model from LTHR (or % maxHR fallback)
 * - Power: Coggan 5-zone model from FTP
 * - Running Pace: Jack Daniels / Joe Friel 5-zone model from Threshold Pace (sec/km)
 * - Swimming Pace: Critical Swim Speed (CSS, sec/100m) 5-zone model
 */

import { ZoneDefinition, AthleteTrainingZones } from "@shared/types/training";

export interface AthleteThresholds {
  maxHr?: number; // bpm
  lthr?: number; // Lactate Threshold Heart Rate (bpm)
  ftp?: number; // Functional Threshold Power (Watts)
  thresholdPaceSeconds?: number; // sec/km (e.g. 270 = 4:30/km)
  criticalSwimSpeedSeconds?: number; // sec/100m (e.g. 90 = 1:30/100m)
}

/**
 * Format seconds per km into "M:SS" string (e.g. 270 -> "4:30")
 */
export function formatPaceSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Parse "M:SS" or "MM:SS" string into seconds (e.g. "4:30" -> 270)
 */
export function parsePaceString(paceStr: string): number {
  if (!paceStr || !paceStr.includes(":")) return 0;
  const parts = paceStr.trim().split(":");
  const mins = parseInt(parts[0] ?? "", 10);
  const secs = parseInt(parts[1] ?? "", 10);
  if (isNaN(mins) || isNaN(secs)) return 0;
  return mins * 60 + secs;
}

/**
 * Calculates 5 Heart Rate Zones based on LTHR (or Max HR fallback)
 */
export function calculateDefaultHeartRateZones(
  lthr?: number,
  maxHr?: number
): ZoneDefinition[] {
  // If LTHR is provided, use Joe Friel LTHR percentages
  if (lthr && lthr > 0) {
    return [
      {
        zoneNumber: 1,
        nameHu: "Z1 - Aktív regeneráció",
        nameEn: "Z1 - Active Recovery",
        min: Math.round(lthr * 0.65),
        max: Math.round(lthr * 0.84),
        percentMin: 65,
        percentMax: 84,
        descriptionHu: "Nagyon könnyű regeneráló tempó, tejsav lebontása, beszélgetős iram.",
        descriptionEn: "Easy recovery pace, clears lactate, fully conversational.",
        color: "#9AA1AD" // neutral slate
      },
      {
        zoneNumber: 2,
        nameHu: "Z2 - Aerob alap-állóképesség",
        nameEn: "Z2 - Aerobic Endurance",
        min: Math.round(lthr * 0.85),
        max: Math.round(lthr * 0.89),
        percentMin: 85,
        percentMax: 89,
        descriptionHu: "Mitokondrium- és zsírégető zóna. Hosszú állóképességi edzések alapja.",
        descriptionEn: "Fat oxidation and mitochondrial density foundation.",
        color: "#3D7BFF" // blue
      },
      {
        zoneNumber: 3,
        nameHu: "Z3 - Tempó / Aerob hatékonyság",
        nameEn: "Z3 - Tempo / Aerobic Power",
        min: Math.round(lthr * 0.9),
        max: Math.round(lthr * 0.94),
        percentMin: 90,
        percentMax: 94,
        descriptionHu: "Közepes terhelés, ritmusfutás/bringa, folyamatos kontrollált erőfeszítés.",
        descriptionEn: "Rhythmic endurance, requires continuous controlled focus.",
        color: "#34D399" // green
      },
      {
        zoneNumber: 4,
        nameHu: "Z4 - Laktát-küszöb",
        nameEn: "Z4 - Lactate Threshold",
        min: Math.round(lthr * 0.95),
        max: Math.round(lthr * 1.0),
        percentMin: 95,
        percentMax: 100,
        descriptionHu: "Küszöb-terhelés, 40-60 percig fenntartható maximális intenzitás.",
        descriptionEn: "Lactate accumulation threshold, maximum sustainable ~1h pace.",
        color: "#FBBF24" // amber
      },
      {
        zoneNumber: 5,
        nameHu: "Z5 - VO2max & Anaerob kapacitás",
        nameEn: "Z5 - VO2max & Anaerobic",
        min: Math.round(lthr * 1.01),
        max: maxHr || Math.round(lthr * 1.12),
        percentMin: 101,
        percentMax: 112,
        descriptionHu: "Maximális oxigénfelvétel és sprint zóna, rövid résztávok.",
        descriptionEn: "Maximal oxygen uptake, sharp high-intensity intervals.",
        color: "#F87171" // red
      }
    ];
  }

  // Fallback to Max HR percentage model
  const effectiveMaxHr = maxHr || 185;
  return [
    {
      zoneNumber: 1,
      nameHu: "Z1 - Regeneráció (50-60%)",
      nameEn: "Z1 - Recovery (50-60%)",
      min: Math.round(effectiveMaxHr * 0.5),
      max: Math.round(effectiveMaxHr * 0.6),
      percentMin: 50,
      percentMax: 60,
      descriptionHu: "Könnyű regeneráló mozgás.",
      descriptionEn: "Light recovery exercise.",
      color: "#9AA1AD"
    },
    {
      zoneNumber: 2,
      nameHu: "Z2 - Aerob állóképesség (60-70%)",
      nameEn: "Z2 - Aerobic Base (60-70%)",
      min: Math.round(effectiveMaxHr * 0.6),
      max: Math.round(effectiveMaxHr * 0.7),
      percentMin: 60,
      percentMax: 70,
      descriptionHu: "Alap-állóképesség építése.",
      descriptionEn: "Aerobic base building.",
      color: "#3D7BFF"
    },
    {
      zoneNumber: 3,
      nameHu: "Z3 - Tempó (70-80%)",
      nameEn: "Z3 - Tempo (70-80%)",
      min: Math.round(effectiveMaxHr * 0.7),
      max: Math.round(effectiveMaxHr * 0.8),
      percentMin: 70,
      percentMax: 80,
      descriptionHu: "Közepes állóképességi terhelés.",
      descriptionEn: "Moderate aerobic endurance.",
      color: "#34D399"
    },
    {
      zoneNumber: 4,
      nameHu: "Z4 - Küszöb (80-90%)",
      nameEn: "Z4 - Threshold (80-90%)",
      min: Math.round(effectiveMaxHr * 0.8),
      max: Math.round(effectiveMaxHr * 0.9),
      percentMin: 80,
      percentMax: 90,
      descriptionHu: "Anaerob küszöb zóna.",
      descriptionEn: "Anaerobic threshold zone.",
      color: "#FBBF24"
    },
    {
      zoneNumber: 5,
      nameHu: "Z5 - Maximális terhelés (90-100%)",
      nameEn: "Z5 - Maximum Effort (90-100%)",
      min: Math.round(effectiveMaxHr * 0.9),
      max: effectiveMaxHr,
      percentMin: 90,
      percentMax: 100,
      descriptionHu: "VO2max és anaerob kapacitás.",
      descriptionEn: "VO2max and anaerobic sprint.",
      color: "#F87171"
    }
  ];
}

/**
 * Calculates 5 Power Zones based on Coggan standard (% of FTP)
 */
export function calculateDefaultPowerZones(ftp: number = 250): ZoneDefinition[] {
  const safeFtp = Math.max(50, ftp);
  return [
    {
      zoneNumber: 1,
      nameHu: "Z1 - Aktív regeneráció (<55%)",
      nameEn: "Z1 - Active Recovery (<55%)",
      min: 0,
      max: Math.round(safeFtp * 0.55),
      percentMin: 0,
      percentMax: 55,
      descriptionHu: "Nagyon könnyű pörgetés, vérkeringés fokozása fáradtság nélkül.",
      descriptionEn: "Very easy spinning, promotes blood flow without physiological strain.",
      color: "#9AA1AD"
    },
    {
      zoneNumber: 2,
      nameHu: "Z2 - Állóképesség (56-75%)",
      nameEn: "Z2 - Endurance (56-75%)",
      min: Math.round(safeFtp * 0.56),
      max: Math.round(safeFtp * 0.75),
      percentMin: 56,
      percentMax: 75,
      descriptionHu: "Hosszú tekerések, zsírégetés és mitokondriális adaptáció.",
      descriptionEn: "All-day riding pace, maximizes lipid metabolism.",
      color: "#3D7BFF"
    },
    {
      zoneNumber: 3,
      nameHu: "Z3 - Tempó (76-90%)",
      nameEn: "Z3 - Tempo (76-90%)",
      min: Math.round(safeFtp * 0.76),
      max: Math.round(safeFtp * 0.9),
      percentMin: 76,
      percentMax: 90,
      descriptionHu: "Erőteljes aerob munka, emelkedők egyenletes tempóban.",
      descriptionEn: "Brisk aerobic effort requiring focused pedal stroke.",
      color: "#34D399"
    },
    {
      zoneNumber: 4,
      nameHu: "Z4 - Laktát-küszöb (91-105%)",
      nameEn: "Z4 - Lactate Threshold (91-105%)",
      min: Math.round(safeFtp * 0.91),
      max: Math.round(safeFtp * 1.05),
      percentMin: 91,
      percentMax: 105,
      descriptionHu: "Időfutam és FTP növelő résztávok (10-30 perc).",
      descriptionEn: "Time-trial pace, optimal for lifting FTP.",
      color: "#FBBF24"
    },
    {
      zoneNumber: 5,
      nameHu: "Z5 - VO2max & Anaerob (>105%)",
      nameEn: "Z5 - VO2max & Anaerobic (>105%)",
      min: Math.round(safeFtp * 1.06),
      max: Math.round(safeFtp * 1.5),
      percentMin: 106,
      percentMax: 150,
      descriptionHu: "Rövid, maximális résztávok és sprintek.",
      descriptionEn: "Short hard intervals and sprints.",
      color: "#F87171"
    }
  ];
}

/**
 * Calculates 5 Running Pace Zones based on Threshold Pace (sec/km)
 * Note: Lower seconds/km means faster pace.
 */
export function calculateDefaultPaceZones(
  thresholdPaceSeconds: number = 270 // default 4:30/km
): ZoneDefinition[] {
  const tPace = Math.max(120, thresholdPaceSeconds);

  // In running pace:
  // Z1: 115% - 130% of T-pace (e.g. 5:10 - 5:50/km)
  // Z2: 108% - 114% of T-pace (e.g. 4:51 - 5:07/km)
  // Z3: 103% - 107% of T-pace (e.g. 4:38 - 4:48/km)
  // Z4: 97% - 102% of T-pace (e.g. 4:22 - 4:35/km)
  // Z5: 85% - 96% of T-pace (e.g. 3:50 - 4:19/km)
  const z1Min = Math.round(tPace * 1.15);
  const z1Max = Math.round(tPace * 1.3);

  const z2Min = Math.round(tPace * 1.08);
  const z2Max = Math.round(tPace * 1.14);

  const z3Min = Math.round(tPace * 1.03);
  const z3Max = Math.round(tPace * 1.07);

  const z4Min = Math.round(tPace * 0.97);
  const z4Max = Math.round(tPace * 1.02);

  const z5Min = Math.round(tPace * 0.85);
  const z5Max = Math.round(tPace * 0.96);

  return [
    {
      zoneNumber: 1,
      nameHu: "Z1 - Könnyű regeneráló",
      nameEn: "Z1 - Easy Recovery",
      min: formatPaceSeconds(z1Max),
      max: formatPaceSeconds(z1Min),
      percentMin: 115,
      percentMax: 130,
      descriptionHu: "Nagyon könnyű kocogás, tejsavpucolás.",
      descriptionEn: "Very easy jog, active flush.",
      color: "#9AA1AD"
    },
    {
      zoneNumber: 2,
      nameHu: "Z2 - Alap-állóképesség",
      nameEn: "Z2 - Aerobic Base",
      min: formatPaceSeconds(z2Max),
      max: formatPaceSeconds(z2Min),
      percentMin: 108,
      percentMax: 114,
      descriptionHu: "Hosszú futások zónája, zsírégetés, beszélgetős tempó.",
      descriptionEn: "Long run aerobic building, steady conversation pace.",
      color: "#3D7BFF"
    },
    {
      zoneNumber: 3,
      nameHu: "Z3 - Maratoni / Tempó",
      nameEn: "Z3 - Marathon / Steady Tempo",
      min: formatPaceSeconds(z3Max),
      max: formatPaceSeconds(z3Min),
      percentMin: 103,
      percentMax: 107,
      descriptionHu: "Feszes, egyenletes tempó, félmaratoni/maratoni célritmus.",
      descriptionEn: "Rhythmic tempo, marathon race pace.",
      color: "#34D399"
    },
    {
      zoneNumber: 4,
      nameHu: "Z4 - Laktát-küszöb",
      nameEn: "Z4 - Lactate Threshold",
      min: formatPaceSeconds(z4Max),
      max: formatPaceSeconds(z4Min),
      percentMin: 97,
      percentMax: 102,
      descriptionHu: "10-15 km-es versenytempó, 1 órás maximális fenntartható sebesség.",
      descriptionEn: "10k race pace, 1-hour maximum sustainable speed.",
      color: "#FBBF24"
    },
    {
      zoneNumber: 5,
      nameHu: "Z5 - Intervallum / VO2max",
      nameEn: "Z5 - Interval / VO2max",
      min: formatPaceSeconds(z5Max),
      max: formatPaceSeconds(z5Min),
      percentMin: 85,
      percentMax: 96,
      descriptionHu: "Rövid, dinamikus szakaszok (400-1000m), gyorsulások.",
      descriptionEn: "Short track intervals (400-1000m), repetitions.",
      color: "#F87171"
    }
  ];
}

/**
 * Calculates complete training zone profile for an athlete
 */
export function calculateAllZones(thresholds: AthleteThresholds): AthleteTrainingZones {
  return {
    hrZones: calculateDefaultHeartRateZones(thresholds.lthr, thresholds.maxHr),
    powerZones: calculateDefaultPowerZones(thresholds.ftp || 250),
    paceZones: calculateDefaultPaceZones(thresholds.thresholdPaceSeconds || 270),
    updatedAt: new Date().toISOString()
  };
}
