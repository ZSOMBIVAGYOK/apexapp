import { db } from "@shared/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  Unsubscribe
} from "firebase/firestore";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";
import { PlannedDayDocument } from "@shared/types/mealPlan";

const getPlannedDayKey = (athleteId: string, date: string) => `apex_${athleteId}_planned_day_${date}`;

export function getLocalPlannedDay(athleteId: string, date: string): PlannedDayDocument | null {
  try {
    const raw = localStorage.getItem(getPlannedDayKey(athleteId, date));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalPlannedDay(athleteId: string, plannedDay: PlannedDayDocument): void {
  try {
    localStorage.setItem(getPlannedDayKey(athleteId, plannedDay.date), JSON.stringify(plannedDay));
  } catch {
    // quota
  }
}

export function deleteLocalPlannedDay(athleteId: string, date: string): void {
  try {
    localStorage.removeItem(getPlannedDayKey(athleteId, date));
  } catch {
    // quota
  }
}

/**
 * Fetch a single planned day
 */
export async function getPlannedDay(
  athleteId: string,
  date: string,
  options: { forceServer?: boolean } = {}
): Promise<PlannedDayDocument | null> {
  const local = getLocalPlannedDay(athleteId, date);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return local;
  }

  try {
    const dayRef = doc(db, "athletes", athleteId, "plannedDays", date);
    const snap = options.forceServer ? await getDocFromServer(dayRef) : await getDoc(dayRef);
    if (snap.exists()) {
      const data = snap.data() as PlannedDayDocument;
      saveLocalPlannedDay(athleteId, data);
      useSyncStatusStore.getState().recordServerRead();
      return data;
    }
  } catch (err: any) {
    console.warn("Failed to fetch planned day from server:", err);
    useSyncStatusStore.getState().setCacheFallback(true);
  }

  return local;
}

/**
 * Save or update a planned day
 */
export async function savePlannedDay(athleteId: string, plannedDay: PlannedDayDocument): Promise<void> {
  const now = new Date().toISOString();
  const prepared: PlannedDayDocument = {
    ...plannedDay,
    athleteId,
    schemaVersion: 1,
    source: plannedDay.source || "manual",
    confidence: plannedDay.confidence ?? 1.0,
    createdAt: plannedDay.createdAt || now,
    updatedAt: now,
    updatedBy: athleteId
  };

  saveLocalPlannedDay(athleteId, prepared);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return;
  }

  try {
    const dayRef = doc(db, "athletes", athleteId, "plannedDays", prepared.date);
    await setDoc(dayRef, sanitizeForFirestore(prepared));
    useSyncStatusStore.getState().recordServerWrite();
  } catch (err: any) {
    console.warn("Error saving planned day to server:", err);
    useSyncStatusStore.getState().setError(err?.message || "Tervezett nap mentési hiba");
  }
}

/**
 * Delete a planned day
 */
export async function deletePlannedDay(athleteId: string, date: string): Promise<void> {
  deleteLocalPlannedDay(athleteId, date);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return;
  }

  try {
    const dayRef = doc(db, "athletes", athleteId, "plannedDays", date);
    await deleteDoc(dayRef);
    useSyncStatusStore.getState().recordServerWrite();
  } catch (err: any) {
    console.warn("Error deleting planned day from server:", err);
    useSyncStatusStore.getState().setError(err?.message || "Tervezett nap törlési hiba");
  }
}

/**
 * Fetch all planned days in a date range (e.g. for shopping list or week planner)
 */
export async function getPlannedDaysRange(
  athleteId: string,
  startDate: string,
  endDate: string
): Promise<PlannedDayDocument[]> {
  const result: PlannedDayDocument[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0]!;
    const day = await getPlannedDay(athleteId, dateStr);
    if (day) {
      result.push(day);
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Subscribe to real-time changes on a planned day
 */
export function subscribePlannedDay(
  athleteId: string,
  date: string,
  callback: (day: PlannedDayDocument | null) => void
): Unsubscribe {
  if (!athleteId || athleteId === "demo-athlete-001") {
    callback(getLocalPlannedDay(athleteId, date));
    return () => {};
  }

  const dayRef = doc(db, "athletes", athleteId, "plannedDays", date);
  return onSnapshot(
    dayRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PlannedDayDocument;
        saveLocalPlannedDay(athleteId, data);
        callback(data);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn("Real-time planned day listener error:", err);
      callback(getLocalPlannedDay(athleteId, date));
    }
  );
}
