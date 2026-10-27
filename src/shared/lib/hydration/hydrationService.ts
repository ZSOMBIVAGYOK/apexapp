import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  BeverageDefinition,
  HydrationLogEntry,
  STANDARD_BEVERAGES,
  calculateEffectiveHydration
} from "./beverages";

const LOCAL_HYDRATION_PREFIX = "apex_hydration_";
const LOCAL_CUSTOM_BEVERAGES_PREFIX = "apex_custom_beverages_";

/**
 * Get all available beverages (standard + custom)
 */
export function getAllBeverages(userId: string): BeverageDefinition[] {
  const custom = getCustomBeverages(userId);
  return [...STANDARD_BEVERAGES, ...custom];
}

/**
 * Get user custom beverages from localStorage
 */
export function getCustomBeverages(userId: string): BeverageDefinition[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_CUSTOM_BEVERAGES_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Create a user custom beverage
 */
export function createCustomBeverage(
  userId: string,
  input: Omit<BeverageDefinition, "id" | "isCustom">
): BeverageDefinition {
  const id = `bev_custom_${Date.now()}`;
  const custom: BeverageDefinition = {
    ...input,
    id,
    isCustom: true
  };

  const existing = getCustomBeverages(userId);
  const updated = [...existing, custom];
  try {
    localStorage.setItem(
      `${LOCAL_CUSTOM_BEVERAGES_PREFIX}${userId}`,
      JSON.stringify(updated)
    );
  } catch {
    // Ignore
  }

  return custom;
}

/**
 * Fetch daily hydration log for a user on a given date (YYYY-MM-DD)
 */
export async function getDailyHydration(
  userId: string,
  date: string
): Promise<HydrationLogEntry[]> {
  if (!userId || !date) return [];

  const localKey = `${LOCAL_HYDRATION_PREFIX}${userId}_${date}`;
  let cached: HydrationLogEntry[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch {
    // Fallback
  }

  // Seed default demonstration hydration if empty
  if (cached.length === 0) {
    const defaultEntries: HydrationLogEntry[] = [
      {
        id: `seed-1-${date}`,
        athleteId: userId,
        timestamp: `${date}T07:30:00.000Z`,
        timeStr: "07:30",
        date,
        beverageId: "water",
        beverageName: "Víz (csapvíz / ásványvíz)",
        volumeMl: 500,
        hydrationFactor: 1.0,
        effectiveVolumeMl: 500,
        caffeineMg: 0,
        sugarGrams: 0,
        sodiumMg: 25,
        icon: "💧",
        color: "#0284c7"
      },
      {
        id: `seed-2-${date}`,
        athleteId: userId,
        timestamp: `${date}T09:15:00.000Z`,
        timeStr: "09:15",
        date,
        beverageId: "coffee",
        beverageName: "Kávé (espresso / americano)",
        volumeMl: 150,
        hydrationFactor: 0.95,
        effectiveVolumeMl: 143,
        caffeineMg: 98,
        sugarGrams: 0,
        sodiumMg: 3,
        icon: "☕",
        color: "#854d0e"
      },
      {
        id: `seed-3-${date}`,
        athleteId: userId,
        timestamp: `${date}T11:45:00.000Z`,
        timeStr: "11:45",
        date,
        beverageId: "electrolyte_ors",
        beverageName: "Elektrolit / Orális Rehidratációs Ital (ORS)",
        volumeMl: 500,
        hydrationFactor: 1.15,
        effectiveVolumeMl: 575,
        caffeineMg: 0,
        sugarGrams: 10,
        sodiumMg: 550,
        icon: "🧂",
        color: "#06b6d4"
      },
      {
        id: `seed-4-${date}`,
        athleteId: userId,
        timestamp: `${date}T14:30:00.000Z`,
        timeStr: "14:30",
        date,
        beverageId: "water",
        beverageName: "Víz (csapvíz / ásványvíz)",
        volumeMl: 500,
        hydrationFactor: 1.0,
        effectiveVolumeMl: 500,
        caffeineMg: 0,
        sugarGrams: 0,
        sodiumMg: 25,
        icon: "💧",
        color: "#0284c7"
      }
    ];
    try {
      localStorage.setItem(localKey, JSON.stringify(defaultEntries));
      cached = defaultEntries;
    } catch {
      // Ignore
    }
  }

  // Try to sync with Firestore
  try {
    const colRef = collection(db, "athletes", userId, "hydration");
    const snapshot = await getDocs(colRef);
    const remoteList: HydrationLogEntry[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data.date === date) {
        remoteList.push({
          id: d.id,
          athleteId: userId,
          timestamp: data.timestamp || new Date().toISOString(),
          timeStr: data.timeStr || "12:00",
          date: data.date,
          beverageId: data.beverageId || "water",
          beverageName: data.beverageName || "Víz",
          volumeMl: Number(data.volumeMl) || 0,
          hydrationFactor: Number(data.hydrationFactor) || 1.0,
          effectiveVolumeMl:
            Number(data.effectiveVolumeMl) ||
            calculateEffectiveHydration(Number(data.volumeMl) || 0, Number(data.hydrationFactor) || 1.0),
          caffeineMg: Number(data.caffeineMg) || 0,
          sugarGrams: Number(data.sugarGrams) || 0,
          sodiumMg: Number(data.sodiumMg) || 0,
          icon: data.icon || "💧",
          color: data.color || "#0284c7",
          note: data.note
        });
      }
    });

    if (remoteList.length > 0) {
      remoteList.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      localStorage.setItem(localKey, JSON.stringify(remoteList));
      return remoteList;
    }
  } catch (err) {
    // Offline or rules restriction
  }

  return cached;
}

