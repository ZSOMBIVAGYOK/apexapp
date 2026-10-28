/**
 * CENTRAL SPORT & SUB-SPORT MAPPING TABLE
 *
 * Implements complete, official ANT+ / Garmin FIT SDK Sport and SubSport enumeration,
 * plus TCX Activity Sport and GPX Track Point Extension / Type mappings.
 *
 * Single source of truth for sports detection across file imports, device adapters, and prefill.
 */

import { SPORT_CATALOG } from "./catalog";
import { getSportById } from "./index";

export interface SportMappingResult {
  sportId: string; // Matches SportDefinition.id in SPORT_CATALOG
  sportNameHu: string;
  sportNameEn: string;
  icon: string;
  isAmbiguous: boolean;
  detectedRaw: string;
  confidence: number; // 0.0 - 1.0
  suggestedAlternatives: string[]; // List of alternative sport IDs for the picker
}

/**
 * Official FIT Protocol Profile: Sport Enum
 */
export const FIT_SPORT = {
  generic: 0,
  running: 1,
  cycling: 2,
  transition: 3,
  fitness_equipment: 4,
  swimming: 5,
  basketball: 6,
  soccer: 7,
  tennis: 8,
  american_football: 9,
  training: 10,
  walking: 11,
  cross_country_skiing: 12,
  alpine_skiing: 13,
  snowboarding: 14,
  rowing: 15,
  mountaineering: 16,
  hiking: 17,
  multisport: 18,
  paddling: 19,
  flying: 20,
  e_biking: 21,
  motorcycling: 22,
  boating: 23,
  driving: 24,
  golf: 25,
  hang_gliding: 26,
  horseback_riding: 27,
  hunting: 28,
  fishing: 29,
  inline_skating: 30,
  rock_climbing: 31,
  sailing: 32,
  ice_skating: 33,
  sky_diving: 34,
  snowshoeing: 35,
  snowmobiling: 36,
  stand_up_paddleboarding: 37,
  surfing: 38,
  wakeboarding: 39,
  water_skiing: 40,
  kayaking: 41,
  rafting: 42,
  windsurfing: 43,
  kitesurfing: 44,
  tactical: 45,
  jump_rope: 46,
  boxing: 47,
  floor_climbing: 48,
  diving: 53,
  hiit: 62,
  racket: 64,
  wheelchair: 65,
  water_polo: 67,
  cricket: 69,
  rugby: 71,
  hockey: 76,
  lacrosse: 77,
  martial_arts: 80
} as const;

/**
 * Official FIT Protocol Profile: SubSport Enum
 */
export const FIT_SUB_SPORT = {
  generic: 0,
  treadmill: 1,
  street: 2,
  trail: 3,
  track: 4,
  spin: 5,
  indoor_cycling: 6,
  road: 7,
  mountain: 8,
  downhill: 9,
  recumbent: 10,
  cyclocross: 11,
  hand_cycling: 12,
  track_cycling: 13,
  indoor_rowing: 14,
  elliptical: 15,
  stair_climbing: 16,
  lap_swimming: 17,
  open_water: 18,
  flexibility: 19,
  strength_training: 20,
  warm_up: 21,
  match: 22,
  exercise: 23,
  challenge: 24,
  indoor_skiing: 25,
  cardio_training: 26,
  indoor_walking: 27,
  e_bike_mountain: 28,
  gravel_cycling: 29,
  casual_walking: 30,
  speed_walking: 31,
  bouldering: 45,
  whitewater: 47,
  backcountry: 48,
  yoga: 53,
  pilates: 54,
  hiit: 62,
  roller_skiing: 65,
  gravel: 84,
  virtual_activity: 85
} as const;

/**
 * Normalizes input string for fuzzy comparison
 */
function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Validates if multisport segments constitute a real triathlon (swim + bike + run)
 */
