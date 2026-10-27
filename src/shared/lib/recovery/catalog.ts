import { RecoveryActivityType, RecoveryCategory } from "@shared/types/recovery";

export interface RecoveryCategoryMeta {
  id: RecoveryCategory;
  nameHu: string;
  nameEn: string;
  icon: string;
}

export const RECOVERY_CATEGORIES: RecoveryCategoryMeta[] = [
  {
    id: "mobility_gymnastics",
    nameHu: "Mobilitás és torna",
    nameEn: "Mobility & Gymnastics",
    icon: "🧘"
  },
  {
    id: "cold",
    nameHu: "Hideg",
    nameEn: "Cold Therapy",
    icon: "🧊"
  },
  {
    id: "heat",
    nameHu: "Meleg",
    nameEn: "Heat Therapy",
    icon: "🔥"
  },
  {
    id: "contrast",
    nameHu: "Kontraszt",
    nameEn: "Contrast",
    icon: "🔄"
  },
  {
    id: "massage_therapy",
    nameHu: "Masszázs és terápia",
    nameEn: "Massage & Therapy",
    icon: "💆"
  },
  {
    id: "sleep_relaxation",
    nameHu: "Alvás és relaxáció",
    nameEn: "Sleep & Relaxation",
    icon: "😴"
  },
  {
    id: "other",
    nameHu: "Egyéb",
    nameEn: "Other",
    icon: "✨"
  }
];