/**
 * Log a beverage intake entry
 */
export async function logBeverageIntake(
  userId: string,
  entryData: {
    beverage: BeverageDefinition;
    volumeMl: number;
    date?: string;
    note?: string;
  }
): Promise<HydrationLogEntry> {
  const { beverage, volumeMl, note } = entryData;
  const now = new Date();
  const date = entryData.date || now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  const effectiveVolumeMl = calculateEffectiveHydration(volumeMl, beverage.hydrationFactor);
  const ratio = volumeMl / 100;
  const caffeineMg = Math.round((beverage.caffeineMgPer100ml || 0) * ratio);
  const sugarGrams = +( (beverage.sugarGramsPer100ml || 0) * ratio ).toFixed(1);
  const sodiumMg = Math.round((beverage.sodiumMgPer100ml || 0) * ratio);

  const entryId = `hyd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const entry: HydrationLogEntry = {
    id: entryId,
    athleteId: userId,
    timestamp: now.toISOString(),
    timeStr,
    date,
    beverageId: beverage.id,
    beverageName: beverage.nameHu,
    volumeMl,
    hydrationFactor: beverage.hydrationFactor,
    effectiveVolumeMl,
    caffeineMg,
    sugarGrams,
    sodiumMg,
    icon: beverage.icon,
    color: beverage.color,
    note
  };

  // 1. Update local cache immediately
  const localKey = `${LOCAL_HYDRATION_PREFIX}${userId}_${date}`;
  try {
    const raw = localStorage.getItem(localKey);
    const existing: HydrationLogEntry[] = raw ? JSON.parse(raw) : [];
    existing.push(entry);
    existing.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    localStorage.setItem(localKey, JSON.stringify(existing));
  } catch {
    // Storage quota
  }

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, "athletes", userId, "hydration", entryId);
    await setDoc(docRef, {
      ...entry,
      createdAt: now.toISOString()
    });
  } catch (err) {
    console.warn("Could not persist hydration entry to Firestore:", err);
  }

  return entry;
}

/**
 * Delete a hydration log entry
 */
export async function deleteHydrationEntry(
  userId: string,
  entryId: string,
  date: string
): Promise<void> {
  const localKey = `${LOCAL_HYDRATION_PREFIX}${userId}_${date}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: HydrationLogEntry[] = JSON.parse(raw);
      const filtered = existing.filter((e) => e.id !== entryId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch {
    // Ignore
  }

  try {
    const docRef = doc(db, "athletes", userId, "hydration", entryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Could not delete hydration entry from Firestore:", err);
  }
}

/**
 * Update an existing hydration log entry
 */
export async function updateHydrationEntry(
  userId: string,
  entryId: string,
  date: string,
  updates: Partial<HydrationLogEntry>
): Promise<void> {
  const localKey = `${LOCAL_HYDRATION_PREFIX}${userId}_${date}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const existing: HydrationLogEntry[] = JSON.parse(raw);
      const updated = existing.map((e) => (e.id === entryId ? { ...e, ...updates } : e));
      localStorage.setItem(localKey, JSON.stringify(updated));
    }
  } catch {
    // Ignore
  }

  try {
    const docRef = doc(db, "athletes", userId, "hydration", entryId);
    await setDoc(docRef, updates, { merge: true });
  } catch (err) {
    console.warn("Could not update hydration entry in Firestore:", err);
  }
}
