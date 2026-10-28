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
  orderBy
} from "firebase/firestore";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";

const getNutritionKey = (athleteId: string, date: string) => `apex_${athleteId}_nutrition_${date}`;

export async function getNutritionDay(athleteId: string, date: string): Promise<Record<string, any> | null> {
  const localKey = getNutritionKey(athleteId, date);
  let localData: Record<string, any> | null = null;

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) localData = JSON.parse(raw);
  } catch {
    // fallback
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return localData;
  }

  try {
    const dayRef = doc(db, "athletes", athleteId, "nutritionDays", date);
    const snap = await getDoc(dayRef);
    if (snap.exists()) {
      const data = snap.data();
      try {
        localStorage.setItem(localKey, JSON.stringify(data));
      } catch {
        // quota
      }
      return data;
    }
  } catch (err) {
    console.warn("Failed fetching nutrition day from Firestore, using local:", err);
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
