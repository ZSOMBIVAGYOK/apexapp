/**
 * Food Service & Sports Nutrition Database
 *
 * Provides instant client-side lookup for sports-nutrition staple foods,
 * custom food items, recipes, recent items, and favorites, with seamless
 * delegation to Cloud Functions proxies (Open Food Facts & USDA) when online.
 */

import { FoodItem, MicronutrientProfile } from "@shared/types/nutrition";
import { httpsCallable } from "firebase/functions";
import { functions } from "@shared/lib/firebase";

/**
 * Curated elite sports nutrition staple foods with honest micronutrient coverage
 */
export const CURATED_SPORTS_FOODS: FoodItem[] = [
  {
    id: "curated_oats",
    name: "Zabpehely (egész szemű)",
    brand: "Bio / Natúr",
    source: "verified",
    servingSizeGrams: 50,
    servingUnit: "1 adag (50g)",
    caloriesPer100g: 375,
    proteinPer100g: 13.5,
    carbsPer100g: 62.0,
    fatPer100g: 7.0,
    microsPer100g: {
      fiberGrams: 10.0,
      sugarGrams: 1.0,
      saturatedFatGrams: 1.2,
      sodiumMg: 5,
      potassiumMg: 350,
      calciumMg: 54,
      ironMg: 4.7,
      magnesiumMg: 138,
      zincMg: 3.2
    },
    category: "Gabona",
    isFavorite: true
  },
  {
    id: "curated_chicken_breast",
    name: "Csirkemellfilé (nyers)",
    brand: "Friss hús",
    source: "verified",
    servingSizeGrams: 150,
    servingUnit: "1 filé (150g)",
    caloriesPer100g: 120,
    proteinPer100g: 22.5,
    carbsPer100g: 0.0,
    fatPer100g: 2.6,
    microsPer100g: {
      fiberGrams: 0,
      sugarGrams: 0,
      saturatedFatGrams: 0.6,
      sodiumMg: 65,
      potassiumMg: 330,
      calciumMg: 11,
      ironMg: 0.9,
      magnesiumMg: 28,
      zincMg: 0.9,
      vitaminB12Mcg: 0.35
    },
    category: "Fehérjeforrás",
    isFavorite: true
  },
  {
    id: "curated_jasmine_rice",
    name: "Jázminrizs (főzetlen)",
    brand: "Prémium",
    source: "verified",
    servingSizeGrams: 80,
    servingUnit: "1 adag (80g)",
    caloriesPer100g: 355,
    proteinPer100g: 7.1,
    carbsPer100g: 79.0,
    fatPer100g: 0.7,
    microsPer100g: {
      fiberGrams: 1.3,
      sugarGrams: 0.1,
      sodiumMg: 2,
      potassiumMg: 115,
      calciumMg: 10,
      ironMg: 1.2,
      magnesiumMg: 25
    },
    category: "Szénhidrátforrás",
    isFavorite: true
  },
  {
    id: "curated_banana",
    name: "Banán (friss)",
    brand: "Gyümölcs",
    source: "verified",
    servingSizeGrams: 120,
    servingUnit: "1 közepes db (120g)",
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    microsPer100g: {
      fiberGrams: 2.6,
      sugarGrams: 12.2,
      potassiumMg: 358,
      calciumMg: 5,
      magnesiumMg: 27,
      vitaminB12Mcg: 0.0
    },
    category: "Gyümölcs",
    isFavorite: true
  },
  {
    id: "curated_greek_yogurt",
    name: "Görög joghurt 0% / 2%",
    brand: "Natúr",
    source: "verified",
    servingSizeGrams: 150,
    servingUnit: "1 doboz (150g)",
    caloriesPer100g: 58,
    proteinPer100g: 10.2,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    microsPer100g: {
      sugarGrams: 3.6,
      calciumMg: 110,
      potassiumMg: 140,
      sodiumMg: 45,
      vitaminB12Mcg: 0.52
    },
    category: "Tejtermék",
    isFavorite: true
  },
  {
    id: "curated_whey_isolate",
    name: "Tejsavófehérje izolátum (WPI 90)",
    brand: "Sporttáplálkozás",
    source: "verified",
    servingSizeGrams: 30,
    servingUnit: "1 adagolókanál (30g)",
    caloriesPer100g: 370,
    proteinPer100g: 88.0,
    carbsPer100g: 1.5,
    fatPer100g: 1.0,
    microsPer100g: {
      sodiumMg: 170,
      calciumMg: 450,
      potassiumMg: 420
    },
    category: "Kiegészítő",
    isFavorite: true
  },
  {
    id: "curated_energy_gel",
    name: "Energiagél (maltodextrin + fruktóz 2:1)",
    brand: "Endurance Fuel",
    source: "verified",
    servingSizeGrams: 60,
    servingUnit: "1 gél tasak (60g)",
    caloriesPer100g: 215,
    proteinPer100g: 0.0,
    carbsPer100g: 54.0,
    fatPer100g: 0.0,
    microsPer100g: {
      sugarGrams: 22.0,
      sodiumMg: 350,
      potassiumMg: 80,
      magnesiumMg: 20
    },
    category: "Edzés alatti üzemanyag",
    isFavorite: true
  },
  {
    id: "curated_isotonic_drink",
    name: "Izotóniás sportital (elektrolitos)",
    brand: "Pro Sport",
    source: "verified",
    servingSizeGrams: 500,
    servingUnit: "1 kulacs (500ml)",
    caloriesPer100g: 28,
    proteinPer100g: 0.0,
    carbsPer100g: 6.8,
    fatPer100g: 0.0,
    microsPer100g: {
      sugarGrams: 4.5,
      sodiumMg: 60,
      potassiumMg: 25,
      magnesiumMg: 8
    },
    category: "Hidratáció",
    isFavorite: true
  },
  {
    id: "curated_eggs",
    name: "Egész tojás (L-es)",
    brand: "Friss szabadtartású",
    source: "verified",
    servingSizeGrams: 60,
    servingUnit: "1 db (60g)",
    caloriesPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    microsPer100g: {
      saturatedFatGrams: 3.1,
      sodiumMg: 142,
      potassiumMg: 138,
      calciumMg: 56,
      ironMg: 1.8,
      vitaminDMcg: 2.0,
      vitaminB12Mcg: 0.89,
      zincMg: 1.3
    },
    category: "Fehérjeforrás",
    isFavorite: true
  },
  {
    id: "curated_salmon",
    name: "Lazacfilé (nyers)",
    brand: "Vadlazac / Atlanti",
    source: "verified",
    servingSizeGrams: 150,
    servingUnit: "1 adag (150g)",
    caloriesPer100g: 208,
    proteinPer100g: 20.4,
    carbsPer100g: 0.0,
    fatPer100g: 13.4,
    microsPer100g: {
      saturatedFatGrams: 3.1,
      omega3Grams: 2.6,
      sodiumMg: 59,
      potassiumMg: 363,
      vitaminDMcg: 11.0,
      vitaminB12Mcg: 3.2
    },
    category: "Halak & Omega-3",
    isFavorite: true
  },
  {
    id: "curated_sweet_potato",
    name: "Édesburgonya (sütve)",
    brand: "Zöldség",
    source: "verified",
    servingSizeGrams: 200,
    servingUnit: "1 közepes db (200g)",
    caloriesPer100g: 90,
    proteinPer100g: 2.0,
    carbsPer100g: 20.7,
    fatPer100g: 0.1,
    microsPer100g: {
      fiberGrams: 3.3,
      sugarGrams: 6.5,
      potassiumMg: 475,
      calciumMg: 38,
      magnesiumMg: 27
    },
    category: "Zöldség & Szénhidrát"
  },
  {
    id: "curated_peanut_butter",
    name: "Mogyoróvaj (100% natúr)",
    brand: "Natúr",
    source: "verified",
    servingSizeGrams: 25,
    servingUnit: "1 evőkanál (25g)",
    caloriesPer100g: 588,
    proteinPer100g: 25.0,
    carbsPer100g: 20.0,
    fatPer100g: 50.0,
    microsPer100g: {
      fiberGrams: 8.0,
      saturatedFatGrams: 7.0,
      magnesiumMg: 154,
      zincMg: 2.9
    },
    category: "Egészséges zsírok"
  }
];