export function isMultisportTriathlon(
  segments?: Array<{ sport?: number; subSport?: number }>
): boolean {
  if (!segments || segments.length === 0) return false;
  const sportsPresent = new Set<number>();
  segments.forEach((s) => {
    if (typeof s.sport === "number") sportsPresent.add(s.sport);
  });
  const hasSwim = sportsPresent.has(FIT_SPORT.swimming);
  const hasBike = sportsPresent.has(FIT_SPORT.cycling) || sportsPresent.has(FIT_SPORT.e_biking);
  const hasRun = sportsPresent.has(FIT_SPORT.running) || sportsPresent.has(FIT_SPORT.walking);
  return hasSwim && hasBike && hasRun;
}

/**
 * Maps raw FIT sport and sub_sport codes to Apex catalog sport.
 *
 * For multisport files, sessionSports allows checking if all 3 triathlon segments exist.
 */
export function mapFitSport(
  sportId?: number,
  subSportId?: number,
  sessionSports?: Array<{ sport?: number; subSport?: number }>
): SportMappingResult {
  const rawDesc = `FIT(sport=${sportId ?? "none"}, subsport=${subSportId ?? "none"})`;

  // Default fallback if unspecified
  if (sportId === undefined || sportId === null) {
    return createResult("running", rawDesc, true, 0.4, ["running", "cycling", "stand_up_paddling"]);
  }

  // 1. Multisport handling (ONLY triathlon if real swim+bike+run segments are present)
  if (sportId === FIT_SPORT.multisport || (sessionSports && sessionSports.length > 1)) {
    if (isMultisportTriathlon(sessionSports)) {
      return createResult("triathlon", "Multisport (Triathlon Segments)", false, 1.0);
    }

    const sportsPresent = new Set<number>();
    if (sessionSports && sessionSports.length > 0) {
      sessionSports.forEach((s) => {
        if (typeof s.sport === "number") sportsPresent.add(s.sport);
      });
    }
    const hasSwim = sportsPresent.has(FIT_SPORT.swimming);
    const hasBike = sportsPresent.has(FIT_SPORT.cycling) || sportsPresent.has(FIT_SPORT.e_biking);
    const hasRun = sportsPresent.has(FIT_SPORT.running) || sportsPresent.has(FIT_SPORT.walking);

    if (hasRun && hasBike && !hasSwim) {
      return createResult("duathlon", "Multisport (Duathlon Segments)", false, 0.95);
    }
    if (hasSwim && hasRun && !hasBike) {
      return createResult("aquathlon", "Multisport (Aquathlon Segments)", false, 0.95);
    }
    // Generic multisport with non-standard segments: never default silently to triathlon!
    return createResult("running", rawDesc, true, 0.4, ["running", "cycling", "triathlon"]);
  }

  // 2. Specific FIT Sport mappings
  switch (sportId) {
    // STAND UP PADDLEBOARDING (SUP) - Official FIT sport 37
    case FIT_SPORT.stand_up_paddleboarding:
      return createResult("stand_up_paddling", "Stand Up Paddleboarding (SUP)", false, 1.0);

    // KAYAKING
    case FIT_SPORT.kayaking:
      return createResult("kayak", "Kayaking", false, 1.0);

    // RAFTING
    case FIT_SPORT.rafting:
      return createResult("rafting", "Whitewater Rafting", false, 1.0);

    // WINDSURFING
    case FIT_SPORT.windsurfing:
      return createResult("windsurfing", "Windsurfing", false, 1.0);

    // KITESURFING
    case FIT_SPORT.kitesurfing:
      return createResult("kitesurfing", "Kitesurfing", false, 1.0);

    // SURFING
    case FIT_SPORT.surfing:
      return createResult("surfing", "Surfing", false, 1.0);

    // SAILING / BOATING
    case FIT_SPORT.sailing:
    case FIT_SPORT.boating:
      return createResult("sailing", "Sailing", false, 0.95);

    // ROWING
    case FIT_SPORT.rowing:
      if (subSportId === FIT_SUB_SPORT.indoor_rowing) {
        return createResult("rowing_ergometer", "Indoor Rowing", false, 1.0);
      }
      return createResult("rowing", "Rowing", false, 1.0);

    // PADDLING (Generic Canoe / Kayak / Rafting)
    case FIT_SPORT.paddling:
      if (subSportId === FIT_SUB_SPORT.whitewater || subSportId === 20 || subSportId === 47) {
        return createResult("rafting", "Paddling (Whitewater)", false, 1.0);
      }
      if (subSportId === 19) {
        return createResult("canoe", "Paddling (Canoe)", false, 1.0);
      }
      return createResult("kayak", "Paddling (Kayak)", false, 1.0, ["kayak", "canoe", "stand_up_paddling"]);

    // RUNNING
    case FIT_SPORT.running:
      if (subSportId === FIT_SUB_SPORT.trail) {
        return createResult("trail_running", "Trail Running", false, 1.0);
      }
      if (subSportId === FIT_SUB_SPORT.track) {
        return createResult("track_athletics", "Track Athletics", false, 1.0);
      }
      return createResult("running", "Running", false, 1.0);

    // CYCLING
    case FIT_SPORT.cycling:
    case FIT_SPORT.e_biking:
      if (subSportId === FIT_SUB_SPORT.mountain || subSportId === FIT_SUB_SPORT.downhill || subSportId === FIT_SUB_SPORT.e_bike_mountain) {
        return createResult("mountain_biking", "Mountain Biking (MTB)", false, 1.0);
      }
      if (subSportId === FIT_SUB_SPORT.gravel || subSportId === FIT_SUB_SPORT.gravel_cycling || subSportId === FIT_SUB_SPORT.cyclocross) {
        return createResult("gravel_cycling", "Gravel Cycling", false, 1.0);
      }
      return createResult("road_cycling", "Road Cycling", false, 1.0);

    // SWIMMING
    case FIT_SPORT.swimming:
      if (subSportId === FIT_SUB_SPORT.open_water) {
        return createResult("open_water_swimming", "Open Water Swimming", false, 1.0);
      }
      return createResult("swimming", "Swimming", false, 1.0);

    // WALKING / HIKING
    case FIT_SPORT.walking:
      return createResult("walking_hiking", "Walking", false, 0.95, ["walking_hiking", "hiking"]);

    case FIT_SPORT.hiking:
      return createResult("hiking", "Hiking", false, 1.0);

    case FIT_SPORT.mountaineering:
      return createResult("hiking", "Mountaineering", false, 0.9, ["hiking", "rock_climbing"]);

    case FIT_SPORT.rock_climbing:
      return createResult("climbing_bouldering", "Rock Climbing", false, 1.0);

    // SKIING & WINTER SPORTS
    case FIT_SPORT.alpine_skiing:
      if (subSportId === 37 || subSportId === 48 || subSportId === FIT_SUB_SPORT.backcountry) {
        return createResult("ski_touring", "Ski Touring", false, 1.0);
      }
      return createResult("alpine_skiing", "Alpine Skiing", false, 1.0);

    case FIT_SPORT.cross_country_skiing:
      if (subSportId === 38 || subSportId === 65 || subSportId === FIT_SUB_SPORT.roller_skiing) {
        return createResult("roller_skiing", "Roller Skiing", false, 1.0);
      }
      return createResult("cross_country_skiing", "Cross-Country Skiing", false, 1.0);

    case FIT_SPORT.snowboarding:
      return createResult("snowboarding", "Snowboarding", false, 1.0);

    case FIT_SPORT.ice_skating:
      return createResult("speed_skating", "Ice Skating", false, 0.95);

    case FIT_SPORT.inline_skating:
      return createResult("inline_skating", "Inline Skating", false, 1.0);

    // TRAINING / STRENGTH / FITNESS EQUIPMENT
    case FIT_SPORT.training:
    case FIT_SPORT.fitness_equipment:
      if (subSportId === FIT_SUB_SPORT.yoga) {
        return createResult("yoga", "Yoga", false, 1.0);
      }
      if (subSportId === FIT_SUB_SPORT.pilates) {
        return createResult("pilates", "Pilates", false, 1.0);
      }
      if (subSportId === FIT_SUB_SPORT.strength_training) {
        return createResult("strength", "Strength Training", false, 1.0);
      }
      if (subSportId === FIT_SUB_SPORT.cardio_training || subSportId === FIT_SUB_SPORT.hiit) {
        return createResult("functional_fitness", "Cardio / HIIT", false, 0.9);
      }
      return createResult("strength", "Training / Strength", false, 0.9, ["strength", "functional_fitness", "crossfit"]);

    case FIT_SPORT.boxing:
      return createResult("boxing", "Boxing", false, 1.0);

    case FIT_SPORT.tennis:
      return createResult("tennis", "Tennis", false, 1.0);

    case FIT_SPORT.soccer:
      return createResult("football", "Soccer", false, 1.0);

    case FIT_SPORT.basketball:
      return createResult("basketball", "Basketball", false, 1.0);

    case FIT_SPORT.golf:
      return createResult("golf", "Golf", false, 1.0);

    // GENERIC / OTHER
    case FIT_SPORT.generic:
    default:
      return createResult("running", rawDesc, true, 0.3, ["running", "road_cycling", "stand_up_paddling", "strength"]);
  }
}

