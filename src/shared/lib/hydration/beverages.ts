/**
 * BEVERAGE HYDRATION DATABASE & CONFIGURATION
 *
 * Approximate beverage hydration factors based on published clinical hydration research:
 * Reference: Maughan RJ, Watson P, Cordery PA, et al. A randomized trial to assess the potential
 * of different beverages to affect hydration status: the Beverage Hydration Index (BHI).
 * Am J Clin Nutr. 2016;103(3):717-723. doi:10.3945/ajcn.115.114769
 *
 * NOTE: Factors are approximate, evidence-based physiological estimates and are fully editable.
 * Effective hydration = volume (ml) * hydrationFactor.
 */

export interface BeverageDefinition {
  id: string;
  nameHu: string;
  nameEn: string;
  hydrationFactor: number; // 1.0 = baseline pure water
  caffeineMgPer100ml?: number;
  sugarGramsPer100ml?: number;
  sodiumMgPer100ml?: number;
  icon: string;
  color: string;
  noteHu?: string;
  noteEn?: string;
  isCustom?: boolean;
}

export interface HydrationLogEntry {
  id: string;
  athleteId: string;
  timestamp: string; // ISO
  timeStr: string;   // HH:mm
  date: string;      // YYYY-MM-DD
  beverageId: string;
  beverageName: string;
  volumeMl: number;
  hydrationFactor: number;
  effectiveVolumeMl: number; // Math.round(volumeMl * hydrationFactor)
  caffeineMg: number;
  sugarGrams: number;
  sodiumMg: number;
  icon: string;
  color: string;
  note?: string;
}

export interface HydrationSummary {
  totalRawVolumeMl: number;
  totalEffectiveVolumeMl: number;
  totalCaffeineMg: number;
  totalSugarGrams: number;
  totalSodiumMg: number;
  targetVolumeMl: number;
  progressPercent: number; // based on effective hydration
}

export const STANDARD_PORTION_SIZES = [150, 250, 330, 500] as const;