const CUSTOM_FOODS_STORAGE_KEY = "apex_custom_foods";
const FAVORITES_STORAGE_KEY = "apex_nutrition_favorites";
const RECENTS_STORAGE_KEY = "apex_nutrition_recents";

export class FoodService {
  /**
   * Search foods across curated local library, custom foods, and Cloud Functions proxy
   */
  static async searchFoods(
    query: string,
    source: "all" | "off" | "usda" = "all"
  ): Promise<FoodItem[]> {
    const q = query.trim().toLowerCase();
    const custom = this.getCustomFoods();
    const allLocal = [...CURATED_SPORTS_FOODS, ...custom];

    // Local filter first for instant UI response
    const localMatches = q
      ? allLocal.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            (f.brand && f.brand.toLowerCase().includes(q)) ||
            (f.category && f.category.toLowerCase().includes(q))
        )
      : allLocal;

    if (q.length < 2) {
      return localMatches;
    }

    // Try Cloud Function proxy if online
    try {
      const searchFn = httpsCallable<{ query: string; source: string }, { foods: FoodItem[] }>(
        functions,
        "searchFoods"
      );
      const res = await searchFn({ query: q, source });
      if (res.data?.foods && Array.isArray(res.data.foods)) {
        // Merge without duplicating IDs
        const existingIds = new Set(localMatches.map((f) => f.id));
        const newRemote = res.data.foods.filter((f) => !existingIds.has(f.id));
        return [...localMatches, ...newRemote];
      }
    } catch {
      // Offline fallback: returns local matches
    }

