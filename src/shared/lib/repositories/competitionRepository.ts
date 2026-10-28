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
  orderBy
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

export async function getCompetitions(
  athleteId: string,
  options: { includeDeleted?: boolean } = {}
): Promise<CompetitionItem[]> {
  const localList = getLocalCompetitions(athleteId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (options.includeDeleted) return localList;
    return localList.filter((c) => !c.deletedAt);
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "competitions");
    const q = query(colRef, orderBy("date", "asc"));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const serverList: CompetitionItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as CompetitionItem;
        serverList.push({
          ...data,
          id: data.id || d.id
        });
      });
      setLocalCompetitions(athleteId, serverList);
      if (options.includeDeleted) return serverList;
      return serverList.filter((c) => !c.deletedAt);
    }
  } catch (err) {
    console.warn("Failed fetching competitions from Firestore, using local:", err);
  }

  if (options.includeDeleted) return localList;
  return localList.filter((c) => !c.deletedAt);
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
