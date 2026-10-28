import { SportDefinition } from "./types";

/**
 * SHARED COMPREHENSIVE SPORT CATALOG
 * Extensible data-driven list grouped into 9 standardized categories.
 * Over 90 Olympic, endurance, strength, team and combat disciplines.
 */
export const SPORT_CATALOG: SportDefinition[] = [
  // ==========================================
  // 1. ÁLLÓKÉPESSÉG (Endurance)
  // ==========================================
  {
    id: "running",
    nameHu: "Futás (aszfalt / síkfutás)",
    nameEn: "Running (Road)",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🏃",
    common: true
  },
  {
    id: "trail_running",
    nameHu: "Terepfutás",
    nameEn: "Trail Running",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🏔️",
    common: true
  },
  {
    id: "track_athletics",
    nameHu: "Pályaatlétika (sprint / közép- és hosszútáv)",
    nameEn: "Track & Field (Running)",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "👟"
  },
  {
    id: "road_cycling",
    nameHu: "Kerékpározás (országúti)",
    nameEn: "Road Cycling",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🚴",
    common: true
  },
  {
    id: "cycling",
    nameHu: "Kerékpározás",
    nameEn: "Cycling",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🚴",
    common: true
  },
  {
    id: "gravel_cycling",
    nameHu: "Gravel kerékpár",
    nameEn: "Gravel Cycling",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🚲"
  },
  {
    id: "mountain_biking",
    nameHu: "Hegyikerékpár (MTB / XC)",
    nameEn: "Mountain Biking (MTB)",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🚵"
  },
  {
    id: "triathlon",
    nameHu: "Triatlon",
    nameEn: "Triathlon",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🏊🚴🏃",
    common: true
  },
  {
    id: "duathlon",
    nameHu: "Duatlon",
    nameEn: "Duathlon",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🏃🚴"
  },
  {
    id: "aquathlon",
    nameHu: "Akvatlon",
    nameEn: "Aquathlon",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🏊🏃"
  },
  {
    id: "walking_hiking",
    nameHu: "Gyaloglás és túrázás",
    nameEn: "Walking & Hiking",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🥾",
    common: true
  },
  {
    id: "hiking",
    nameHu: "Túrázás / Hegyi túra",
    nameEn: "Hiking",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🥾",
    common: true
  },
  {
    id: "roller_skiing",
    nameHu: "Görsí",
    nameEn: "Roller Skiing",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🎿"
  },
  {
    id: "race_walking",
    nameHu: "Gyalogló atlétika",
    nameEn: "Race Walking",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🚶"
  },
  {
    id: "inline_skating",
    nameHu: "Görkorcsolya",
    nameEn: "Inline Skating",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🛼"
  },
  {
    id: "rowing_ergometer",
    nameHu: "Evezőpad (ergométer)",
    nameEn: "Indoor Rowing (Erg)",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🚣"
  },
  {
    id: "obstacle_racing",
    nameHu: "Akadályfutás (OCR / Spartan)",
    nameEn: "Obstacle Course Racing (OCR)",
    category: "endurance",
    metricProfile: "distance_duration",
    icon: "🧗"
  },

  // ==========================================
  // 2. ERŐ ÉS KONDÍCIÓ (Strength & Conditioning)
  // ==========================================
  {
    id: "strength",
    nameHu: "Kondi és erőfejlesztés",
    nameEn: "Strength Training",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "🏋️",
    common: true
  },
  {
    id: "strength_general",
    nameHu: "Kondi és általános erőfejlesztés",
    nameEn: "General Strength & Conditioning",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "🏋️",
    common: true
  },
  {
    id: "weightlifting",
    nameHu: "Olimpiai súlyemelés",
    nameEn: "Olympic Weightlifting",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "🏋️‍♂️",
    common: true
  },
  {
    id: "powerlifting",
    nameHu: "Erőemelés (Powerlifting)",
    nameEn: "Powerlifting",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "💪",
    common: true
  },
  {
    id: "crossfit",
    nameHu: "Funkcionális fitnesz / CrossFit",
    nameEn: "Functional Fitness / CrossFit",
    category: "strength",
    metricProfile: "rounds_time",
    icon: "⚡",
    common: true
  },
  {
    id: "calisthenics",
    nameHu: "Saját testsúlyos edzés (Calisthenics)",
    nameEn: "Calisthenics / Bodyweight",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "🤸‍♂️"
  },
  {
    id: "kettlebell",
    nameHu: "Kettlebell edzés",
    nameEn: "Kettlebell Training",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "🔔"
  },
  {
    id: "bodybuilding",
    nameHu: "Testépítés (hipertrófia)",
    nameEn: "Bodybuilding",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "🏆"
  },
  {
    id: "strongman",
    nameHu: "Strongman / Erősember",
    nameEn: "Strongman",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "🗿"
  },
  {
    id: "circuit_training",
    nameHu: "Köredzés és HIIT",
    nameEn: "Circuit Training / HIIT",
    category: "strength",
    metricProfile: "rounds_time",
    icon: "⏱️"
  },
  {
    id: "plyometrics",
    nameHu: "Pliometria és robbanékonyság",
    nameEn: "Plyometrics & Power",
    category: "strength",
    metricProfile: "sets_reps_load",
    icon: "💥"
  },

  // ==========================================
  // 3. CSAPATSPORTOK (Team Sports)
  // ==========================================
  {
    id: "football",
    nameHu: "Labdarúgás (Foci)",
    nameEn: "Football (Soccer)",
    category: "team",
    metricProfile: "points",
    icon: "⚽",
    common: true
  },
  {
    id: "basketball",
    nameHu: "Kosárlabda",
    nameEn: "Basketball",
    category: "team",
    metricProfile: "points",
    icon: "🏀",
    common: true
  },
  {
    id: "handball",
    nameHu: "Kézilabda",
    nameEn: "Handball",
    category: "team",
    metricProfile: "points",
    icon: "🤾",
    common: true
  },
  {
    id: "water_polo",
    nameHu: "Vízilabda",
    nameEn: "Water Polo",
    category: "team",
    metricProfile: "points",
    icon: "🤽",
    common: true
  },
  {
    id: "volleyball",
    nameHu: "Röplabda (terem)",
    nameEn: "Indoor Volleyball",
    category: "team",
    metricProfile: "points",
    icon: "🏐",
    common: true
  },
  {
    id: "beach_volleyball",
    nameHu: "Strandröplabda",
    nameEn: "Beach Volleyball",
    category: "team",
    metricProfile: "points",
    icon: "🏖️"
  },
  {
    id: "ice_hockey",
    nameHu: "Jégkorong",
    nameEn: "Ice Hockey",
    category: "team",
    metricProfile: "points",
    icon: "🏒",
    common: true
  },
  {
    id: "field_hockey",
    nameHu: "Gyeplabda",
    nameEn: "Field Hockey",
    category: "team",
    metricProfile: "points",
    icon: "🏑"
  },
  {
    id: "rugby",
    nameHu: "Rögbi",
    nameEn: "Rugby",
    category: "team",
    metricProfile: "points",
    icon: "🏉"
  },
  {
    id: "american_football",
    nameHu: "Amerikai futball",
    nameEn: "American Football",
    category: "team",
    metricProfile: "points",
    icon: "🏈"
  },
  {
    id: "baseball_softball",
    nameHu: "Baseball és Softball",
    nameEn: "Baseball & Softball",
    category: "team",
    metricProfile: "points",
    icon: "⚾"
  },
  {
    id: "futsal",
    nameHu: "Futsal (teremfoci)",
    nameEn: "Futsal",
    category: "team",
    metricProfile: "points",
    icon: "👟⚽"
  },
  {
    id: "floorball",
    nameHu: "Floorball",
    nameEn: "Floorball",
    category: "team",
    metricProfile: "points",
    icon: "🥅"
  },

  // ==========================================
  // 4. KÜZDŐSPORTOK (Combat Sports)
  // ==========================================
  {
    id: "wrestling",
    nameHu: "Birkózás (kötött- és szabadfogás)",
    nameEn: "Wrestling (Greco-Roman & Freestyle)",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🤼",
    common: true
  },
  {
    id: "judo",
    nameHu: "Cselgáncs (Judo)",
    nameEn: "Judo",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥋",
    common: true
  },
  {
    id: "boxing",
    nameHu: "Ökölvívás (Box)",
    nameEn: "Boxing",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥊",
    common: true
  },
  {
    id: "fencing",
    nameHu: "Vívás (párbajtőr, tőr, kard)",
    nameEn: "Fencing (Épée, Foil, Sabre)",
    category: "combat",
    metricProfile: "points",
    icon: "🤺",
    common: true
  },
  {
    id: "karate",
    nameHu: "Karate",
    nameEn: "Karate",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥋"
  },
  {
    id: "taekwondo",
    nameHu: "Taekwondo",
    nameEn: "Taekwondo",
    category: "combat",
    metricProfile: "points",
    icon: "🥋"
  },
  {
    id: "brazilian_jiu_jitsu",
    nameHu: "Brazil Jiu-Jitsu (BJJ)",
    nameEn: "Brazilian Jiu-Jitsu (BJJ)",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥋"
  },
  {
    id: "kickboxing",
    nameHu: "Kick-box",
    nameEn: "Kickboxing",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥊"
  },
  {
    id: "muay_thai",
    nameHu: "Muay Thai (Thai boksz)",
    nameEn: "Muay Thai",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥊"
  },
  {
    id: "mma",
    nameHu: "Kevert harcművészetek (MMA)",
    nameEn: "Mixed Martial Arts (MMA)",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥋"
  },
  {
    id: "aikido",
    nameHu: "Aikido",
    nameEn: "Aikido",
    category: "combat",
    metricProfile: "duration_only",
    icon: "🥋"
  },
  {
    id: "kempo",
    nameHu: "Kempo",
    nameEn: "Kempo",
    category: "combat",
    metricProfile: "rounds_time",
    icon: "🥋"
  },

  // ==========================================
  // 5. ÜTŐS ÉS ÜTŐJÁTÉKOK (Racket Sports)
  // ==========================================
  {
    id: "tennis",
    nameHu: "Tenisz",
    nameEn: "Tennis",
    category: "racket",
    metricProfile: "points",
    icon: "🎾",
    common: true
  },
  {
    id: "table_tennis",
    nameHu: "Asztalitenisz (Pingpong)",
    nameEn: "Table Tennis",
    category: "racket",
    metricProfile: "points",
    icon: "🏓",
    common: true
  },
  {
    id: "badminton",
    nameHu: "Tollaslabda",
    nameEn: "Badminton",
    category: "racket",
    metricProfile: "points",
    icon: "🏸",
    common: true
  },
  {
    id: "squash",
    nameHu: "Fallabda (Squash)",
    nameEn: "Squash",
    category: "racket",
    metricProfile: "points",
    icon: "⬛"
  },
  {
    id: "padel",
    nameHu: "Padel",
    nameEn: "Padel",
    category: "racket",
    metricProfile: "points",
    icon: "🎾"
  },
  {
    id: "pickleball",
    nameHu: "Pickleball",
    nameEn: "Pickleball",
    category: "racket",
    metricProfile: "points",
    icon: "🏓"
  },
  {
    id: "racquetball",
    nameHu: "Racquetball",
    nameEn: "Racquetball",
    category: "racket",
    metricProfile: "points",
    icon: "🎾"
  },
  {
    id: "speedminton",
    nameHu: "Crossminton / Speedminton",
    nameEn: "Crossminton",
    category: "racket",
    metricProfile: "points",
    icon: "🏸"
  },

  // ==========================================
  // 6. VÍZI SPORTOK (Water Sports)
  // ==========================================
  {
    id: "swimming_pool",
    nameHu: "Úszás (medencés)",
    nameEn: "Swimming (Pool)",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🏊",
    common: true
  },
  {
    id: "swimming",
    nameHu: "Úszás",
    nameEn: "Swimming",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🏊",
    common: true
  },
  {
    id: "swimming_open_water",
    nameHu: "Nyíltvízi úszás",
    nameEn: "Open Water Swimming",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🌊",
    common: true
  },
  {
    id: "kayak",
    nameHu: "Kajak (síkvízi / szlalom)",
    nameEn: "Kayaking (Flatwater / Slalom)",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🛶",
    common: true
  },
  {
    id: "canoe",
    nameHu: "Kenu",
    nameEn: "Canoeing",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🛶",
    common: true
  },
  {
    id: "rowing",
    nameHu: "Evezés (párevezős / váltott)",
    nameEn: "Rowing (Crew / Sculling)",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🚣",
    common: true
  },
  {
    id: "sailing",
    nameHu: "Vitorlázás",
    nameEn: "Sailing",
    category: "water",
    metricProfile: "duration_only",
    icon: "⛵"
  },
  {
    id: "windsurfing",
    nameHu: "Windsurf",
    nameEn: "Windsurfing",
    category: "water",
    metricProfile: "duration_only",
    icon: "🏄"
  },
  {
    id: "surfing",
    nameHu: "Hullámszörf",
    nameEn: "Surfing",
    category: "water",
    metricProfile: "duration_only",
    icon: "🏄"
  },
  {
    id: "kitesurfing",
    nameHu: "Kiteszörf",
    nameEn: "Kitesurfing",
    category: "water",
    metricProfile: "duration_only",
    icon: "🪁"
  },
  {
    id: "rafting",
    nameHu: "Vadvízi evezés (Rafting)",
    nameEn: "Whitewater Rafting",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🛶"
  },
  {
    id: "stand_up_paddling",
    nameHu: "SUP (Stand Up Paddle)",
    nameEn: "SUP (Stand Up Paddle)",
    category: "water",
    metricProfile: "distance_duration",
    icon: "🏄‍♂️",
    common: true
  },
  {
    id: "diving",
    nameHu: "Műugrás és Toronyugrás",
    nameEn: "Diving",
    category: "water",
    metricProfile: "points",
    icon: "🤿"
  },
  {
    id: "artistic_swimming",
    nameHu: "Szinkronúszás (műúszás)",
    nameEn: "Artistic (Synchronized) Swimming",
    category: "water",
    metricProfile: "duration_only",
    icon: "🏊‍♀️"
  },
  {
    id: "scuba_diving",
    nameHu: "Könnyűbúvárkodás",
    nameEn: "Scuba Diving",
    category: "water",
    metricProfile: "duration_only",
    icon: "🤿"
  },
  {
    id: "wakeboarding",
    nameHu: "Vízisí és Wakeboard",
    nameEn: "Water Skiing & Wakeboarding",
    category: "water",
    metricProfile: "duration_only",
    icon: "🏄"
  },

  // ==========================================
  // 7. TÉLI SPORTOK (Winter Sports)
  // ==========================================
  {
    id: "alpine_skiing",
    nameHu: "Alpesi sí",
    nameEn: "Alpine Skiing",
    category: "winter",
    metricProfile: "duration_only",
    icon: "⛷️",
    common: true
  },
  {
    id: "cross_country_skiing",
    nameHu: "Sífutás",
    nameEn: "Cross-Country Skiing",
    category: "winter",
    metricProfile: "distance_duration",
    icon: "🎿",
    common: true
  },
  {
    id: "ski_touring",
    nameHu: "Túrasí / Hegyisí (Ski Touring)",
    nameEn: "Ski Touring & Mountaineering",
    category: "winter",
    metricProfile: "distance_duration",
    icon: "⛷️"
  },
  {
    id: "snowboarding",
    nameHu: "Snowboard",
    nameEn: "Snowboarding",
    category: "winter",
    metricProfile: "duration_only",
    icon: "🏂",
    common: true
  },
  {
    id: "speed_skating",
    nameHu: "Gyorskorcsolya (nagypályás)",
    nameEn: "Speed Skating",
    category: "winter",
    metricProfile: "distance_duration",
    icon: "⛸️"
  },
  {
    id: "short_track",
    nameHu: "Rövidpályás gyorskorcsolya (Short Track)",
    nameEn: "Short Track Speed Skating",
    category: "winter",
    metricProfile: "distance_duration",
    icon: "⛸️",
    common: true
  },
  {
    id: "figure_skating",
    nameHu: "Műkorcsolya és jégtánc",
    nameEn: "Figure Skating & Ice Dance",
    category: "winter",
    metricProfile: "points",
    icon: "⛸️"
  },
  {
    id: "biathlon",
    nameHu: "Biatlon (síllövészet)",
    nameEn: "Biathlon",
    category: "winter",
    metricProfile: "distance_duration",
    icon: "🎿🎯"
  },
  {
    id: "ski_jumping",
    nameHu: "Síugrás és északi összetett",
    nameEn: "Ski Jumping & Nordic Combined",
    category: "winter",
    metricProfile: "points",
    icon: "🎿"
  },
  {
    id: "curling",
    nameHu: "Curling",
    nameEn: "Curling",
    category: "winter",
    metricProfile: "points",
    icon: "🥌"
  },
  {
    id: "bobsleigh_luge",
    nameHu: "Bob és szánkó",
    nameEn: "Bobsleigh & Luge",
    category: "winter",
    metricProfile: "duration_only",
    icon: "🛷"
  },

  // ==========================================
  // 8. TORNA ÉS MOZGÁS (Gymnastics & Movement)
  // ==========================================
  {
    id: "artistic_gymnastics",
    nameHu: "Szertorna",
    nameEn: "Artistic Gymnastics",
    category: "gymnastics",
    metricProfile: "points",
    icon: "🤸",
    common: true
  },
  {
    id: "rhythmic_gymnastics",
    nameHu: "Ritmikus gimnasztika (RG)",
    nameEn: "Rhythmic Gymnastics",
    category: "gymnastics",
    metricProfile: "points",
    icon: "🎀"
  },
  {
    id: "trampoline",
    nameHu: "Gumiasztal (trambulin)",
    nameEn: "Trampoline",
    category: "gymnastics",
    metricProfile: "points",
    icon: "🤸‍♂️"
  },
  {
    id: "yoga",
    nameHu: "Jóga (hatha, vinyasa, ashtanga)",
    nameEn: "Yoga",
    category: "gymnastics",
    metricProfile: "duration_only",
    icon: "🧘",
    common: true
  },
  {
    id: "pilates",
    nameHu: "Pilates és törzsstabilizáció",
    nameEn: "Pilates & Core Control",
    category: "gymnastics",
    metricProfile: "duration_only",
    icon: "🧘‍♀️"
  },
  {
    id: "mobility_stretching",
    nameHu: "Mobilitás, nyújtás és regeneráció",
    nameEn: "Mobility & Stretching",
    category: "gymnastics",
    metricProfile: "duration_only",
    icon: "🤸",
    common: true
  },
  {
    id: "dance_sport",
    nameHu: "Táncsport (versenytánc / hip-hop / balett)",
    nameEn: "Dance Sport (Ballroom / Contemporary)",
    category: "gymnastics",
    metricProfile: "duration_only",
    icon: "💃"
  },
  {
    id: "aerobics",
    nameHu: "Sportaerobik",
    nameEn: "Sport Aerobics",
    category: "gymnastics",
    metricProfile: "duration_only",
    icon: "👟"
  },
  {
    id: "parkour",
    nameHu: "Parkour és akadálymozgás",
    nameEn: "Parkour / Freerunning",
    category: "gymnastics",
    metricProfile: "duration_only",
    icon: "🏃‍♂️"
  },

  // ==========================================
  // 9. EGYÉB (Other Sports)
  // ==========================================
  {
    id: "archery",
    nameHu: "Íjászat",
    nameEn: "Archery",
    category: "other",
    metricProfile: "points",
    icon: "🏹"
  },
  {
    id: "shooting",
    nameHu: "Sportlövészet",
    nameEn: "Sport Shooting",
    category: "other",
    metricProfile: "points",
    icon: "🎯"
  },
  {
    id: "equestrian",
    nameHu: "Lovaglás (díjlovaglás / díjugratás / military)",
    nameEn: "Equestrian (Dressage / Jumping)",
    category: "other",
    metricProfile: "duration_only",
    icon: "🏇"
  },
  {
    id: "climbing_bouldering",
    nameHu: "Sziklamászás és falmászás / Bouldering",
    nameEn: "Rock Climbing & Bouldering",
    category: "other",
    metricProfile: "duration_only",
    icon: "🧗"
  },
  {
    id: "golf",
    nameHu: "Golf",
    nameEn: "Golf",
    category: "other",
    metricProfile: "points",
    icon: "⛳"
  },
  {
    id: "orienteering",
    nameHu: "Tájfutás",
    nameEn: "Orienteering",
    category: "other",
    metricProfile: "distance_duration",
    icon: "🧭"
  },
  {
    id: "motorsport",
    nameHu: "Motorsport és gokart",
    nameEn: "Motorsport & Karting",
    category: "other",
    metricProfile: "rounds_time",
    icon: "🏎️"
  },
  {
    id: "darts",
    nameHu: "Darts",
    nameEn: "Darts",
    category: "other",
    metricProfile: "points",
    icon: "🎯"
  },
  {
    id: "chess",
    nameHu: "Sakk",
    nameEn: "Chess",
    category: "other",
    metricProfile: "points",
    icon: "♟️"
  }
];
