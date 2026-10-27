import {
  RecoveryActivityLog,
  RecoveryActivityType,
  RecoveryCategory,
  RecoveryWeeklySummary
} from "@shared/types/recovery";
import { STANDARD_RECOVERY_ACTIVITIES } from "./catalog";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import { startOfWeek, endOfWeek, format, subDays, parseISO, isWithinInterval } from "date-fns";

const LOCAL_CUSTOM_TYPES_PREFIX = "apex_rec_custom_types_";
const LOCAL_LOGS_PREFIX = "apex_rec_logs_";

function getLocalCustomTypes(athleteId: string): RecoveryActivityType[] {
  if (!athleteId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_CUSTOM_TYPES_PREFIX}${athleteId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCustomTypes(athleteId: string, types: RecoveryActivityType[]) {
  try {
    localStorage.setItem(`${LOCAL_CUSTOM_TYPES_PREFIX}${athleteId}`, JSON.stringify(types));
  } catch {
    // ignore
  }
}

function getLocalLogs(athleteId: string): RecoveryActivityLog[] {
  if (!athleteId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_LOGS_PREFIX}${athleteId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalLogs(athleteId: string, logs: RecoveryActivityLog[]) {
  try {
    localStorage.setItem(`${LOCAL_LOGS_PREFIX}${athleteId}`, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

/**
 * Fetch all available recovery activity types (standard catalog + user custom types)
 */
export async function getRecoveryActivityTypes(athleteId: string): Promise<RecoveryActivityType[]> {
  const localCustom = getLocalCustomTypes(athleteId);
  try {
    const colRef = collection(db, "athletes", athleteId, "customRecoveryActivities");
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const remoteCustom: RecoveryActivityType[] = [];
      snapshot.forEach((d) => remoteCustom.push(d.data() as RecoveryActivityType));
      setLocalCustomTypes(athleteId, remoteCustom);
      return [...STANDARD_RECOVERY_ACTIVITIES, ...remoteCustom];
    }
  } catch {
    // Offline or permissions, fall back to local
  }
  return [...STANDARD_RECOVERY_ACTIVITIES, ...localCustom];
}

/**
 * Save custom recovery activity type
 */
export async function saveCustomRecoveryActivity(
  athleteId: string,
  input: Omit<RecoveryActivityType, "id" | "athleteId" | "isCustom">
): Promise<RecoveryActivityType> {
  const id = `rec_custom_${Date.now()}`;
  const customType: RecoveryActivityType = {
    ...input,
    id,
    athleteId,
    isCustom: true
  };

  const localCustom = getLocalCustomTypes(athleteId);
  const updated = [...localCustom, customType];
  setLocalCustomTypes(athleteId, updated);

  try {
    const docRef = doc(db, "athletes", athleteId, "customRecoveryActivities", id);
    await setDoc(docRef, customType);
  } catch {
    // Saved locally
  }

  return customType;
}

/**
 * Get all recovery activity logs for an athlete, sorted descending by date & startTime
 */
export async function getRecoveryLogs(athleteId: string): Promise<RecoveryActivityLog[]> {
  const localLogs = getLocalLogs(athleteId);
  try {
    const colRef = collection(db, "athletes", athleteId, "recoveryActivities");
    const q = query(colRef, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remoteLogs: RecoveryActivityLog[] = [];
      snapshot.forEach((d) => remoteLogs.push(d.data() as RecoveryActivityLog));
      // Sort in memory by date and startTime descending
      remoteLogs.sort((a, b) => {
        const dComp = b.date.localeCompare(a.date);
        return dComp !== 0 ? dComp : (b.startTime || "").localeCompare(a.startTime || "");
      });
      setLocalLogs(athleteId, remoteLogs);
      return remoteLogs;
    }
  } catch {
    // Offline fallback
  }

  return localLogs.sort((a, b) => {
    const dComp = b.date.localeCompare(a.date);
    return dComp !== 0 ? dComp : (b.startTime || "").localeCompare(a.startTime || "");
  });
}

/**
 * Save or update a recovery activity log
 */
export async function saveRecoveryLog(
  athleteId: string,
  logInput: Omit<RecoveryActivityLog, "id" | "athleteId" | "createdAt" | "updatedAt" | "updatedBy"> & {
    id?: string;
  },
  userId?: string
): Promise<RecoveryActivityLog> {
  const id = logInput.id || `rec_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fullLog: RecoveryActivityLog = {
    ...logInput,
    id,
    athleteId,
    createdAt: now,
    updatedAt: now,
    updatedBy: userId || athleteId
  };

  const local = getLocalLogs(athleteId);
  const filtered = local.filter((l) => l.id !== id);
  const updated = [fullLog, ...filtered];
  setLocalLogs(athleteId, updated);

  try {
    const docRef = doc(db, "athletes", athleteId, "recoveryActivities", id);
    await setDoc(docRef, fullLog);
  } catch {
    // Saved locally
  }

  return fullLog;
}

/**
 * Delete a recovery log
 */
export async function deleteRecoveryLog(athleteId: string, logId: string): Promise<void> {
  const local = getLocalLogs(athleteId);
  setLocalLogs(
    athleteId,
    local.filter((l) => l.id !== logId)
  );

  try {
    const docRef = doc(db, "athletes", athleteId, "recoveryActivities", logId);
    await deleteDoc(docRef);
  } catch {
    // Deleted locally
  }
}

/**
 * Clone yesterday's recovery logs to target date ("ugyanaz, mint tegnap")
 */
export async function cloneYesterdayRecoveryLogs(
  athleteId: string,
  targetDateStr?: string,
  userId?: string
): Promise<RecoveryActivityLog[]> {
  const targetDate = targetDateStr ? parseISO(targetDateStr) : new Date();
  const yesterdayStr = format(subDays(targetDate, 1), "yyyy-MM-dd");
  const targetDateFormatted = format(targetDate, "yyyy-MM-dd");

  const allLogs = await getRecoveryLogs(athleteId);
  const yesterdayLogs = allLogs.filter((l) => l.date === yesterdayStr);

  if (yesterdayLogs.length === 0) {
    return [];
  }

  const createdLogs: RecoveryActivityLog[] = [];
  for (const log of yesterdayLogs) {
    const cloned = await saveRecoveryLog(
      athleteId,
      {
        activityTypeId: log.activityTypeId,
        activityName: log.activityName,
        category: log.category,
        date: targetDateFormatted,
        startTime: log.startTime,
        durationMinutes: log.durationMinutes,
        temperatureCelsius: log.temperatureCelsius,
        rounds: log.rounds,
        bodyArea: log.bodyArea,
        intensity: log.intensity,
        perceivedEffect: log.perceivedEffect,
        notes: log.notes
      },
      userId
    );
    createdLogs.push(cloned);
  }

  return createdLogs;
}

/**
 * Calculate weekly recovery summary (Monday to Sunday)
 */
export function calculateWeeklyRecoverySummary(
  logs: RecoveryActivityLog[],
  referenceDateStr?: string
): RecoveryWeeklySummary {
  const refDate = referenceDateStr ? parseISO(referenceDateStr) : new Date();
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(refDate, { weekStartsOn: 1 });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const byCategory: Record<RecoveryCategory, number> = {
    mobility_gymnastics: 0,
    cold: 0,
    heat: 0,
    contrast: 0,
    massage_therapy: 0,
    sleep_relaxation: 0,
    other: 0
  };

  let totalMinutes = 0;
  let totalActivitiesCount = 0;

  for (const log of logs) {
    try {
      const logDate = parseISO(log.date);
      if (isWithinInterval(logDate, { start: weekStart, end: weekEnd })) {
        const mins = Number(log.durationMinutes) || 0;
        totalMinutes += mins;
        totalActivitiesCount += 1;
        if (byCategory[log.category] !== undefined) {
          byCategory[log.category] += mins;
        } else {
          byCategory.other += mins;
        }
      }
    } catch {
      // invalid date string, skip
    }
  }

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    totalMinutes,
    byCategory,
    totalActivitiesCount
  };
}