/**
 * Maps raw textual activity type or sport name (from GPX <type>, TCX <Activity Sport="...">, Strava, Apple)
 * to standard catalog sport.
 */
export function mapActivityNameToSport(rawName?: string): SportMappingResult {
  if (!rawName || !rawName.trim()) {
    return createResult("running", "Ismeretlen", true, 0.3, ["running", "road_cycling", "stand_up_paddling", "strength"]);
  }

  const clean = rawName.trim();
  const norm = normalizeStr(clean);

  // SUP / Stand Up Paddling
  if (
    norm.includes("standup") ||
    norm.includes("paddleboard") ||
    norm.includes("paddleboarding") ||
    norm.includes("standuppaddling") ||
    norm.includes("standuppaddle") ||
    norm.includes("sup") ||
    /\bsup\b/i.test(clean)
  ) {
    return createResult("stand_up_paddling", clean, false, 1.0);
  }

  // Kayaking & Canoeing
  if (norm.includes("kayak") || norm.includes("kajak")) {
    return createResult("kayak", clean, false, 1.0);
  }
  if (norm.includes("canoe") || norm.includes("kenu")) {
    return createResult("canoe", clean, false, 1.0);
  }

  // Rafting
  if (norm.includes("rafting") || norm.includes("whitewater") || norm.includes("vadviz")) {
    return createResult("rafting", clean, false, 1.0);
  }

  // Surfing & Windsurfing & Kitesurfing
  if (norm.includes("kitesurf") || norm.includes("kiteszor")) {
    return createResult("kitesurfing", clean, false, 1.0);
  }
  if (norm.includes("windsurf") || norm.includes("szorfe")) {
    return createResult("windsurfing", clean, false, 1.0);
  }
  if (norm.includes("surf") || norm.includes("hullamszor")) {
    return createResult("surfing", clean, false, 1.0);
  }

  // Sailing
  if (norm.includes("sail") || norm.includes("vitorla")) {
    return createResult("sailing", clean, false, 1.0);
  }

  // Rowing
  if (norm.includes("rowingerg") || norm.includes("indoorrow") || norm.includes("ergom")) {
    return createResult("rowing_ergometer", clean, false, 1.0);
  }
  if (norm.includes("row") || norm.includes("evez")) {
    return createResult("rowing", clean, false, 1.0);
  }

  // Running variants
  if (norm.includes("trailrun") || norm.includes("terepfut")) {
    return createResult("trail_running", clean, false, 1.0);
  }
  if (norm.includes("track") && (norm.includes("run") || norm.includes("fut"))) {
    return createResult("track_athletics", clean, false, 1.0);
  }
  if (norm.includes("run") || norm.includes("fut")) {
    return createResult("running", clean, false, 1.0);
  }

  // Cycling variants
  if (norm.includes("mountainbike") || norm.includes("mtb") || norm.includes("hegyikerek")) {
    return createResult("mountain_biking", clean, false, 1.0);
  }
  // Cycling variants
  if (norm.includes("mountainbike") || norm.includes("mtb") || norm.includes("hegyikerek")) {
    return createResult("mountain_biking", clean, false, 1.0);
  }
  if (norm.includes("gravel") || norm.includes("cyclocross")) {
    return createResult("gravel_cycling", clean, false, 1.0);
  }
  if (norm.includes("orszagut") || norm.includes("road")) {
    return createResult("road_cycling", clean, false, 1.0);
  }
  if (norm.includes("cycle") || norm.includes("cycling") || norm.includes("bike") || norm.includes("biking") || norm.includes("kerekpar") || norm.includes("bicikli") || norm.includes("bringa")) {
    return createResult("cycling", clean, false, 1.0);
  }

  // Swimming
  if (norm.includes("openwater") || norm.includes("nyiltviz")) {
    return createResult("open_water_swimming", clean, false, 1.0);
  }
  if (norm.includes("swim") || norm.includes("uszas") || norm.includes("uszo")) {
    return createResult("swimming", clean, false, 1.0);
  }

  // Hiking & Walking
  if (norm.includes("hike") || norm.includes("hiking") || norm.includes("tura")) {
    return createResult("hiking", clean, false, 1.0);
  }
  if (norm.includes("walk") || norm.includes("gyalog")) {
    return createResult("walking_hiking", clean, false, 0.95);
  }

  // Climbing
  if (norm.includes("climb") || norm.includes("maszas") || norm.includes("boulder")) {
    return createResult("climbing_bouldering", clean, false, 1.0);
  }

  // Skiing & Snowboarding
  if (norm.includes("skitour") || norm.includes("turasi") || norm.includes("backcountry")) {
    return createResult("ski_touring", clean, false, 1.0);
  }
  if (norm.includes("rollerski") || norm.includes("gorsi")) {
    return createResult("roller_skiing", clean, false, 1.0);
  }
  if (norm.includes("crosscountryski") || norm.includes("nordic") || norm.includes("sifutas")) {
    return createResult("cross_country_skiing", clean, false, 1.0);
  }
  if (norm.includes("alpineski") || norm.includes("downhillski") || norm.includes("lesiklas") || norm.includes("si")) {
    return createResult("alpine_skiing", clean, false, 0.95);
  }
  if (norm.includes("snowboard")) {
    return createResult("snowboarding", clean, false, 1.0);
  }

  // Strength & Fitness
  if (norm.includes("crossfit")) {
    return createResult("crossfit", clean, false, 1.0);
  }
  if (norm.includes("yoga") || norm.includes("joga")) {
    return createResult("yoga", clean, false, 1.0);
  }
  if (norm.includes("pilates")) {
    return createResult("pilates", clean, false, 1.0);
  }
  if (norm.includes("weight") || norm.includes("suly") || norm.includes("strength") || norm.includes("kondi") || norm.includes("kondizas")) {
    return createResult("strength", clean, false, 1.0);
  }

  // Direct ID check in catalog
  const match = SPORT_CATALOG.find((s) => s.id === clean.toLowerCase() || normalizeStr(s.nameHu) === norm || normalizeStr(s.nameEn) === norm);
  if (match) {
    return createResult(match.id, clean, false, 0.9);
  }

  // Unknown sport candidate
  return createResult("other", clean, true, 0.0, ["running", "cycling", "stand_up_paddling", "swimming", "strength", "hiking"]);
}

function createResult(
  sportId: string,
  detectedRaw: string,
  isAmbiguous: boolean,
  confidence: number,
  suggestedAlternatives: string[] = []
): SportMappingResult {
  const def = getSportById(sportId);
  const defaultAlternatives = ["running", "road_cycling", "stand_up_paddling", "swimming", "strength", "hiking"];
  const alternatives = suggestedAlternatives.length > 0 ? suggestedAlternatives : defaultAlternatives;

  return {
    sportId,
    sportNameHu: def?.nameHu || sportId,
    sportNameEn: def?.nameEn || sportId,
    icon: def?.icon || "🏃",
    isAmbiguous,
    detectedRaw,
    confidence,
    suggestedAlternatives: alternatives
  };
}
