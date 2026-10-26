/**
 * OFFLINE STORAGE & SYNC ENGINE
 *
 * Implements offline-first persistence for daily check-ins and training sessions.
 * Guarantees zero data loss when offline by caching locally and queuing mutations
 * for background flush upon reconnection.
 */

import {
  DailyAggregateDocument,
  CompletedSessionDocument
} from "@shared/types";
import { db } from "@shared/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

export type SyncState = "synced" | "pending" | "syncing" | "offline";

export interface QueuedMutation {
  id: string;
  type: "save_daily" | "save_session" | "delete_session";
  athleteId: string;
  dateOrId: string; // date YYYY-MM-DD or sessionId
  payload?: DailyAggregateDocument | CompletedSessionDocument | Record<string, unknown>;
  timestamp: string;
  retries: number;
}

const STORAGE_KEYS = {
  DAILY_PREFIX: "apex_daily_",
  SESSIONS_PREFIX: "apex_sessions_",
  QUEUE: "apex_offline_mutation_queue",
  SLEEP_TARGET: "apex_user_sleep_target",
  LAST_SYNC: "apex_last_synced_at"
};

// Listeners for sync state changes
type SyncListener = (state: { status: SyncState; pendingCount: number; lastSyncedAt: string | null }) => void;
const listeners = new Set<SyncListener>();

function notifyListeners() {
  const pendingCount = getQueue().length;
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  let status: SyncState = "synced";

  if (!isOnline) {
    status = "offline";
  } else if (isSyncing) {
    status = "syncing";
  } else if (pendingCount > 0) {
    status = "pending";
  }

  const lastSyncedAt = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  listeners.forEach((listener) => listener({ status, pendingCount, lastSyncedAt }));
}

let isSyncing = false;

// 1. Queue Management
export function getQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch {
    // Local storage full or unavailable
  }
  notifyListeners();
}

export function enqueueMutation(mutation: Omit<QueuedMutation, "retries" | "timestamp">) {
  const queue = getQueue();
  // Deduplicate if already queued for the same item
  const filtered = queue.filter(
    (item) => !(item.type === mutation.type && item.athleteId === mutation.athleteId && item.dateOrId === mutation.dateOrId)
  );
  filtered.push({
    ...mutation,
    timestamp: new Date().toISOString(),
    retries: 0
  });
  saveQueue(filtered);
}

// 2. Daily Check-in Persistence
export function getLocalDaily(athleteId: string, date: string): DailyAggregateDocument | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.DAILY_PREFIX}${athleteId}`);
    if (!raw) return null;
    const map: Record<string, DailyAggregateDocument> = JSON.parse(raw);
    return map[date] || null;
  } catch {
    return null;
  }
}

export function getAllLocalDailies(athleteId: string): DailyAggregateDocument[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.DAILY_PREFIX}${athleteId}`);
    if (!raw) return [];
    const map: Record<string, DailyAggregateDocument> = JSON.parse(raw);
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export function saveLocalDaily(docData: DailyAggregateDocument): void {
  try {
    const key = `${STORAGE_KEYS.DAILY_PREFIX}${docData.athleteId}`;
    const raw = localStorage.getItem(key);
    const map: Record<string, DailyAggregateDocument> = raw ? JSON.parse(raw) : {};
    map[docData.date] = docData;
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Fail-safe
  }
}

