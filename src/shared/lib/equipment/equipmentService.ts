import {
  EquipmentItem,
  EquipmentType,
  MaintenanceLog,
  MaintenanceStatus,
  MaintenanceTask
} from "@shared/types/equipment";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc
} from "firebase/firestore";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { differenceInDays, parseISO, format } from "date-fns";

const LOCAL_EQUIPMENT_PREFIX = "apex_equipment_";
const LOCAL_LAST_USED_EQUIPMENT_PREFIX = "apex_last_used_equipment_";

export const EQUIPMENT_TYPES: Array<{ id: EquipmentType; nameHu: string; nameEn: string; icon: string }> = [
  { id: "shoes", nameHu: "Cipő", nameEn: "Shoes", icon: "👟" },
  { id: "bike", nameHu: "Kerékpár", nameEn: "Bike", icon: "🚴" },
  { id: "chain", nameHu: "Lánc", nameEn: "Chain", icon: "⛓️" },
  { id: "wheelset", nameHu: "Kerékszett", nameEn: "Wheelset", icon: "⚙️" },
  { id: "racket", nameHu: "Ütő", nameEn: "Racket", icon: "🎾" },
  { id: "skis", nameHu: "Léc / Snowboard", nameEn: "Skis / Snowboard", icon: "🎿" },
  { id: "oar", nameHu: "Evező", nameEn: "Oar", icon: "🚣" },
  { id: "watch", nameHu: "Óra / Szenzor", nameEn: "Watch / Sensor", icon: "⌚" },
  { id: "other", nameHu: "Egyéb", nameEn: "Other", icon: "🎒" }
];