export const STANDARD_BEVERAGES: BeverageDefinition[] = [
  {
    id: "water",
    nameHu: "Víz (csapvíz / ásványvíz)",
    nameEn: "Water (Tap / Mineral)",
    hydrationFactor: 1.0,
    caffeineMgPer100ml: 0,
    sugarGramsPer100ml: 0,
    sodiumMgPer100ml: 5,
    icon: "💧",
    color: "#0284c7"
  },
  {
    id: "isotonic",
    nameHu: "Izotóniás sportital",
    nameEn: "Isotonic Sports Drink",
    hydrationFactor: 1.0,
    caffeineMgPer100ml: 0,
    sugarGramsPer100ml: 6.0,
    sodiumMgPer100ml: 45,
    icon: "⚡",
    color: "#eab308",
    noteHu: "Szénhidrát és nátrium tartalom a gyors sejtszintű felszívódásért.",
    noteEn: "Carbohydrates and sodium optimized for rapid cellular absorption."
  },
  {
    id: "electrolyte_ors",
    nameHu: "Elektrolit / Orális Rehidratációs Ital (ORS)",
    nameEn: "Electrolyte / Oral Rehydration Solution (ORS)",
    hydrationFactor: 1.15,
    caffeineMgPer100ml: 0,
    sugarGramsPer100ml: 2.0,
    sodiumMgPer100ml: 110,
    icon: "🧂",
    color: "#06b6d4",
    noteHu: "Magasabb BHI: a nátrium és kálium csökkenti a vizeletkiválasztást, növelve a folyadék-visszatartást.",
    noteEn: "Higher BHI: sodium and potassium reduce urinary fluid loss, enhancing net retention."
  },
  {
    id: "milk",
    nameHu: "Tej / Növényi fehérjeital",
    nameEn: "Milk / Fortified Plant Milk",
    hydrationFactor: 1.2,
    caffeineMgPer100ml: 0,
    sugarGramsPer100ml: 4.8,
    sodiumMgPer100ml: 45,
    icon: "🥛",
    color: "#cbd5e1",
    noteHu: "Kiemelkedő hidratációs index: fehérje- és zsírtartalma lassítja a gyomorürülést és tartós hidráltságot biztosít.",
    noteEn: "High BHI: protein and electrolytes slow gastric emptying, sustaining long-term hydration."
  },
  {
    id: "tea",
    nameHu: "Tea (zöld, fekete, gyógytea)",
    nameEn: "Tea (Green, Black, Herbal)",
    hydrationFactor: 1.0,
    caffeineMgPer100ml: 18,
    sugarGramsPer100ml: 0,
    sodiumMgPer100ml: 2,
    icon: "🍵",
    color: "#10b981",
    noteHu: "Kiegyensúlyozott hidratáció antioxidánsokkal és enyhe élénkítő hatással.",
    noteEn: "Balanced hydration with polyphenols and gentle alertness."
  },
  {
    id: "coffee",
    nameHu: "Kávé (espresso / americano)",
    nameEn: "Coffee (Espresso / Americano)",
    hydrationFactor: 0.95,
    caffeineMgPer100ml: 65,
    sugarGramsPer100ml: 0,
    sodiumMgPer100ml: 2,
    icon: "☕",
    color: "#854d0e",
    noteHu: "Szokásos fogyasztás mellett szinte a vízzel megegyezően hasznosul; a koffein enyhe akut diurezist okozhat.",
    noteEn: "Habitual intake hydrates nearly as effectively as water; acute caffeine doses have mild diuretic properties."
  },
  {
    id: "fruit_juice",
    nameHu: "100% Gyümölcslé",
    nameEn: "100% Fruit Juice",
    hydrationFactor: 1.0,
    caffeineMgPer100ml: 0,
    sugarGramsPer100ml: 10.0,
    sodiumMgPer100ml: 3,
    icon: "🧃",
    color: "#f97316"
  },
  {
    id: "soft_drink",
    nameHu: "Üdítőital",
    nameEn: "Soft Drink / Soda",
    hydrationFactor: 0.95,
    caffeineMgPer100ml: 10,
    sugarGramsPer100ml: 10.5,
    sodiumMgPer100ml: 8,
    icon: "🥤",
    color: "#ec4899"
  },
  {
    id: "non_alcoholic_beer",
    nameHu: "Alkoholmentes sör",
    nameEn: "Non-Alcoholic Beer",
    hydrationFactor: 1.05,
    caffeineMgPer100ml: 0,
    sugarGramsPer100ml: 4.0,
    sodiumMgPer100ml: 6,
    icon: "🌾",
    color: "#f59e0b",
    noteHu: "Izotóniás polifenolokban gazdag regenerációs ital enyhe szénhidrát-visszatöltéssel.",
    noteEn: "Polyphenol-rich recovery beverage with gentle carbohydrate repletion."
  },
  {
    id: "beer_alcohol",
    nameHu: "Sör / Alkoholos ital",
    nameEn: "Beer / Alcoholic Drink",
    hydrationFactor: 0.65,
    caffeineMgPer100ml: 0,
    sugarGramsPer100ml: 3.5,
    sodiumMgPer100ml: 4,
    icon: "🍺",
    color: "#d97706",
    noteHu: "Az etanol gátolja a vazopresszin (ADH) termelődését, emiatt megnövekszik a vizeletkiválasztás és alacsonyabb a nettó folyadékhasznosulás.",
    noteEn: "Ethanol suppresses vasopressin secretion, inducing acute diuresis and reducing net hydration efficiency."
  }
];

/**
 * Calculates effective hydration volume: volume * factor
 */
export function calculateEffectiveHydration(volumeMl: number, factor: number): number {
  return Math.round(volumeMl * factor);
}

/**
 * Calculates aggregate daily hydration metrics
 */
export function calculateHydrationTotals(
  entries: HydrationLogEntry[],
  targetVolumeMl = 3500
): HydrationSummary {
  let totalRawVolumeMl = 0;
  let totalEffectiveVolumeMl = 0;
  let totalCaffeineMg = 0;
  let totalSugarGrams = 0;
  let totalSodiumMg = 0;

  entries.forEach((e) => {
    totalRawVolumeMl += e.volumeMl;
    totalEffectiveVolumeMl += e.effectiveVolumeMl;
    totalCaffeineMg += e.caffeineMg || 0;
    totalSugarGrams += e.sugarGrams || 0;
    totalSodiumMg += e.sodiumMg || 0;
  });

  const progressPercent =
    targetVolumeMl > 0 ? Math.min(100, Math.round((totalEffectiveVolumeMl / targetVolumeMl) * 100)) : 0;

  return {
    totalRawVolumeMl: Math.round(totalRawVolumeMl),
    totalEffectiveVolumeMl: Math.round(totalEffectiveVolumeMl),
    totalCaffeineMg: Math.round(totalCaffeineMg),
    totalSugarGrams: +totalSugarGrams.toFixed(1),
    totalSodiumMg: Math.round(totalSodiumMg),
    targetVolumeMl,
    progressPercent
  };
}
