/**
 * COMPETITION REPOSITORY
 *
 * Central repository for target competitions (athletes/{athleteId}/competitions/{compId}).
 * Provides cloud sync, offline fallback, and local caching.
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
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";

export interface CompetitionItem {
  id: string;
  title: string;
  date: string;
  priority: "A" | "B" | "C";
  sport: string;
  distance?: string;
  targetTime?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  schemaVersion?: number;
}

const getCompKey = (athleteId: string) => `apex_competitions_${athleteId}`;

function getLocalCompetitions(athleteId: string): CompetitionItem[] {
  try {
    const raw = localStorage.getItem(getCompKey(athleteId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCompetitions(athleteId: string, items: CompetitionItem[]) {
  try {
    localStorage.setItem(getCompKey(athleteId), JSON.stringify(items));
  } catch {
    // quota
  }
}

/**
 * Real-time listener for athlete competitions.
 */
export function subscribeCompetitions(
  athleteId: string,
  onData: (items: CompetitionItem[], meta: { fromCache: boolean }) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!athleteId || athleteId === "demo-athlete-001") {
    const local = getLocalCompetitions(athleteId);
    onData(local.filter((c) => !c.deletedAt), { fromCache: true });
    return () => {};
  }

  const colRef = collection(db, "athletes", athleteId, "competitions");
  const q = query(colRef, orderBy("date", "asc"));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      const fromCache = snap.metadata.fromCache;
      const list: CompetitionItem[] = [];
      snap.forEach((d) => {
        const item = d.data() as CompetitionItem;
        list.push({ ...item, id: item.id || d.id });
      });
      setLocalCompetitions(athleteId, list);
      if (!fromCache) useSyncStatusStore.getState().recordServerRead();
      onData(list.filter((c) => !c.deletedAt), { fromCache });
    },
    (err) => {
      console.warn("Real-time competitions notice:", err);
      useSyncStatusStore.getState().setCacheFallback(true);
      onError?.(err);
    }
  );
}

export async function getCompetitions(
  athleteId: string,
  options: { includeDeleted?: boolean; forceServer?: boolean } = {}
): Promise<CompetitionItem[]> {
  const localList = getLocalCompetitions(athleteId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useSyncStatusStore.getState().setCacheFallback(true);
    if (options.includeDeleted) return localList;
    return localList.filter((c) => !c.deletedAt);
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "competitions");
    const q = query(colRef, orderBy("date", "asc"));
    const snap = options.forceServer ? await getDocsFromServer(q) : await getDocs(q);

    const serverList: CompetitionItem[] = [];
    snap.forEach((d) => {
      const data = d.data() as CompetitionItem;
      serverList.push({
        ...data,
        id: data.id || d.id
      });
    });
    setLocalCompetitions(athleteId, serverList);
    if (!snap.metadata.fromCache) {
      useSyncStatusStore.getState().recordServerRead();
    } else {
      useSyncStatusStore.getState().setCacheFallback(true);
    }
    if (options.includeDeleted) return serverList;
    return serverList.filter((c) => !c.deletedAt);
  } catch (err: any) {
    console.warn("Failed fetching competitions from Firestore, using local:", err);
    useSyncStatusStore.getState().setCacheFallback(true, err?.message);
    if (options.includeDeleted) return localList;
    return localList.filter((c) => !c.deletedAt);
  }
}

export async function saveCompetition(
  athleteId: string,
  comp: CompetitionItem
): Promise<CompetitionItem> {
  const now = new Date().toISOString();
  const normalized: CompetitionItem = {
    ...comp,
    schemaVersion: 1,
    deletedAt: null,
    updatedAt: now,
    createdAt: comp.createdAt || now
  };

  const local = getLocalCompetitions(athleteId);
  const idx = local.findIndex((c) => c.id === normalized.id);
  if (idx >= 0) {
    local[idx] = normalized;
  } else {
    local.push(normalized);
  }
  setLocalCompetitions(athleteId, local);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return normalized;
  }

  useSyncStatusStore.getState().setSyncing();

  try {
    const docRef = doc(db, "athletes", athleteId, "competitions", normalized.id);
    await setDoc(docRef, sanitizeForFirestore(normalized), { merge: true });
    useSyncStatusStore.getState().recordServerWrite();
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed saving competition to Firestore:", err);
    useSyncStatusStore.getState().setError(err?.message || "Verseny mentési hiba");
  }

  return normalized;
}

export async function deleteCompetition(athleteId: string, compId: string): Promise<void> {
  const local = getLocalCompetitions(athleteId).filter((c) => c.id !== compId);
  setLocalCompetitions(athleteId, local);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    const docRef = doc(db, "athletes", athleteId, "competitions", compId);
    await deleteDoc(docRef);
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed deleting competition:", err);
  }
}
