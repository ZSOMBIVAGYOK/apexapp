import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SportDefinition, SportCategory, MetricProfile } from "./types";

const LOCAL_CUSTOM_PREFIX = "apex_custom_sports_";
const LOCAL_FAVORITES_PREFIX = "apex_favorite_sports_";
const LOCAL_RECENTS_PREFIX = "apex_recent_sports_";

export interface CreateCustomSportInput {
  nameHu: string;
  nameEn?: string;
  category: SportCategory;
  metricProfile: MetricProfile;
  icon?: string;
}

/**
 * Fetch custom sports created by the user (from Firestore with localStorage fallback)
 */
export async function getCustomSports(userId: string): Promise<SportDefinition[]> {
  if (!userId) return [];

  // Try local cache first for instant UI response
  const localCacheKey = `${LOCAL_CUSTOM_PREFIX}${userId}`;
  let cached: SportDefinition[] = [];
  try {
    const raw = localStorage.getItem(localCacheKey);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse error
  }

  try {
    const colRef = collection(db, "athletes", userId, "customSports");
    const snapshot = await getDocs(colRef);
    const remoteSports: SportDefinition[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      remoteSports.push({
        id: d.id,
        nameHu: data.nameHu || "",
        nameEn: data.nameEn || data.nameHu || "",
        category: data.category || "other",
        metricProfile: data.metricProfile || "duration_only",
        icon: data.icon || "⚡",
        isCustom: true,
        userId
      });
    });

    if (remoteSports.length > 0) {
      localStorage.setItem(localCacheKey, JSON.stringify(remoteSports));
      return remoteSports;
    }
  } catch (err) {
    console.warn("Could not fetch remote custom sports, using local cache:", err);
  }

  return cached;
}

/**
 * Create a new user custom sport
 */
export async function createCustomSport(
  userId: string,
  input: CreateCustomSportInput
): Promise<SportDefinition> {
  const sportId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const sport: SportDefinition = {
    id: sportId,
    nameHu: input.nameHu.trim(),
    nameEn: (input.nameEn || input.nameHu).trim(),
    category: input.category,
    metricProfile: input.metricProfile,
    icon: input.icon || "⚡",
    isCustom: true,
    userId
  };

  // 1. Update local cache immediately
  const localCacheKey = `${LOCAL_CUSTOM_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(localCacheKey);
    const existing: SportDefinition[] = raw ? JSON.parse(raw) : [];
    existing.push(sport);
    localStorage.setItem(localCacheKey, JSON.stringify(existing));
  } catch (err) {
    console.warn("Local storage cache write error:", err);
  }

  // 2. Persist to Firestore if online
  try {
    const docRef = doc(db, "athletes", userId, "customSports", sportId);
    await setDoc(docRef, {
      nameHu: sport.nameHu,
      nameEn: sport.nameEn,
      category: sport.category,
      metricProfile: sport.metricProfile,
      icon: sport.icon,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Could not save custom sport to Firestore (offline fallback active):", err);
  }

  return sport;
}

/**
 * Delete a custom sport
 */
export async function deleteCustomSport(userId: string, sportId: string): Promise<void> {
  const localCacheKey = `${LOCAL_CUSTOM_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(localCacheKey);
    if (raw) {
      const existing: SportDefinition[] = JSON.parse(raw);
      const filtered = existing.filter((s) => s.id !== sportId);
      localStorage.setItem(localCacheKey, JSON.stringify(filtered));
    }
  } catch {
    // Ignore
  }

  try {
    const docRef = doc(db, "athletes", userId, "customSports", sportId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Failed to delete remote custom sport:", err);
  }
}

/**
 * Get favorite sport IDs for user
 */
export function getFavoriteSportIds(userId: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_FAVORITES_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : ["running", "road_cycling", "swimming_pool", "strength_general"];
  } catch {
    return ["running", "road_cycling", "swimming_pool", "strength_general"];
  }
}

/**
 * Toggle favorite sport
 */
export function toggleFavoriteSport(userId: string, sportId: string): string[] {
  if (!userId) return [];
  const current = getFavoriteSportIds(userId);
  const updated = current.includes(sportId)
    ? current.filter((id) => id !== sportId)
    : [...current, sportId];

  try {
    localStorage.setItem(`${LOCAL_FAVORITES_PREFIX}${userId}`, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

/**
 * Get recent sport IDs for user
 */
export function getRecentSportIds(userId: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_RECENTS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Record a recently selected sport
 */
export function recordRecentSport(userId: string, sportId: string): void {
  if (!userId || !sportId) return;
  const current = getRecentSportIds(userId);
  const next = [sportId, ...current.filter((id) => id !== sportId)].slice(0, 10);
  try {
    localStorage.setItem(`${LOCAL_RECENTS_PREFIX}${userId}`, JSON.stringify(next));
  } catch {
    // Ignore
  }
}
