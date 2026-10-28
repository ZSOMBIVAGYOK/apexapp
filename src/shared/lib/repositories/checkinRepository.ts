/**
 * CHECK-IN REPOSITORY
 *
 * Central repository for daily check-ins (athletes/{athleteId}/days/{date}).
 * Manages daily aggregates, subjective wellness, sleep data, and readiness metrics.
 */

import { db } from "@shared/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  getDocsFromServer,
  getDocFromServer,
  Unsubscribe
} from "firebase/firestore";
import { DailyAggregateDocument } from "@shared/types";
import {
  getLocalDaily,
  getAllLocalDailies,
  saveLocalDaily,
  persistDailyCheckin
} from "@shared/lib/offline/offlineStorage";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";

/**
 * Real-time listener for a single day's check-in.
 */
export function subscribeDayCheckin(
  athleteId: string,
  date: string,
  onData: (data: DailyAggregateDocument | null, meta: { fromCache: boolean }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!athleteId || athleteId === "demo-athlete-001") {
    const local = getLocalDaily(athleteId, date);
    onData(local, { fromCache: true });
    return () => {};
  }

  const dayRef = doc(db, "athletes", athleteId, "days", date);
  return onSnapshot(
    dayRef,
    { includeMetadataChanges: true },
    (snap) => {
      const fromCache = snap.metadata.fromCache;
      if (snap.exists()) {
        const data = snap.data() as DailyAggregateDocument;
        saveLocalDaily(data);
        if (!fromCache) useSyncStatusStore.getState().recordServerRead();
        onData(data, { fromCache });
      } else {
        onData(null, { fromCache });
      }
    },
    (err) => {
      console.warn("Real-time checkin subscription notice:", err);
      useSyncStatusStore.getState().setCacheFallback(true);
      onError?.(err);
    }
  );
}

/**
 * Fetch a single daily checkin for an athlete on a specific date.
 */
export async function getDayCheckin(
  athleteId: string,
  date: string,
  options: { forceServer?: boolean } = {}
): Promise<DailyAggregateDocument | null> {
  const local = getLocalDaily(athleteId, date);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useSyncStatusStore.getState().setCacheFallback(true);
    return local;
  }

  try {
    const dayRef = doc(db, "athletes", athleteId, "days", date);
    const snap = options.forceServer ? await getDocFromServer(dayRef) : await getDoc(dayRef);
    if (snap.exists()) {
      const data = snap.data() as DailyAggregateDocument;
      saveLocalDaily(data);
      if (!snap.metadata.fromCache) {
        useSyncStatusStore.getState().recordServerRead();
      }
      return data;
    }
  } catch (err: any) {
    console.warn("Failed fetching day checkin from Firestore, using local:", err);
    useSyncStatusStore.getState().setCacheFallback(true, err?.message);
  }

  return local;
}

/**
 * Real-time listener for all historical check-ins.
 */
export function subscribeAllDayCheckins(
  athleteId: string,
  onData: (dailies: DailyAggregateDocument[], meta: { fromCache: boolean }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!athleteId || athleteId === "demo-athlete-001") {
    const local = getAllLocalDailies(athleteId);
    onData(local, { fromCache: true });
    return () => {};
  }

  const colRef = collection(db, "athletes", athleteId, "days");
  const q = query(colRef, orderBy("date", "desc"));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const fromCache = snap.metadata.fromCache;
      const list: DailyAggregateDocument[] = [];
      snap.forEach((d) => {
        const item = d.data() as DailyAggregateDocument;
        list.push(item);
        saveLocalDaily(item);
      });
      if (!fromCache) useSyncStatusStore.getState().recordServerRead();
      onData(list, { fromCache });
    },
    (err) => {
      console.warn("Real-time all checkins notice:", err);
      useSyncStatusStore.getState().setCacheFallback(true);
      onError?.(err);
    }
  );
}

/**
 * Fetch all historical check-ins for readiness baselines and trends.
 */
export async function getAllDayCheckins(
  athleteId: string,
  options: { forceServer?: boolean } = {}
): Promise<DailyAggregateDocument[]> {
  const localList = getAllLocalDailies(athleteId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useSyncStatusStore.getState().setCacheFallback(true);
    return localList;
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "days");
    const q = query(colRef, orderBy("date", "desc"));
    const snap = options.forceServer ? await getDocsFromServer(q) : await getDocs(q);

    const serverList: DailyAggregateDocument[] = [];
    snap.forEach((d) => {
      const item = d.data() as DailyAggregateDocument;
      serverList.push(item);
      saveLocalDaily(item);
    });

    if (!snap.metadata.fromCache) {
      useSyncStatusStore.getState().recordServerRead();
    } else {
      useSyncStatusStore.getState().setCacheFallback(true);
    }

    return serverList;
  } catch (err: any) {
    console.warn("Failed fetching all checkins from Firestore, using local:", err);
    useSyncStatusStore.getState().setCacheFallback(true, err?.message);
  }

  return localList;
}

/**
 * Save daily checkin with zero loss and background sync.
 */
export async function saveDayCheckin(docData: DailyAggregateDocument): Promise<DailyAggregateDocument> {
  await persistDailyCheckin(docData);
  useSyncStatusStore.getState().recordServerWrite();
  return docData;
}