export const STANDARD_RECOVERY_ACTIVITIES: RecoveryActivityType[] = [
  // Mobilitás és torna
  {
    id: "rec-corr-gym",
    nameHu: "Korrekciós torna",
    nameEn: "Corrective Exercise",
    category: "mobility_gymnastics",
    icon: "🤸",
    showBodyArea: true,
    showRounds: true,
    defaultDurationMinutes: 20,
    isFavorite: true
  },
  {
    id: "rec-dyn-stretch",
    nameHu: "Dinamikus nyújtás",
    nameEn: "Dynamic Stretching",
    category: "mobility_gymnastics",
    icon: "🏃",
    showBodyArea: true,
    defaultDurationMinutes: 15
  },
  {
    id: "rec-stat-stretch",
    nameHu: "Statikus nyújtás",
    nameEn: "Static Stretching",
    category: "mobility_gymnastics",
    icon: "🧘",
    showBodyArea: true,
    defaultDurationMinutes: 20,
    isFavorite: true
  },
  {
    id: "rec-foam-roll",
    nameHu: "SMR henger / Foam roller",
    nameEn: "Foam Rolling",
    category: "mobility_gymnastics",
    icon: "🌀",
    showBodyArea: true,
    defaultDurationMinutes: 15,
    isFavorite: true
  },
  {
    id: "rec-yoga",
    nameHu: "Jóga",
    nameEn: "Yoga",
    category: "mobility_gymnastics",
    icon: "🧘",
    showIntensity: true,
    defaultDurationMinutes: 30
  },
  {
    id: "rec-breath",
    nameHu: "Légzőgyakorlat",
    nameEn: "Breathwork",
    category: "mobility_gymnastics",
    icon: "🌬️",
    showRounds: true,
    defaultDurationMinutes: 10
  },

  // Hideg
  {
    id: "rec-cold-plunge",
    nameHu: "Hidegvizes merülés",
    nameEn: "Cold Plunge",
    category: "cold",
    icon: "🧊",
    showTemperature: true,
    showRounds: true,
    defaultDurationMinutes: 3,
    isFavorite: true
  },
  {
    id: "rec-ice-bath",
    nameHu: "Jégfürdő",
    nameEn: "Ice Bath",
    category: "cold",
    icon: "❄️",
    showTemperature: true,
    defaultDurationMinutes: 5
  },
  {
    id: "rec-cold-shower",
    nameHu: "Hideg zuhany",
    nameEn: "Cold Shower",
    category: "cold",
    icon: "🚿",
    showTemperature: true,
    defaultDurationMinutes: 3
  },
  {
    id: "rec-cryo",
    nameHu: "Krioterápia / Helyi jegelés",
    nameEn: "Cryotherapy / Ice Pack",
    category: "cold",
    icon: "❄️",
    showBodyArea: true,
    defaultDurationMinutes: 15
  },

  // Meleg
  {
    id: "rec-finnish-sauna",
    nameHu: "Finn szauna",
    nameEn: "Finnish Sauna",
    category: "heat",
    icon: "🔥",
    showTemperature: true,
    showRounds: true,
    defaultDurationMinutes: 20,
    isFavorite: true
  },
  {
    id: "rec-infra-sauna",
    nameHu: "Infraszauna",
    nameEn: "Infrared Sauna",
    category: "heat",
    icon: "♨️",
    showTemperature: true,
    defaultDurationMinutes: 30
  },
  {
    id: "rec-steam-bath",
    nameHu: "Gőzfürdő",
    nameEn: "Steam Room",
    category: "heat",
    icon: "💨",
    showTemperature: true,
    showRounds: true,
    defaultDurationMinutes: 15
  },
  {
    id: "rec-hot-bath",
    nameHu: "Meleg fürdő / Termálvíz",
    nameEn: "Hot Bath / Thermal Water",
    category: "heat",
    icon: "🛁",
    showTemperature: true,
    defaultDurationMinutes: 20
  },

  // Kontraszt
  {
    id: "rec-contrast-bath",
    nameHu: "Kontrasztfürdő / zuhany",
    nameEn: "Contrast Bath / Shower",
    category: "contrast",
    icon: "🔄",
    showTemperature: true,
    showRounds: true,
    defaultDurationMinutes: 15,
    isFavorite: true
  },

  // Masszázs és terápia
  {
    id: "rec-sport-massage",
    nameHu: "Sportmasszázs",
    nameEn: "Sports Massage",
    category: "massage_therapy",
    icon: "💆",
    showBodyArea: true,
    showIntensity: true,
    defaultDurationMinutes: 45,
    isFavorite: true
  },
  {
    id: "rec-relax-massage",
    nameHu: "Svéd / relaxáló masszázs",
    nameEn: "Relaxation Massage",
    category: "massage_therapy",
    icon: "💆‍♂️",
    showBodyArea: true,
    defaultDurationMinutes: 60
  },
  {
    id: "rec-physio",
    nameHu: "Fizioterápia / Gyógytorna",
    nameEn: "Physiotherapy",
    category: "massage_therapy",
    icon: "🩺",
    showBodyArea: true,
    defaultDurationMinutes: 45
  },
  {
    id: "rec-compression-boots",
    nameHu: "Kompressziós csizma",
    nameEn: "Compression Boots",
    category: "massage_therapy",
    icon: "🦿",
    showIntensity: true,
    defaultDurationMinutes: 30,
    isFavorite: true
  },
  {
    id: "rec-taping",
    nameHu: "Kinesio tapasz / Flossing",
    nameEn: "Taping / Flossing",
    category: "massage_therapy",
    icon: "🩹",
    showBodyArea: true,
    defaultDurationMinutes: 15
  },

  // Alvás és relaxáció
  {
    id: "rec-nap",
    nameHu: "Szieszta / Power nap",
    nameEn: "Power Nap",
    category: "sleep_relaxation",
    icon: "😴",
    defaultDurationMinutes: 25,
    isFavorite: true
  },
  {
    id: "rec-meditation",
    nameHu: "Meditáció / Autogén tréning",
    nameEn: "Meditation / Relaxation",
    category: "sleep_relaxation",
    icon: "🧠",
    defaultDurationMinutes: 15
  },

  // Egyéb
  {
    id: "rec-walk",
    nameHu: "Séta a természetben",
    nameEn: "Nature Walk",
    category: "other",
    icon: "🌲",
    showIntensity: true,
    defaultDurationMinutes: 30
  },
  {
    id: "rec-rec-swim",
    nameHu: "Regeneráló könnyű úszás",
    nameEn: "Recovery Swim",
    category: "other",
    icon: "🏊",
    showIntensity: true,
    defaultDurationMinutes: 20
  }
];
