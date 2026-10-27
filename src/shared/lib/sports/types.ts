export type SportCategory =
  | "endurance"
  | "strength"
  | "team"
  | "combat"
  | "racket"
  | "water"
  | "winter"
  | "gymnastics"
  | "other";

export type MetricProfile =
  | "distance_duration" // Distance, duration, pace/speed, HR
  | "duration_only"     // Duration, HR, calories
  | "sets_reps_load"    // Sets, reps, weight/load, rest
  | "rounds_time"       // Rounds, round time, rest time
  | "points";           // Points/score, duration, opponent

export interface SportDefinition {
  id: string;
  nameHu: string;
  nameEn: string;
  category: SportCategory;
  metricProfile: MetricProfile;
  icon?: string;
  common?: boolean;
  isCustom?: boolean;
  userId?: string;
}

export interface SportCategoryMeta {
  id: SportCategory;
  nameHu: string;
  nameEn: string;
  icon: string;
  descriptionHu: string;
  descriptionEn: string;
}

export const SPORT_CATEGORIES: Record<SportCategory, SportCategoryMeta> = {
  endurance: {
    id: "endurance",
    nameHu: "Állóképesség",
    nameEn: "Endurance",
    icon: "🏃",
    descriptionHu: "Futás, kerékpározás, triatlon és állóképességi számok",
    descriptionEn: "Running, cycling, triathlon and endurance events"
  },
  strength: {
    id: "strength",
    nameHu: "Erő és kondíció",
    nameEn: "Strength & Conditioning",
    icon: "🏋️",
    descriptionHu: "Súlyemelés, erőemelés, CrossFit és funkcionális edzés",
    descriptionEn: "Weightlifting, powerlifting, CrossFit and functional strength"
  },
  team: {
    id: "team",
    nameHu: "Csapatsportok",
    nameEn: "Team Sports",
    icon: "⚽",
    descriptionHu: "Labdarúgás, kosárlabda, kézilabda, vízilabda és jégkorong",
    descriptionEn: "Football, basketball, handball, water polo and hockey"
  },
  combat: {
    id: "combat",
    nameHu: "Küzdősportok",
    nameEn: "Combat Sports",
    icon: "🥋",
    descriptionHu: "Birkózás, judo, ökölvívás, vívás, taekwondo és MMA",
    descriptionEn: "Wrestling, judo, boxing, fencing, taekwondo and MMA"
  },
  racket: {
    id: "racket",
    nameHu: "Ütős és ütőjátékok",
    nameEn: "Racket Sports",
    icon: "🎾",
    descriptionHu: "Tenisz, tollaslabda, asztalitenisz, squash és padel",
    descriptionEn: "Tennis, badminton, table tennis, squash and padel"
  },
  water: {
    id: "water",
    nameHu: "Vízi sportok",
    nameEn: "Water Sports",
    icon: "🏊",
    descriptionHu: "Úszás, kajak, kenu, evezés, szörf és vitorlázás",
    descriptionEn: "Swimming, kayak, canoe, rowing, surfing and sailing"
  },
  winter: {
    id: "winter",
    nameHu: "Téli sportok",
    nameEn: "Winter Sports",
    icon: "⛷️",
    descriptionHu: "Síelés, snowboard, gyorskorcsolya, biatlon és jégtánc",
    descriptionEn: "Skiing, snowboarding, speed skating, biathlon and ice skating"
  },
  gymnastics: {
    id: "gymnastics",
    nameHu: "Torna és mozgás",
    nameEn: "Gymnastics & Movement",
    icon: "🤸",
    descriptionHu: "Szertorna, ritmikus gimnasztika, jóga, pilates és tánc",
    descriptionEn: "Gymnastics, rhythmic gymnastics, yoga, pilates and dance"
  },
  other: {
    id: "other",
    nameHu: "Egyéb",
    nameEn: "Other",
    icon: "🎯",
    descriptionHu: "Íjászat, sportlövészet, lovaglás, falmászás és motorsport",
    descriptionEn: "Archery, shooting, equestrian, climbing and motorsport"
  }
};