    return localMatches;
  }

  /**
   * Lookup barcode via Cloud Function proxy or local library
   */
  static async lookupBarcode(barcode: string): Promise<FoodItem | null> {
    const clean = barcode.trim();
    if (!clean) return null;

    // Check local database first
    const local = [...CURATED_SPORTS_FOODS, ...this.getCustomFoods()].find(
      (f) => f.barcode === clean
    );
    if (local) return local;

    try {
      const barcodeFn = httpsCallable<{ barcode: string }, { food: FoodItem | null }>(
        functions,
        "getFoodByBarcode"
      );
      const res = await barcodeFn({ barcode: clean });
      if (res.data?.food) {
        return res.data.food;
      }
    } catch {
      // Offline or network error
    }

    return null;
  }

  static getCustomFoods(): FoodItem[] {
    try {
      const raw = localStorage.getItem(CUSTOM_FOODS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveCustomFood(food: Omit<FoodItem, "id">): FoodItem {
    const custom = this.getCustomFoods();
    const newFood: FoodItem = {
      ...food,
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: "custom"
    };
    custom.unshift(newFood);
    try {
      localStorage.setItem(CUSTOM_FOODS_STORAGE_KEY, JSON.stringify(custom));
    } catch {
      // ignore
    }
    return newFood;
  }

  static getFavorites(): FoodItem[] {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const favIds: string[] = raw ? JSON.parse(raw) : [];
      const all = [...CURATED_SPORTS_FOODS, ...this.getCustomFoods()];
      return all.filter((f) => favIds.includes(f.id));
    } catch {
      return CURATED_SPORTS_FOODS.filter((f) => f.isFavorite);
    }
  }

  static toggleFavorite(foodId: string): boolean {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      let favIds: string[] = raw ? JSON.parse(raw) : [];
      const exists = favIds.includes(foodId);
      if (exists) {
        favIds = favIds.filter((id) => id !== foodId);
      } else {
        favIds.push(foodId);
      }
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favIds));
      return !exists;
    } catch {
      return false;
    }
  }

  static getRecents(): FoodItem[] {
    try {
      const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static addRecent(food: FoodItem) {
    try {
      const recents = this.getRecents().filter((f) => f.id !== food.id);
      recents.unshift(food);
      localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents.slice(0, 20)));
    } catch {
      // ignore
    }
  }

  /**
   * Calculates nutrient contribution of a specific portion size in grams
   */
  static calculateServingNutrients(
    food: FoodItem,
    grams: number
  ): {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    micros: MicronutrientProfile;
    coverageScore: number;
    missingNutrients: string[];
  } {
    const factor = Math.max(0, grams) / 100;
    const calories = Math.round(food.caloriesPer100g * factor);
    const proteinGrams = Math.round(food.proteinPer100g * factor * 10) / 10;
    const carbsGrams = Math.round(food.carbsPer100g * factor * 10) / 10;
    const fatGrams = Math.round(food.fatPer100g * factor * 10) / 10;

    const micros: MicronutrientProfile = {};
    const missing: string[] = [];
    const srcMicros = food.microsPer100g || {};

    const scaleMicros = (
      val: number | undefined,
      key: keyof MicronutrientProfile,
      name: string
    ) => {
      if (typeof val === "number") {
        micros[key] = Math.round(val * factor * 100) / 100;
      } else {
        missing.push(name);
      }
    };

    scaleMicros(srcMicros.fiberGrams, "fiberGrams", "Élelmi rost");
    scaleMicros(srcMicros.sugarGrams, "sugarGrams", "Cukor");
    scaleMicros(srcMicros.saturatedFatGrams, "saturatedFatGrams", "Telített zsírsav");
    scaleMicros(srcMicros.sodiumMg, "sodiumMg", "Nátrium");
    scaleMicros(srcMicros.potassiumMg, "potassiumMg", "Kálium");
    scaleMicros(srcMicros.calciumMg, "calciumMg", "Kalcium");
    scaleMicros(srcMicros.ironMg, "ironMg", "Vas");
    scaleMicros(srcMicros.vitaminDMcg, "vitaminDMcg", "D-vitamin");
    scaleMicros(srcMicros.vitaminB12Mcg, "vitaminB12Mcg", "B12-vitamin");
    scaleMicros(srcMicros.magnesiumMg, "magnesiumMg", "Magnézium");
    scaleMicros(srcMicros.zincMg, "zincMg", "Cink");
    scaleMicros(srcMicros.omega3Grams, "omega3Grams", "Omega-3");

    const totalTracked = 12;
    const reportedCount = totalTracked - missing.length;
    const coverageScore = Math.round((reportedCount / totalTracked) * 100);

    return {
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      micros,
      coverageScore,
      missingNutrients: missing
    };
  }
}
