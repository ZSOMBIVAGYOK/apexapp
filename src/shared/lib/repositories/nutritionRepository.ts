/**
 * NUTRITION REPOSITORY
 *
 * Central repository for nutrition logs (athletes/{athleteId}/nutritionDays/{date}).
 * Manages daily meals, macronutrient tracking, targets, and Firestore sync.
 */

import { db } from "@shared/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  getDocFromServer,
  Unsubscribe
} from "firebase/firestore";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";

const getNutritionKey = (athleteId: string, date: string) => `apex_${athleteId}_nutrition_${date}`;

/**
 * Real-time listener for athlete daily nutrition meals.
 */
export function subscribeNutritionDay(
  athleteId: string,
  date: string,
  onData: (data: Record<string, any> | null, meta: { fromCache: boolean }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!athleteId || athleteId === "demo-athlete-001") {
    const localKey = getNutritionKey(athleteId, date);
    try {
      const raw = localStorage.getItem(localKey);
      onData(raw ? JSON.parse(raw) : null, { fromCache: true });
    } catch {
      onData(null, { fromCache: true });
    }
    return () => {};
  }

  const dayRef = doc(db, "athletes", athleteId, "nutritionDays", date);
  return onSnapshot(
    dayRef,
    { includeMetadataChanges: true },
    (snap) => {
      const fromCache = snap.metadata.fromCache;
      if (snap.exists()) {
        const data = snap.data();
        try {
          localStorage.setItem(getNutritionKey(athleteId, date), JSON.stringify(data));
        } catch {
          // storage quota
        }
        if (!fromCache) useSyncStatusStore.getState().recordServerRead();
        onData(data, { fromCache });
      } else {
        onData(null, { fromCache });
      }
    },
    (err) => {
      console.warn("Real-time nutrition notice:", err);
      useSyncStatusStore.getState().setCacheFallback(true);
      onError?.(err);
    }
  );
}

export async function getNutritionDay(
  athleteId: string,
  date: string,
  options: { forceServer?: boolean } = {}
): Promise<Record<string, any> | null> {
  const localKey = getNutritionKey(athleteId, date);
  let localData: Record<string, any> | null = null;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localData = JSON.parse(raw);
  } catch {
    // fallback
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useSyncStatusStore.getState().setCacheFallback(true);
    return localData;
  }

  try {
    const dayRef = doc(db, "athletes", athleteId, "nutritionDays", date);
    const snap = options.forceServer ? await getDocFromServer(dayRef) : await getDoc(dayRef);
    if (snap.exists()) {
      const data = snap.data();
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch {
        // quota
      }
      if (!snap.metadata.fromCache) {
        useSyncStatusStore.getState().recordServerRead();
      } else {
        useSyncStatusStore.getState().setCacheFallback(true);
      }
      return data;
    }
  } catch (err: any) {
    console.warn("Failed fetching nutrition day from Firestore, using local:", err);
    useSyncStatusStore.getState().setCacheFallback(true, err?.message);
  }

  return localData;
}

export async function saveNutritionDay(
  athleteId: string,
  date: string,
  data: Record<string, any>
): Promise<void> {
  const localKey = getNutritionKey(athleteId, date);
  const normalized = {
    ...data,
    athleteId,
    date,
    schemaVersion: 1,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(localKey, JSON.stringify(normalized));
  } catch {
    // quota
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  useSyncStatusStore.getState().setSyncing();

  try {
    const dayRef = doc(db, "athletes", athleteId, "nutritionDays", date);
    const cleanDoc = sanitizeForFirestore(normalized);
    await setDoc(dayRef, cleanDoc, { merge: true });
    useSyncStatusStore.getState().recordServerWrite();
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed saving nutrition day to Firestore:", err);
    useSyncStatusStore.getState().setError(err?.message || "Étrend mentési hiba");
  }
}

export async function getAllNutritionDays(athleteId: string): Promise<Array<Record<string, any>>> {
  try {
    const colRef = collection(db, "athletes", athleteId, "nutritionDays");
    const q = query(colRef, orderBy("date", "desc"));
    const snap = await getDocs(q);
    const results: Array<Record<string, any>> = [];
    snap.forEach((d) => results.push(d.data()));
    return results;
  } catch {
    return [];
  }
}
