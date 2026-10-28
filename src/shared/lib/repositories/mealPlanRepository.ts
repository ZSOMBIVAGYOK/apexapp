import { db } from "@shared/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";
import { MealPlanDocument } from "@shared/types/mealPlan";

const getMealPlansKey = (athleteId: string) => `apex_${athleteId}_meal_plans`;

function getLocalPlans(athleteId: string): MealPlanDocument[] {
  try {
    const raw = localStorage.getItem(getMealPlansKey(athleteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPlans(athleteId: string, plans: MealPlanDocument[]): void {
  try {
    localStorage.setItem(getMealPlansKey(athleteId), JSON.stringify(plans));
  } catch {
    // quota
  }
}

/**
 * Fetch all meal plans for an athlete with offline fallback
 */
export async function getMealPlans(
  athleteId: string,
  options: { includeArchived?: boolean; includeDeleted?: boolean; forceServer?: boolean } = {}
): Promise<MealPlanDocument[]> {
  const localList = getLocalPlans(athleteId);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return filterPlans(localList, options);
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "mealPlans");
    const snap = await getDocs(colRef);

    if (!snap.empty) {
      const serverPlans: MealPlanDocument[] = [];
      snap.forEach((d) => {
        const data = d.data() as MealPlanDocument;
        serverPlans.push({ ...data, id: d.id });
      });

      // Merge and save locally
      saveLocalPlans(athleteId, serverPlans);
      useSyncStatusStore.getState().recordServerRead();
      return filterPlans(serverPlans, options);
    }
  } catch (err: any) {
    console.warn("Failed to fetch meal plans from server, falling back to cache:", err);
    useSyncStatusStore.getState().setCacheFallback(true);
  }

  return filterPlans(localList, options);
}

function filterPlans(
  plans: MealPlanDocument[],
  options: { includeArchived?: boolean; includeDeleted?: boolean }
): MealPlanDocument[] {
  return plans.filter((p) => {
    if (!options.includeDeleted && p.deletedAt) return false;
    if (!options.includeArchived && p.archived) return false;
    return true;
  });
}

/**
 * Get active meal plan for the athlete
 */
export async function getActiveMealPlan(athleteId: string): Promise<MealPlanDocument | null> {
  const plans = await getMealPlans(athleteId);
  return plans.find((p) => p.isActive && !p.archived && !p.deletedAt) || null;
}

/**
 * Save or update a meal plan
 */
export async function saveMealPlan(athleteId: string, plan: MealPlanDocument): Promise<void> {
  const localList = getLocalPlans(athleteId);
  const now = new Date().toISOString();

  const prepared: MealPlanDocument = {
    ...plan,
    athleteId,
    schemaVersion: 1,
    source: plan.source || "manual",
    confidence: plan.confidence ?? 1.0,
    createdAt: plan.createdAt || now,
    updatedAt: now,
    updatedBy: athleteId
  };

  // If this plan is set to active, deactivate all other plans
  let updatedList: MealPlanDocument[];
  if (prepared.isActive) {
    updatedList = localList.map((p) => (p.id === prepared.id ? prepared : { ...p, isActive: false }));
    if (!updatedList.some((p) => p.id === prepared.id)) {
      updatedList.unshift(prepared);
    }
  } else {
    const idx = localList.findIndex((p) => p.id === prepared.id);
    if (idx >= 0) {
      updatedList = [...localList];
      updatedList[idx] = prepared;
    } else {
      updatedList = [prepared, ...localList];
    }
  }

  saveLocalPlans(athleteId, updatedList);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    typeof process !== "undefined" && process.env?.NODE_ENV === "test"
  ) {
    return;
  }

  try {
    const planRef = doc(db, "athletes", athleteId, "mealPlans", prepared.id);
    await setDoc(planRef, sanitizeForFirestore(prepared));

    // If active, sync deactivated state of other plans
    if (prepared.isActive) {
      for (const p of updatedList) {
        if (p.id !== prepared.id && p.isActive) {
          const otherRef = doc(db, "athletes", athleteId, "mealPlans", p.id);
          await setDoc(otherRef, { isActive: false, updatedAt: now }, { merge: true });
        }
      }
    }
    useSyncStatusStore.getState().recordServerWrite();
  } catch (err: any) {
    console.warn("Error persisting meal plan to server:", err);
    useSyncStatusStore.getState().setError(err?.message || "Étrend mentési hiba");
  }
}

/**
 * Sets a specific plan as active and deactivates others
 */
export async function setActiveMealPlan(athleteId: string, planId: string): Promise<void> {
  const localList = getLocalPlans(athleteId);
  const target = localList.find((p) => p.id === planId);
  if (!target) return;

  target.isActive = true;
  await saveMealPlan(athleteId, target);
}

/**
 * Duplicates a meal plan
 */
export async function duplicateMealPlan(
  athleteId: string,
  planId: string,
  newTitle?: string
): Promise<MealPlanDocument | null> {
  const plans = await getMealPlans(athleteId, { includeArchived: true });
  const original = plans.find((p) => p.id === planId);
  if (!original) return null;

  const now = new Date().toISOString();
  const cloned: MealPlanDocument = {
    ...JSON.parse(JSON.stringify(original)),
    id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: newTitle || `${original.title} (Másolat)`,
    isActive: false,
    archived: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
    updatedBy: athleteId
  };

  await saveMealPlan(athleteId, cloned);
  return cloned;
}

/**
 * Archive a meal plan
 */
export async function archiveMealPlan(athleteId: string, planId: string): Promise<void> {
  const localList = getLocalPlans(athleteId);
  const target = localList.find((p) => p.id === planId);
  if (!target) return;

  target.archived = true;
  target.isActive = false;
  await saveMealPlan(athleteId, target);
}

/**
 * Soft delete a meal plan (moves to trash)
 */
export async function softDeleteMealPlan(athleteId: string, planId: string): Promise<void> {
  const localList = getLocalPlans(athleteId);
  const target = localList.find((p) => p.id === planId);
  if (!target) return;

  target.deletedAt = new Date().toISOString();
  target.isActive = false;
  await saveMealPlan(athleteId, target);
}

/**
 * Restore a soft-deleted meal plan
 */
export async function restoreMealPlan(athleteId: string, planId: string): Promise<void> {
  const localList = getLocalPlans(athleteId);
  const target = localList.find((p) => p.id === planId);
  if (!target) return;

  target.deletedAt = undefined;
  await saveMealPlan(athleteId, target);
}

/**
 * Permanently delete a meal plan
 */
export async function permanentDeleteMealPlan(athleteId: string, planId: string): Promise<void> {
  const localList = getLocalPlans(athleteId).filter((p) => p.id !== planId);
  saveLocalPlans(athleteId, localList);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return;
  }

  try {
    const planRef = doc(db, "athletes", athleteId, "mealPlans", planId);
    await deleteDoc(planRef);
    useSyncStatusStore.getState().recordServerWrite();
  } catch (err: any) {
    console.warn("Error permanently deleting meal plan:", err);
    useSyncStatusStore.getState().setError(err?.message || "Törlési hiba");
  }
}
