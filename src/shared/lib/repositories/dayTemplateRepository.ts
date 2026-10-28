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
import { DayTemplateDocument } from "@shared/types/mealPlan";

const getDayTemplatesKey = (athleteId: string) => `apex_${athleteId}_day_templates`;

function getLocalTemplates(athleteId: string): DayTemplateDocument[] {
  try {
    const raw = localStorage.getItem(getDayTemplatesKey(athleteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTemplates(athleteId: string, templates: DayTemplateDocument[]): void {
  try {
    localStorage.setItem(getDayTemplatesKey(athleteId), JSON.stringify(templates));
  } catch {
    // quota
  }
}

/**
 * Fetch all day templates for an athlete
 */
export async function getDayTemplates(athleteId: string): Promise<DayTemplateDocument[]> {
  const localList = getLocalTemplates(athleteId);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return localList;
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "dayTemplates");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const serverList: DayTemplateDocument[] = [];
      snap.forEach((d) => serverList.push({ ...(d.data() as DayTemplateDocument), id: d.id }));
      saveLocalTemplates(athleteId, serverList);
      useSyncStatusStore.getState().recordServerRead();
      return serverList;
    }
  } catch (err: any) {
    console.warn("Failed to fetch day templates from server:", err);
    useSyncStatusStore.getState().setCacheFallback(true);
  }

  return localList;
}

/**
 * Save or update a day template
 */
export async function saveDayTemplate(athleteId: string, template: DayTemplateDocument): Promise<void> {
  const localList = getLocalTemplates(athleteId);
  const now = new Date().toISOString();

  const prepared: DayTemplateDocument = {
    ...template,
    athleteId,
    schemaVersion: 1,
    source: template.source || "manual",
    confidence: template.confidence ?? 1.0,
    createdAt: template.createdAt || now,
    updatedAt: now,
    updatedBy: athleteId
  };

  const idx = localList.findIndex((t) => t.id === prepared.id);
  const updatedList = idx >= 0
    ? localList.map((t) => (t.id === prepared.id ? prepared : t))
    : [prepared, ...localList];

  saveLocalTemplates(athleteId, updatedList);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return;
  }

  try {
    const docRef = doc(db, "athletes", athleteId, "dayTemplates", prepared.id);
    await setDoc(docRef, sanitizeForFirestore(prepared));
    useSyncStatusStore.getState().recordServerWrite();
  } catch (err: any) {
    console.warn("Error saving day template to server:", err);
    useSyncStatusStore.getState().setError(err?.message || "Napi sablon mentési hiba");
  }
}

/**
 * Delete a day template
 */
export async function deleteDayTemplate(athleteId: string, templateId: string): Promise<void> {
  const localList = getLocalTemplates(athleteId).filter((t) => t.id !== templateId);
  saveLocalTemplates(athleteId, localList);

  if (
    !athleteId ||
    athleteId === "demo-athlete-001" ||
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test")
  ) {
    return;
  }

  try {
    const docRef = doc(db, "athletes", athleteId, "dayTemplates", templateId);
    await deleteDoc(docRef);
    useSyncStatusStore.getState().recordServerWrite();
  } catch (err: any) {
    console.warn("Error deleting day template from server:", err);
    useSyncStatusStore.getState().setError(err?.message || "Sablon törlési hiba");
  }
}