function getLocalEquipment(athleteId: string): EquipmentItem[] {
  if (!athleteId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_EQUIPMENT_PREFIX}${athleteId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalEquipment(athleteId: string, items: EquipmentItem[]) {
  try {
    localStorage.setItem(`${LOCAL_EQUIPMENT_PREFIX}${athleteId}`, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Get last used equipment IDs for a sport
 */
export function getLastUsedEquipment(athleteId: string, sportId: string): string[] {
  if (!athleteId || !sportId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_LAST_USED_EQUIPMENT_PREFIX}${athleteId}`);
    if (!raw) return [];
    const map = JSON.parse(raw);
    return map[sportId] || [];
  } catch {
    return [];
  }
}

/**
 * Remember last used equipment IDs for a sport
 */
export function setLastUsedEquipment(athleteId: string, sportId: string, equipmentIds: string[]) {
  if (!athleteId || !sportId) return;
  try {
    const raw = localStorage.getItem(`${LOCAL_LAST_USED_EQUIPMENT_PREFIX}${athleteId}`);
    const map = raw ? JSON.parse(raw) : {};
    map[sportId] = equipmentIds;
    localStorage.setItem(`${LOCAL_LAST_USED_EQUIPMENT_PREFIX}${athleteId}`, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function getSessionKm(s: CompletedSessionDocument): number {
  if (s.metrics?.distanceMeters) return s.metrics.distanceMeters / 1000;
  const raw = s as unknown as Record<string, unknown>;
  if (typeof raw.distanceKm === "number") return raw.distanceKm;
  if (typeof raw.distanceMeters === "number") return raw.distanceMeters / 1000;
  return 0;
}

function getSessionHours(s: CompletedSessionDocument): number {
  if (s.durationMinutes) return s.durationMinutes / 60;
  if (s.durationSeconds) return s.durationSeconds / 3600;
  const raw = s as unknown as Record<string, unknown>;
  if (typeof raw.durationSeconds === "number") return raw.durationSeconds / 3600;
  return 0;
}

/**
 * Calculate maintenance status, remaining units, and percentage for a single task.
 */
export function evaluateMaintenanceTask(
  task: MaintenanceTask,
  equipmentSessions: CompletedSessionDocument[],
  todayStr: string = format(new Date(), "yyyy-MM-dd")
): MaintenanceTask {
  let currentUsageSinceReset = 0;

  if (task.mode === "distance") {
    // Sum distance of sessions linked to this equipment that occurred on or after lastResetDate
    for (const session of equipmentSessions) {
      if (session.date >= task.lastResetDate) {
        currentUsageSinceReset += getSessionKm(session);
      }
    }
    // Round to 1 decimal place
    currentUsageSinceReset = Math.round(currentUsageSinceReset * 10) / 10;
  } else {
    // Time mode: count days from lastResetDate to today
    try {
      const resetDate = parseISO(task.lastResetDate);
      const today = parseISO(todayStr);
      const days = differenceInDays(today, resetDate);
      currentUsageSinceReset = Math.max(0, days);
    } catch {
      currentUsageSinceReset = 0;
    }
  }

  const remaining = Math.round((task.intervalValue - currentUsageSinceReset) * 10) / 10;
  const remainingPercent = Math.max(
    0,
    Math.min(100, Math.round((remaining / task.intervalValue) * 100))
  );

  let status: MaintenanceStatus = "ok";
  if (remaining <= 0) {
    status = "overdue";
  } else if (remainingPercent <= 15) {
    status = "due_soon";
  }

  return {
    ...task,
    currentUsageSinceReset,
    remaining,
    remainingPercent,
    status
  };
}

/**
 * Recompute equipment totals and maintenance tasks given a list of equipment items and completed sessions.
 * Pure computation helper for both offline and sync workflows.
 */
export function computeEquipmentState(
  equipmentList: EquipmentItem[],
  sessions: CompletedSessionDocument[],
  todayStr: string = format(new Date(), "yyyy-MM-dd")
): EquipmentItem[] {
  return equipmentList.map((item) => {
    // Find all sessions linked to this equipment item
    const linkedSessions = sessions.filter(
      (s) => s.equipmentIds && s.equipmentIds.includes(item.id)
    );

    let sessionKm = 0;
    let sessionHours = 0;

    for (const s of linkedSessions) {
      sessionKm += getSessionKm(s);
      sessionHours += getSessionHours(s);
    }

    const totalKm = Math.round(((item.startingUsageKm || 0) + sessionKm) * 10) / 10;
    const totalHours = Math.round(((item.startingUsageHours || 0) + sessionHours) * 10) / 10;

    // Evaluate each maintenance task
    const maintenanceTasks = (item.maintenanceTasks || []).map((task) =>
      evaluateMaintenanceTask(task, linkedSessions, todayStr)
    );

    return {
      ...item,
      totalKm,
      totalHours,
      maintenanceTasks
    };
  });
}

/**
 * Get all equipment items for an athlete
 */
export async function getEquipmentList(athleteId: string): Promise<EquipmentItem[]> {
  const local = getLocalEquipment(athleteId);
  try {
    const colRef = collection(db, "athletes", athleteId, "equipment");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const remote: EquipmentItem[] = [];
      snapshot.forEach((d) => remote.push(d.data() as EquipmentItem));
      setLocalEquipment(athleteId, remote);
      return remote;
    }
  } catch {
    // offline
  }
  return local;
}

/**
 * Save or update equipment item
 */
export async function saveEquipmentItem(
  athleteId: string,
  input: Omit<EquipmentItem, "id" | "athleteId" | "createdAt" | "updatedAt"> & {
    id?: string;
  }
): Promise<EquipmentItem> {
  const id = input.id || `eq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fullItem: EquipmentItem = {
    ...input,
    id,
    athleteId,
    startingUsageKm: input.startingUsageKm || 0,
    startingUsageHours: input.startingUsageHours || 0,
    sportIds: input.sportIds || [],
    status: input.status || "active",
    totalKm: input.totalKm || input.startingUsageKm || 0,
    totalHours: input.totalHours || input.startingUsageHours || 0,
    maintenanceTasks: input.maintenanceTasks || [],
    maintenanceHistory: input.maintenanceHistory || [],
    createdAt: now,
    updatedAt: now
  };

  const local = getLocalEquipment(athleteId);
  const filtered = local.filter((e) => e.id !== id);
  const updated = [fullItem, ...filtered];
  setLocalEquipment(athleteId, updated);

  try {
    const docRef = doc(db, "athletes", athleteId, "equipment", id);
    await setDoc(docRef, sanitizeForFirestore({ ...fullItem, schemaVersion: 1 }), { merge: true });
  } catch {
    // offline
  }

  return fullItem;
}

/**
 * Delete an equipment item (soft delete)
 */
export async function deleteEquipmentItem(athleteId: string, equipmentId: string): Promise<void> {
  const local = getLocalEquipment(athleteId);
  const now = new Date().toISOString();
  setLocalEquipment(
    athleteId,
    local.filter((e) => e.id !== equipmentId)
  );

  try {
    const docRef = doc(db, "athletes", athleteId, "equipment", equipmentId);
    await setDoc(docRef, { deletedAt: now }, { merge: true });
  } catch {
    // offline
  }
}

/**
 * Robust recomputation of all equipment items for an athlete based on all completed sessions.
 * Safe against session backdating, editing, or deletion.
 */
export async function recomputeEquipmentTotals(
  athleteId: string,
  allSessions: CompletedSessionDocument[]
): Promise<EquipmentItem[]> {
  const equipment = await getEquipmentList(athleteId);
  if (equipment.length === 0) return [];

  const updatedEquipment = computeEquipmentState(equipment, allSessions);
  setLocalEquipment(athleteId, updatedEquipment);

  // Sync to firestore
  try {
    for (const item of updatedEquipment) {
      const docRef = doc(db, "athletes", athleteId, "equipment", item.id);
      await setDoc(docRef, item, { merge: true });
    }
  } catch {
    // offline
  }

  return updatedEquipment;
}

/**
 * Log a maintenance action and reset the countdown for that task.
 */
export async function logMaintenanceAction(
  athleteId: string,
  equipmentId: string,
  taskId: string,
  logInput: {
    date: string;
    costAmount?: number;
    costCurrency?: string;
    notes?: string;
    performedBy?: string;
  },
  allSessions: CompletedSessionDocument[]
): Promise<EquipmentItem | null> {
  const equipment = await getEquipmentList(athleteId);
  const item = equipment.find((e) => e.id === equipmentId);
  if (!item) return null;

  const targetTask = item.maintenanceTasks.find((t) => t.id === taskId);
  if (!targetTask) return null;

  const logId = `maint_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newLog: MaintenanceLog = {
    id: logId,
    taskId,
    taskName: targetTask.name,
    date: logInput.date,
    costAmount: logInput.costAmount,
    costCurrency: logInput.costCurrency || "HUF",
    notes: logInput.notes,
    performedBy: logInput.performedBy,
    createdAt: now
  };

  // Reset the task
  const updatedTasks = item.maintenanceTasks.map((t) => {
    if (t.id === taskId) {
      return {
        ...t,
        lastResetDate: logInput.date,
        lastResetUsageKm: item.totalKm,
        currentUsageSinceReset: 0,
        remaining: t.intervalValue,
        remainingPercent: 100,
        status: "ok" as MaintenanceStatus
      };
    }
    return t;
  });

  const updatedHistory = [newLog, ...(item.maintenanceHistory || [])];

  const updatedItem: EquipmentItem = {
    ...item,
    maintenanceTasks: updatedTasks,
    maintenanceHistory: updatedHistory,
    updatedAt: now
  };

  // Recompute with sessions to ensure correct state
  const recomputed = computeEquipmentState([updatedItem], allSessions)[0]!;

  const allUpdated = equipment.map((e) => (e.id === equipmentId ? recomputed : e));
  setLocalEquipment(athleteId, allUpdated);

  try {
    const docRef = doc(db, "athletes", athleteId, "equipment", equipmentId);
    await setDoc(docRef, recomputed);
  } catch {
    // offline
  }

  return recomputed;
}

/**
 * Check if any equipment has overdue tasks
 */
export function hasOverdueMaintenance(equipmentList: EquipmentItem[]): boolean {
  return equipmentList.some(
    (item) =>
      item.status === "active" &&
      item.maintenanceTasks.some((t) => t.status === "overdue")
  );
}

/**
 * Check if any equipment has tasks due soon or overdue
 */
export function hasDueMaintenance(equipmentList: EquipmentItem[]): {
  hasDue: boolean;
  overdueCount: number;
  dueSoonCount: number;
} {
  let overdueCount = 0;
  let dueSoonCount = 0;

  for (const item of equipmentList) {
    if (item.status === "active") {
      for (const t of item.maintenanceTasks) {
        if (t.status === "overdue") overdueCount++;
        else if (t.status === "due_soon") dueSoonCount++;
      }
    }
  }

  return {
    hasDue: overdueCount > 0 || dueSoonCount > 0,
    overdueCount,
    dueSoonCount
  };
}
