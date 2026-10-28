/**
 * TRASH REPOSITORY
 *
 * Manages soft-deleted entities across the application (sessions, workouts, equipment, etc.).
 * Soft-deleted items are retained for 30 days with one-click restore and permanent purge.
 */

import { differenceInDays, parseISO } from "date-fns";
import {
  getSessions,
  restoreSession,
  permanentDeleteSession
} from "./sessionRepository";
import {
  getPlannedWorkouts,
  restorePlannedWorkout,
  permanentDeletePlannedWorkout
} from "./plannedWorkoutRepository";
import { getEquipmentList } from "@shared/lib/equipment/equipmentService";
import { getExercises } from "@shared/lib/exercises/exerciseService";
import { getRecords } from "@shared/lib/records/recordsService";
import { db } from "@shared/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

export type TrashItemType = "session" | "workout" | "equipment" | "exercise" | "record";

export interface TrashItem {
  id: string;
  athleteId: string;
  type: TrashItemType;
  title: string;
  subtitle?: string;
  deletedAt: string;
  daysRemaining: number;
  originalData: any;
}

const RETENTION_DAYS = 30;

export async function getTrashItems(athleteId: string): Promise<TrashItem[]> {
  const items: TrashItem[] = [];
  const now = new Date();

  // 1. Soft-deleted sessions
  try {
    const allSessions = await getSessions(athleteId, { includeDeleted: true });
    allSessions
      .filter((s) => s.deletedAt)
      .forEach((s) => {
        const delDate = parseISO(s.deletedAt!);
        const elapsed = differenceInDays(now, delDate);
        const remaining = Math.max(0, RETENTION_DAYS - elapsed);
        items.push({
          id: s.sessionId,
          athleteId,
          type: "session",
          title: s.title || `${s.sport} edzés`,
          subtitle: `${s.date} · ${s.durationMinutes} perc`,
          deletedAt: s.deletedAt!,
          daysRemaining: remaining,
          originalData: s
        });
      });
  } catch (err) {
    console.warn("Failed fetching trash sessions:", err);
  }

  // 2. Soft-deleted planned workouts
  try {
    const allWorkouts = await getPlannedWorkouts(athleteId, { includeDeleted: true });
    allWorkouts
      .filter((w) => w.deletedAt)
      .forEach((w) => {
        const delDate = parseISO(w.deletedAt!);
        const elapsed = differenceInDays(now, delDate);
        const remaining = Math.max(0, RETENTION_DAYS - elapsed);
        items.push({
          id: w.id,
          athleteId,
          type: "workout",
          title: w.title || `${w.sport} edzésterv`,
          subtitle: `${w.date} · ${w.plannedDurationMinutes} perc`,
          deletedAt: w.deletedAt!,
          daysRemaining: remaining,
          originalData: w
        });
      });
  } catch (err) {
    console.warn("Failed fetching trash workouts:", err);
  }

  // 3. Soft-deleted equipment
  try {
    const allEquipment = await getEquipmentList(athleteId);
    allEquipment
      .filter((e) => e.deletedAt)
      .forEach((e) => {
        const delDate = parseISO(e.deletedAt!);
        const elapsed = differenceInDays(now, delDate);
        const remaining = Math.max(0, RETENTION_DAYS - elapsed);
        items.push({
          id: e.id,
          athleteId,
          type: "equipment",
          title: e.name,
          subtitle: `${e.brand} ${e.model || ""} · ${Math.round(e.totalKm || 0)} km`,
          deletedAt: e.deletedAt!,
          daysRemaining: remaining,
          originalData: e
        });
      });
  } catch (err) {
    console.warn("Failed fetching trash equipment:", err);
  }

  // 4. Soft-deleted exercises
  try {
    const allExercises = await getExercises(athleteId);
    allExercises
      .filter((ex) => ex.deletedAt)
      .forEach((ex) => {
        const delDate = parseISO(ex.deletedAt!);
        const elapsed = differenceInDays(now, delDate);
        const remaining = Math.max(0, RETENTION_DAYS - elapsed);
        items.push({
          id: ex.id,
          athleteId,
          type: "exercise",
          title: ex.name,
          subtitle: ex.category || "Gyakorlat",
          deletedAt: ex.deletedAt!,
          daysRemaining: remaining,
          originalData: ex
        });
      });
  } catch (err) {
    console.warn("Failed fetching trash exercises:", err);
  }

  // 5. Soft-deleted records
  try {
    const allRecords = await getRecords(athleteId);
    allRecords
      .filter((r) => r.deletedAt)
      .forEach((r) => {
        const delDate = parseISO(r.deletedAt!);
        const elapsed = differenceInDays(now, delDate);
        const remaining = Math.max(0, RETENTION_DAYS - elapsed);
        items.push({
          id: r.id,
          athleteId,
          type: "record",
          title: `${r.sportName}: ${r.discipline}`,
          subtitle: `${r.displayValue} · ${r.date}`,
          deletedAt: r.deletedAt!,
          daysRemaining: remaining,
          originalData: r
        });
      });
  } catch (err) {
    console.warn("Failed fetching trash records:", err);
  }

  // Sort by deletion date descending (most recently deleted first)
  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreTrashItem(item: TrashItem): Promise<void> {
  if (item.type === "session") {
    await restoreSession(item.athleteId, item.id);
  } else if (item.type === "workout") {
    await restorePlannedWorkout(item.athleteId, item.id);
  } else if (item.type === "equipment") {
    const ref = doc(db, "athletes", item.athleteId, "equipment", item.id);
    await setDoc(ref, { deletedAt: null }, { merge: true });
  } else if (item.type === "exercise") {
    const ref = doc(db, "athletes", item.athleteId, "exercises", item.id);
    await setDoc(ref, { deletedAt: null }, { merge: true });
  } else if (item.type === "record") {
    const ref = doc(db, "athletes", item.athleteId, "records", item.id);
    await setDoc(ref, { deletedAt: null }, { merge: true });
  }
}

export async function permanentDeleteTrashItem(item: TrashItem): Promise<void> {
  if (item.type === "session") {
    await permanentDeleteSession(item.athleteId, item.id);
  } else if (item.type === "workout") {
    await permanentDeletePlannedWorkout(item.athleteId, item.id);
  } else if (item.type === "equipment") {
    const ref = doc(db, "athletes", item.athleteId, "equipment", item.id);
    await deleteDoc(ref);
  } else if (item.type === "exercise") {
    const ref = doc(db, "athletes", item.athleteId, "exercises", item.id);
    await deleteDoc(ref);
  } else if (item.type === "record") {
    const ref = doc(db, "athletes", item.athleteId, "records", item.id);
    await deleteDoc(ref);
  }
}
