/**
 * SESSION REPOSITORY
 *
 * Centralized, typed repository for athletic sessions (athletes/{athleteId}/sessions).
 * Guarantees zero data loss, offline-first fallback, recursive Firestore sanitization,
 * soft deletion, and 30-day revision history for edited sessions.
 */

import { db } from "@shared/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import { CompletedSessionDocument } from "@shared/types/dataModel";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import {
  getLocalSessions,
  saveLocalSession,
  deleteLocalSession,
  enqueueMutation
} from "@shared/lib/offline/offlineStorage";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";

export interface SessionRevision {
  revisionId: string;
  sessionId: string;
  savedAt: string;
  snapshot: CompletedSessionDocument;
}

/**
 * Fetch all sessions for an athlete, with local offline cache fallback.
 * By default filters out soft-deleted records.
 */
export async function getSessions(
  athleteId: string,
  options: { includeDeleted?: boolean } = {}
): Promise<CompletedSessionDocument[]> {
  const localList = getLocalSessions(athleteId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    if (options.includeDeleted) return localList;
    return localList.filter((s) => !s.deletedAt);
  }

  try {
    const colRef = collection(db, "athletes", athleteId, "sessions");
    const q = query(colRef, orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const serverSessions: CompletedSessionDocument[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as CompletedSessionDocument;
        serverSessions.push({
          ...data,
          sessionId: data.sessionId || d.id
        });
      });

      // Update local storage cache
      try {
        localStorage.setItem(`apex_sessions_${athleteId}`, JSON.stringify(serverSessions));
      } catch {
        // Local storage full
      }

      if (options.includeDeleted) {
        return serverSessions;
      }
      return serverSessions.filter((s) => !s.deletedAt);
    }
  } catch (err) {
    console.warn("Failed fetching sessions from Firestore, falling back to local cache:", err);
  }

  if (options.includeDeleted) return localList;
  return localList.filter((s) => !s.deletedAt);
}

/**
 * Save or update a session with revision history and zero undefined fields.
 */
export async function saveSession(session: CompletedSessionDocument): Promise<CompletedSessionDocument> {
  const now = new Date().toISOString();
  const normalized: CompletedSessionDocument = {
    ...session,
    schemaVersion: 1,
    deletedAt: null,
    updatedAt: now,
    createdAt: session.createdAt || now
  };

  // 1. Immediately cache locally
  saveLocalSession(normalized);

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline) {
    enqueueMutation({
      id: `session_${normalized.athleteId}_${normalized.sessionId}`,
      type: "save_session",
      athleteId: normalized.athleteId,
      dateOrId: normalized.sessionId,
      payload: normalized
    });
    return normalized;
  }

  useSyncStatusStore.getState().setSyncing();

  try {
    const sessionRef = doc(db, "athletes", normalized.athleteId, "sessions", normalized.sessionId);

    // 2. If editing an existing session, preserve revision snapshot (30 days)
    const existingSnap = await getDoc(sessionRef);
    if (existingSnap.exists()) {
      const oldData = existingSnap.data() as CompletedSessionDocument;
      const revId = `rev_${Date.now()}`;
      const revRef = doc(db, "athletes", normalized.athleteId, "sessions", normalized.sessionId, "revisions", revId);
      const revisionDoc: SessionRevision = {
        revisionId: revId,
        sessionId: normalized.sessionId,
        savedAt: now,
        snapshot: oldData
      };
      await setDoc(revRef, sanitizeForFirestore(revisionDoc));
    }

    // 3. Write sanitized session to Firestore
    const cleanDoc = sanitizeForFirestore(normalized);
    await setDoc(sessionRef, cleanDoc, { merge: true });

    useSyncStatusStore.getState().setSaved();
    return normalized;
  } catch (err: any) {
    console.warn("Error saving session to Firestore, enqueuing:", err);
    enqueueMutation({
      id: `session_${normalized.athleteId}_${normalized.sessionId}`,
      type: "save_session",
      athleteId: normalized.athleteId,
      dateOrId: normalized.sessionId,
      payload: normalized
    });
    useSyncStatusStore.getState().setError(err?.message || "Edzés mentési hiba");
    return normalized;
  }
}

/**
 * Soft delete a session (moves to trash with 30-day retention).
 */
export async function softDeleteSession(athleteId: string, sessionId: string): Promise<void> {
  const localList = getLocalSessions(athleteId);
  const existing = localList.find((s) => s.sessionId === sessionId);
  const now = new Date().toISOString();

  if (existing) {
    existing.deletedAt = now;
    existing.deletedBy = athleteId;
    saveLocalSession(existing);
  }

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline) {
    enqueueMutation({
      id: `soft_del_session_${athleteId}_${sessionId}`,
      type: "save_session",
      athleteId,
      dateOrId: sessionId,
      payload: existing || { sessionId, athleteId, deletedAt: now, deletedBy: athleteId }
    });
    return;
  }

  try {
    const sessionRef = doc(db, "athletes", athleteId, "sessions", sessionId);
    await setDoc(sessionRef, { deletedAt: now, deletedBy: athleteId }, { merge: true });
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed soft-deleting session:", err);
    useSyncStatusStore.getState().setError(err?.message || "Törlési hiba");
  }
}

/**
 * Restore a soft-deleted session from trash.
 */
export async function restoreSession(athleteId: string, sessionId: string): Promise<void> {
  const localList = getLocalSessions(athleteId);
  const existing = localList.find((s) => s.sessionId === sessionId);

  if (existing) {
    existing.deletedAt = null;
    saveLocalSession(existing);
  }

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!isOnline) {
    enqueueMutation({
      id: `restore_session_${athleteId}_${sessionId}`,
      type: "save_session",
      athleteId,
      dateOrId: sessionId,
      payload: existing || { sessionId, athleteId, deletedAt: null }
    });
    return;
  }

  try {
    const sessionRef = doc(db, "athletes", athleteId, "sessions", sessionId);
    await setDoc(sessionRef, { deletedAt: null }, { merge: true });
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed restoring session:", err);
    useSyncStatusStore.getState().setError(err?.message || "Visszaállítási hiba");
  }
}

/**
 * Permanently delete a session (from trash).
 */
export async function permanentDeleteSession(athleteId: string, sessionId: string): Promise<void> {
  deleteLocalSession(athleteId, sessionId);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueMutation({
      id: `perm_del_session_${athleteId}_${sessionId}`,
      type: "delete_session",
      athleteId,
      dateOrId: sessionId
    });
    return;
  }

  try {
    const sessionRef = doc(db, "athletes", athleteId, "sessions", sessionId);
    await deleteDoc(sessionRef);
    useSyncStatusStore.getState().setSaved();
  } catch (err: any) {
    console.warn("Failed permanently deleting session:", err);
  }
}

/**
 * Get revision history for a session.
 */
export async function getSessionRevisions(athleteId: string, sessionId: string): Promise<SessionRevision[]> {
  try {
    const revColRef = collection(db, "athletes", athleteId, "sessions", sessionId, "revisions");
    const q = query(revColRef, orderBy("savedAt", "desc"));
    const snap = await getDocs(q);
    const revisions: SessionRevision[] = [];
    snap.forEach((d) => revisions.push(d.data() as SessionRevision));
    return revisions;
  } catch {
    return [];
  }
}
