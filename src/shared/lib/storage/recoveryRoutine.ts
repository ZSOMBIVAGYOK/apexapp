/**
 * EMERGENCY DATA RECOVERY ROUTINE
 *
 * Scans local storage for legacy or orphaned data records that were stranded
 * in the browser due to prior sync/serialization issues.
 * Sanitizes and securely uploads them to Firestore under athletes/{athleteId}/...
 */

import { db } from "@shared/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";
import { CompletedSessionDocument, DailyAggregateDocument } from "@shared/types";
import { PlannedWorkout } from "@shared/types/training";

export interface RecoveryReport {
  recoveredSessions: number;
  recoveredWorkouts: number;
  recoveredDailies: number;
  details: string[];
}

export async function runEmergencyDataRecovery(athleteId: string): Promise<RecoveryReport> {
  const report: RecoveryReport = {
    recoveredSessions: 0,
    recoveredWorkouts: 0,
    recoveredDailies: 0,
    details: []
  };

  if (!athleteId || typeof window === "undefined" || !window.localStorage) {
    return report;
  }

  // 1. Recover orphaned completed sessions
  try {
    const rawSessions = localStorage.getItem(`apex_sessions_${athleteId}`);
    if (rawSessions) {
      const parsed: CompletedSessionDocument[] = JSON.parse(rawSessions);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const session of parsed) {
          if (!session.sessionId) continue;
          try {
            const sessionRef = doc(db, "athletes", athleteId, "sessions", session.sessionId);
            const existingSnap = await getDoc(sessionRef);
            if (!existingSnap.exists()) {
              const clean = sanitizeForFirestore({
                ...session,
                athleteId,
                schemaVersion: 1,
                updatedAt: new Date().toISOString()
              });
              await setDoc(sessionRef, clean, { merge: true });
              report.recoveredSessions++;
              report.details.push(`Recovered session: ${session.title || session.sessionId}`);
            }
          } catch (err) {
            console.warn("Failed recovering session:", session.sessionId, err);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Error scanning legacy sessions:", err);
  }

  // 2. Recover orphaned planned workouts
  try {
    const rawWorkouts = localStorage.getItem(`apex_planned_workouts_${athleteId}`);
    if (rawWorkouts) {
      const parsed: PlannedWorkout[] = JSON.parse(rawWorkouts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const workout of parsed) {
          if (!workout.id) continue;
          try {
            const workoutRef = doc(db, "athletes", athleteId, "plannedWorkouts", workout.id);
            const existingSnap = await getDoc(workoutRef);
            if (!existingSnap.exists()) {
              const clean = sanitizeForFirestore({
                ...workout,
                athleteId,
                schemaVersion: 1,
                updatedAt: new Date().toISOString()
              });
              await setDoc(workoutRef, clean, { merge: true });
              report.recoveredWorkouts++;
              report.details.push(`Recovered planned workout: ${workout.title || workout.id}`);
            }
          } catch (err) {
            console.warn("Failed recovering workout:", workout.id, err);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Error scanning legacy workouts:", err);
  }

  // 3. Recover orphaned daily check-ins
  try {
    const rawDailies = localStorage.getItem(`apex_daily_${athleteId}`);
    if (rawDailies) {
      const map: Record<string, DailyAggregateDocument> = JSON.parse(rawDailies);
      if (map && typeof map === "object") {
        for (const [date, dailyDoc] of Object.entries(map)) {
          if (!date || !dailyDoc) continue;
          try {
            const dailyRef = doc(db, "athletes", athleteId, "days", date);
            const existingSnap = await getDoc(dailyRef);
            if (!existingSnap.exists()) {
              const clean = sanitizeForFirestore({
                ...dailyDoc,
                athleteId,
                date,
                schemaVersion: 1,
                updatedAt: new Date().toISOString()
              });
              await setDoc(dailyRef, clean, { merge: true });
              report.recoveredDailies++;
              report.details.push(`Recovered daily checkin: ${date}`);
            }
          } catch (err) {
            console.warn("Failed recovering daily checkin:", date, err);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Error scanning legacy dailies:", err);
  }

  return report;
}