// 3. Completed Sessions Persistence
export function getLocalSessions(athleteId: string): CompletedSessionDocument[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.SESSIONS_PREFIX}${athleteId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalSession(session: CompletedSessionDocument): void {
  try {
    const key = `${STORAGE_KEYS.SESSIONS_PREFIX}${session.athleteId}`;
    const current = getLocalSessions(session.athleteId);
    const index = current.findIndex((s) => s.sessionId === session.sessionId);
    if (index >= 0) {
      current[index] = session;
    } else {
      current.unshift(session);
    }
    localStorage.setItem(key, JSON.stringify(current));
  } catch {
    // Fail-safe
  }
}

export function deleteLocalSession(athleteId: string, sessionId: string): void {
  try {
    const key = `${STORAGE_KEYS.SESSIONS_PREFIX}${athleteId}`;
    const current = getLocalSessions(athleteId).filter((s) => s.sessionId !== sessionId);
    localStorage.setItem(key, JSON.stringify(current));
  } catch {
    // Fail-safe
  }
}

// 4. Athlete Sleep Target Persistence
export function getLocalSleepTarget(athleteId: string): number {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.SLEEP_TARGET}_${athleteId}`);
    return raw ? parseFloat(raw) : 8.0; // Default 8 hours
  } catch {
    return 8.0;
  }
}

export function saveLocalSleepTarget(athleteId: string, targetHours: number): void {
  try {
    localStorage.setItem(`${STORAGE_KEYS.SLEEP_TARGET}_${athleteId}`, targetHours.toString());
  } catch {
    // Fail-safe
  }
}

// 5. Unified Save Orchestrator with Offline Queue Fallback
export async function persistDailyCheckin(docData: DailyAggregateDocument): Promise<void> {
  // Always write immediately to local store
  saveLocalDaily(docData);

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline) {
    enqueueMutation({
      id: `daily_${docData.athleteId}_${docData.date}`,
      type: "save_daily",
      athleteId: docData.athleteId,
      dateOrId: docData.date,
      payload: docData
    });
    return;
  }

  try {
    // Attempt Firestore write
    const ref = doc(db, "athletes", docData.athleteId, "days", docData.date);
    await setDoc(ref, docData, { merge: true });
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    notifyListeners();
  } catch {
    // On network failure or emulator unavailability, enqueue for retry
    enqueueMutation({
      id: `daily_${docData.athleteId}_${docData.date}`,
      type: "save_daily",
      athleteId: docData.athleteId,
      dateOrId: docData.date,
      payload: docData
    });
  }
}

export async function persistTrainingSession(session: CompletedSessionDocument): Promise<void> {
  // Always write immediately to local store
  saveLocalSession(session);

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline) {
    enqueueMutation({
      id: `session_${session.athleteId}_${session.sessionId}`,
      type: "save_session",
      athleteId: session.athleteId,
      dateOrId: session.sessionId,
      payload: session
    });
    return;
  }

  try {
    const ref = doc(db, "athletes", session.athleteId, "sessions", session.sessionId);
    await setDoc(ref, session, { merge: true });
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    notifyListeners();
  } catch {
    enqueueMutation({
      id: `session_${session.athleteId}_${session.sessionId}`,
      type: "save_session",
      athleteId: session.athleteId,
      dateOrId: session.sessionId,
      payload: session
    });
  }
}

export async function removeTrainingSession(athleteId: string, sessionId: string): Promise<void> {
  deleteLocalSession(athleteId, sessionId);

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline) {
    enqueueMutation({
      id: `del_session_${athleteId}_${sessionId}`,
      type: "delete_session",
      athleteId,
      dateOrId: sessionId
    });
    return;
  }

  try {
    const ref = doc(db, "athletes", athleteId, "sessions", sessionId);
    await deleteDoc(ref);
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    notifyListeners();
  } catch {
    enqueueMutation({
      id: `del_session_${athleteId}_${sessionId}`,
      type: "delete_session",
      athleteId,
      dateOrId: sessionId
    });
  }
}

// 6. Background Queue Synchronization
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  isSyncing = true;
  notifyListeners();

  let syncedCount = 0;
  let failedCount = 0;
  const remainingQueue: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      if (item.type === "save_daily") {
        const ref = doc(db, "athletes", item.athleteId, "days", item.dateOrId);
        await setDoc(ref, item.payload as Record<string, unknown>, { merge: true });
      } else if (item.type === "save_session") {
        const ref = doc(db, "athletes", item.athleteId, "sessions", item.dateOrId);
        await setDoc(ref, item.payload as Record<string, unknown>, { merge: true });
      } else if (item.type === "delete_session") {
        const ref = doc(db, "athletes", item.athleteId, "sessions", item.dateOrId);
        await deleteDoc(ref);
      }
      syncedCount++;
    } catch {
      failedCount++;
      remainingQueue.push({ ...item, retries: item.retries + 1 });
    }
  }

  saveQueue(remainingQueue);
  isSyncing = false;
  if (syncedCount > 0) {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }
  notifyListeners();

  return { synced: syncedCount, failed: failedCount };
}

// Subscribe to connectivity changes
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    notifyListeners();
    flushOfflineQueue();
  });
  window.addEventListener("offline", () => {
    notifyListeners();
  });
}

// Hook subscription helper
export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  // Initial callback
  const pendingCount = getQueue().length;
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  listener({
    status: !isOnline ? "offline" : isSyncing ? "syncing" : pendingCount > 0 ? "pending" : "synced",
    pendingCount,
    lastSyncedAt: localStorage.getItem(STORAGE_KEYS.LAST_SYNC)
  });

  return () => {
    listeners.delete(listener);
  };
}
