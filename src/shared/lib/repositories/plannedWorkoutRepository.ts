/**
 * PLANNED WORKOUT REPOSITORY
 *
 * Central repository for planned workouts (athletes/{athleteId}/plannedWorkouts).
 * Manages calendar workouts, synchronization with Firestore, soft delete and offline cache.
 */

import { db } from "@shared/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocsFromServer,
  Unsubscribe
} from "firebase/firestore";
import { PlannedWorkout } from "@shared/types/training";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";

const getLocalKey = (athleteId: string) => `apex_planned_workouts_${athleteId}`;

function getLocalWorkouts(athleteId: string): PlannedWorkout[] {
  try {
    const raw = localStorage.getItem(getLocalKey(athleteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalWorkouts(athleteId: string, workouts: PlannedWorkout[]) {
  try {
    localStorage.setItem(getLocalKey(athleteId), JSON.stringify(workouts));
  } catch {
    // Local storage full
  }
}

/**
 * Real-time listener for athlete planned workouts.
 */
export function subscribePlannedWorkouts(
  athleteId: string,
  onData: (workouts: PlannedWorkout[], meta: { fromCache: boolean }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!athleteId || athleteId === "demo-athlete-001") {
    const local = getLocalWorkouts(athleteId);
    onData(local.filter((w) => !w.deletedAt), { fromCache: true });
    return () => {};
  }

  const colRef = collection(db, "athletes", athleteId, "plannedWorkouts");
  const q = query(colRef, orderBy("date", "desc"));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const fromCache = snapshot.metadata.fromCache;
      const serverWorkouts: PlannedWorkout[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as PlannedWorkout;
        serverWorkouts.push({
          ...data,
          id: data.id || d.id
        });
      });

      setLocalWorkouts(athleteId, serverWorkouts);

      if (!fromCache) {
        useSyncStatusStore.getState().recordServerRead();
      }

      onData(serverWorkouts.filter((w) => !w.deletedAt), { fromCache });
    },
    (err) => {
      console.warn("Real-time workouts subscription notice:", err);
      useSyncStatusStore.getState().setCacheFallback(true, "Nem sikerült elérni a szervert.");
      onError?.(err);
    }
  );
}

/**
 * Fetch all planned workouts for an athlete.
 */
export async function getPlannedWorkouts(
  athleteId: string,
  options: { includeDeleted?: boolean; forceServer?: boolean } = {}
): Promise<PlannedWorkout[]> {
  const localList = getLocalWorkouts(athleteId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useSyncStatusStore.getState().setCacheFallback(true);
    if (options.includeDeleted) return localList;
    return localList.filter((w) => !w.deletedAt);
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "plannedWorkouts");
    const q = query(colRef, orderBy("date", "desc"));
    const snapshot = options.forceServer ? await getDocsFromServer(q) : await getDocs(q);

    const serverWorkouts: PlannedWorkout[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as PlannedWorkout;
      serverWorkouts.push({
        ...data,
        id: data.id || d.id
      });
    });

    setLocalWorkouts(athleteId, serverWorkouts);

    if (!snapshot.metadata.fromCache) {
      useSyncStatusStore.getState().recordServerRead();
    } else {
      useSyncStatusStore.getState().setCacheFallback(true);
    }

    if (options.includeDeleted) {
      return serverWorkouts;
    }
    return serverWorkouts.filter((w) => !w.deletedAt);
  } catch (err: any) {
    console.warn("Failed fetching planned workouts from Firestore, using local cache:", err);
    useSyncStatusStore.getState().setCacheFallback(true, err?.message || "Nem sikerült elérni a szervert.");
    if (options.includeDeleted) return localList;
    return localList.filter((w) => !w.deletedAt);
  }
}

/**
 * Save or update a planned workout.
 */
export async function savePlannedWorkout(workout: PlannedWorkout): Promise<PlannedWorkout> {
  const now = new Date().toISOString();
  const normalized: PlannedWorkout = {
    ...workout,
    schemaVersion: 1,
    deletedAt: null,
    updatedAt: now,
    createdAt: workout.createdAt || now
  };

  const localList = getLocalWorkouts(normalized.athleteId);
  const idx = localList.findIndex((w) => w.id === normalized.id);
  if (idx >= 0) {
    localList[idx] = normalized;
  } else {
    localList.unshift(normalized);
  }
  setLocalWorkouts(normalized.athleteId, localList);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return normalized;
  }

  useSyncStatusStore.getState().setSyncing();

  try {
    const workoutRef = doc(db, "athletes", normalized.athleteId, "plannedWorkouts", normalized.id);
    const cleanDoc = sanitizeForFirestore(normalized);
    await setDoc(workoutRef, cleanDoc, { merge: true });
    useSyncStatusStore.getState().recordServerWrite();
    useSyncStatusStore.getState().setSaved();
    return normalized;
  } catch (err: any) {
    console.warn("Error saving planned workout to Firestore:", err);
    useSyncStatusStore.getState().setError(err?.message || "Edzésterv mentési hiba");
    return normalized;
  }
}

/**
 * Soft delete a planned workout.
 */
export async function softDeletePlannedWorkout(athleteId: string, workoutId: string): Promise<void> {
  const now = new Date().toISOString();
  const localList = getLocalWorkouts(athleteId);
  const item = localList.find((w) => w.id === workoutId);
  if (item) {
    item.deletedAt = now;
    setLocalWorkouts(athleteId, localList);
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    const workoutRef = doc(db, "athletes", athleteId, "plannedWorkouts", workoutId);
    await setDoc(workoutRef, { deletedAt: now }, { merge: true });
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed soft-deleting planned workout:", err);
    useSyncStatusStore.getState().setError(err?.message || "Törlési hiba");
  }
}

/**
 * Restore a soft-deleted planned workout.
 */
export async function restorePlannedWorkout(athleteId: string, workoutId: string): Promise<void> {
  const localList = getLocalWorkouts(athleteId);
  const item = localList.find((w) => w.id === workoutId);
  if (item) {
    item.deletedAt = null;
    setLocalWorkouts(athleteId, localList);
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    const workoutRef = doc(db, "athletes", athleteId, "plannedWorkouts", workoutId);
    await setDoc(workoutRef, { deletedAt: null }, { merge: true });
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed restoring planned workout:", err);
    useSyncStatusStore.getState().setError(err?.message || "Visszaállítási hiba");
  }
}

/**
 * Permanently delete a planned workout.
 */
export async function permanentDeletePlannedWorkout(athleteId: string, workoutId: string): Promise<void> {
  const localList = getLocalWorkouts(athleteId).filter((w) => w.id !== workoutId);
  setLocalWorkouts(athleteId, localList);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    const workoutRef = doc(db, "athletes", athleteId, "plannedWorkouts", workoutId);
    await deleteDoc(workoutRef);
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed permanently deleting planned workout:", err);
  }
}
