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
  orderBy
} from "firebase/firestore";
import { DailyAggregateDocument } from "@shared/types";
import {
  getLocalDaily,
  getAllLocalDailies,
  saveLocalDaily,
  persistDailyCheckin
} from "@shared/lib/offline/offlineStorage";

/**
 * Fetch a single daily checkin for an athlete on a specific date.
 */
export async function getDayCheckin(athleteId: string, date: string): Promise<DailyAggregateDocument | null> {
  const local = getLocalDaily(athleteId, date);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return local;
  }

  try {
    const dayRef = doc(db, "athletes", athleteId, "days", date);
    const snap = await getDoc(dayRef);
    if (snap.exists()) {
      const data = snap.data() as DailyAggregateDocument;
      saveLocalDaily(data);
      return data;
    }
  } catch (err) {
    console.warn("Failed fetching day checkin from Firestore, using local:", err);
  }

  return local;
}

/**
 * Fetch all historical check-ins for readiness baselines and trends.
 */
export async function getAllDayCheckins(athleteId: string): Promise<DailyAggregateDocument[]> {
  const localList = getAllLocalDailies(athleteId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return localList;
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "days");
    const q = query(colRef, orderBy("date", "desc"));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const serverList: DailyAggregateDocument[] = [];
      snap.forEach((d) => {
        const item = d.data() as DailyAggregateDocument;
        serverList.push(item);
        saveLocalDaily(item);
      });
      return serverList;
    }
  } catch (err) {
    console.warn("Failed fetching all checkins from Firestore, using local:", err);
  }

  return localList;
}

/**
 * Save daily checkin with zero loss and background sync.
 */
export async function saveDayCheckin(docData: DailyAggregateDocument): Promise<DailyAggregateDocument> {
  await persistDailyCheckin(docData);
  return docData;
}
