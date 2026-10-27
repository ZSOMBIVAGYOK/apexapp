import { AthleteRecord, RecordBeatPrompt, RecordMetricType } from "@shared/types/records";
import { CompletedSessionDocument } from "@shared/types/dataModel";
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

const LOCAL_RECORDS_PREFIX = "apex_records_";

function getLocalRecords(athleteId: string): AthleteRecord[] {
  if (!athleteId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_RECORDS_PREFIX}${athleteId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalRecords(athleteId: string, records: AthleteRecord[]) {
  try {
    localStorage.setItem(`${LOCAL_RECORDS_PREFIX}${athleteId}`, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Checks if a given value is better than a baseline value for a specific record metric type.
 * For "time_for_distance", LOWER is better.
 * For all others (weight, reps, distance in time, duration, points), HIGHER is better.
 */
export function isBetterValue(metricType: RecordMetricType, candidate: number, baseline: number): boolean {
  if (metricType === "time_for_distance") {
    return candidate < baseline;
  }
  return candidate > baseline;
}

/**
 * Format numeric record value to human-readable string based on metric type
 */
export function formatRecordDisplay(metricType: RecordMetricType, value: number): string {
  if (metricType === "time_for_distance" || metricType === "max_duration") {
    const totalSecs = Math.round(value);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  if (metricType === "distance_in_time") {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} km`;
    }
    return `${Math.round(value)} m`;
  }

  if (metricType === "weight_reps_1rm") {
    return `${value} kg`;
  }

  if (metricType === "max_reps") {
    return `${Math.round(value)} db`;
  }

  if (metricType === "points") {
    return `${value} pont`;
  }

  return `${value}`;
}

/**
 * Get all records for an athlete
 */
export async function getRecords(athleteId: string): Promise<AthleteRecord[]> {
  const local = getLocalRecords(athleteId);
  try {
    const colRef = collection(db, "athletes", athleteId, "records");
    const q = query(colRef, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const remote: AthleteRecord[] = [];
      snapshot.forEach((d) => remote.push(d.data() as AthleteRecord));
      setLocalRecords(athleteId, remote);
      return remote;
    }
  } catch {
    // offline
  }
  return local;
}

/**
 * Save or update a record and ensure only one record is marked `isCurrentBest` for each discipline.
 */
export async function saveRecord(
  athleteId: string,
  recordInput: Omit<AthleteRecord, "id" | "athleteId" | "createdAt" | "updatedAt"> & {
    id?: string;
  }
): Promise<AthleteRecord> {
  const id = recordInput.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  let allRecords = await getRecords(athleteId);

  // Determine if this new record is better than others in the same sport and discipline
  const sameDiscipline = allRecords.filter(
    (r) => r.id !== id && r.sportId === recordInput.sportId && r.discipline.toLowerCase() === recordInput.discipline.trim().toLowerCase()
  );

  let isCandidateBest = true;
  for (const existing of sameDiscipline) {
    if (!isBetterValue(recordInput.recordType, recordInput.value, existing.value)) {
      isCandidateBest = false;
      break;
    }
  }

  const newRecord: AthleteRecord = {
    ...recordInput,
    id,
    athleteId,
    discipline: recordInput.discipline.trim(),
    displayValue: recordInput.displayValue || formatRecordDisplay(recordInput.recordType, recordInput.value),
    isCurrentBest: isCandidateBest,
    createdAt: now,
    updatedAt: now
  };

  // If candidate is best, update other records in discipline to isCurrentBest = false
  if (isCandidateBest) {
    allRecords = allRecords.map((r) => {
      if (
        r.sportId === newRecord.sportId &&
        r.discipline.toLowerCase() === newRecord.discipline.toLowerCase()
      ) {
        return { ...r, isCurrentBest: false, updatedAt: now };
      }
      return r;
    });
  }

  const existingIdx = allRecords.findIndex((r) => r.id === id);
  if (existingIdx >= 0) {
    allRecords[existingIdx] = newRecord;
  } else {
    allRecords.unshift(newRecord);
  }

  setLocalRecords(athleteId, allRecords);

  try {
    const docRef = doc(db, "athletes", athleteId, "records", id);
    await setDoc(docRef, newRecord);

    // Update others in Firestore if their best status changed
    if (isCandidateBest) {
      for (const other of sameDiscipline) {
        if (other.isCurrentBest) {
          const otherRef = doc(db, "athletes", athleteId, "records", other.id);
          await setDoc(otherRef, { ...other, isCurrentBest: false, updatedAt: now }, { merge: true });
        }
      }
    }
  } catch {
    // Offline
  }

  return newRecord;
}

/**
 * Delete a record and recalculate current best for that discipline
 */
export async function deleteRecord(athleteId: string, recordId: string): Promise<void> {
  const allRecords = await getRecords(athleteId);
  const target = allRecords.find((r) => r.id === recordId);
  if (!target) return;

  const remaining = allRecords.filter((r) => r.id !== recordId);

  // If the deleted record was the best, find the new best among remaining
  if (target.isCurrentBest) {
    const sameDiscipline = remaining.filter(
      (r) =>
        r.sportId === target.sportId &&
        r.discipline.toLowerCase() === target.discipline.toLowerCase()
    );
    if (sameDiscipline.length > 0 && sameDiscipline[0]) {
      let best: AthleteRecord = sameDiscipline[0];
      for (let i = 1; i < sameDiscipline.length; i++) {
        const item = sameDiscipline[i];
        if (item && isBetterValue(target.recordType, item.value, best.value)) {
          best = item;
        }
      }
      best.isCurrentBest = true;
      best.updatedAt = new Date().toISOString();
      try {
        const bestDoc = doc(db, "athletes", athleteId, "records", best.id);
        await setDoc(bestDoc, best, { merge: true });
      } catch {
        // offline
      }
    }
  }

  setLocalRecords(athleteId, remaining);

  try {
    const docRef = doc(db, "athletes", athleteId, "records", recordId);
    await deleteDoc(docRef);
  } catch {
    // offline
  }
}

/**
 * Filter and get progression list for a discipline chronologically
 */
export function getRecordProgression(
  records: AthleteRecord[],
  sportId: string,
  discipline: string
): AthleteRecord[] {
  return records
    .filter(
      (r) =>
        r.sportId === sportId &&
        r.discipline.toLowerCase() === discipline.trim().toLowerCase()
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Standard distances in meters mapped to discipline names
 */
const STANDARD_DISTANCE_DISCIPLINES: Array<{ name: string; meters: number; tolerancePercent: number }> = [
  { name: "100m", meters: 100, tolerancePercent: 0.05 },
  { name: "200m", meters: 200, tolerancePercent: 0.05 },
  { name: "400m", meters: 400, tolerancePercent: 0.03 },
  { name: "800m", meters: 800, tolerancePercent: 0.03 },
  { name: "1000m", meters: 1000, tolerancePercent: 0.03 },
  { name: "1500m", meters: 1500, tolerancePercent: 0.03 },
  { name: "1 km", meters: 1000, tolerancePercent: 0.03 },
  { name: "3 km", meters: 3000, tolerancePercent: 0.03 },
  { name: "5 km", meters: 5000, tolerancePercent: 0.03 },
  { name: "10 km", meters: 10000, tolerancePercent: 0.02 },
  { name: "Félmaraton (21.1 km)", meters: 21097, tolerancePercent: 0.02 },
  { name: "Maraton (42.2 km)", meters: 42195, tolerancePercent: 0.02 },
  { name: "50 km", meters: 50000, tolerancePercent: 0.02 },
  { name: "100 km", meters: 100000, tolerancePercent: 0.02 }
];

/**
 * Detect if a logged session beats an existing record or standard distance best.
 * Returns a RecordBeatPrompt if a record was beaten, or null if not.
 * Strictly non-intrusive: never saves records automatically.
 */
export function detectRecordBeat(
  session: CompletedSessionDocument,
  existingRecords: AthleteRecord[]
): RecordBeatPrompt | null {
  const raw = session as unknown as Record<string, unknown>;
  const sportId = (typeof raw.sportId === "string" ? raw.sportId : null) || session.sport || "running";
  const durationSec =
    session.durationSeconds ||
    (typeof raw.durationSeconds === "number" ? raw.durationSeconds : null) ||
    (session.durationMinutes ? session.durationMinutes * 60 : 0);
  const distanceM =
    session.metrics?.distanceMeters ||
    (typeof raw.distanceMeters === "number" ? raw.distanceMeters : null) ||
    (typeof raw.distanceKm === "number" ? raw.distanceKm * 1000 : 0);

  if (durationSec <= 0) return null;

  // 1. Check if the session matches any existing records for the same sport
  const sportRecords = existingRecords.filter((r) => r.sportId === sportId);

  for (const std of STANDARD_DISTANCE_DISCIPLINES) {
    if (distanceM > 0) {
      const diff = Math.abs(distanceM - std.meters);
      if (diff <= std.meters * std.tolerancePercent) {
        // Matched a standard distance
        const existingBest = sportRecords.find(
          (r) =>
            r.recordType === "time_for_distance" &&
            (r.discipline.toLowerCase() === std.name.toLowerCase() ||
             r.discipline.toLowerCase().includes(std.name.toLowerCase())) &&
            r.isCurrentBest
        );

        if (existingBest) {
          if (durationSec < existingBest.value) {
            return {
              discipline: existingBest.discipline,
              sportId,
              recordType: "time_for_distance",
              newValue: durationSec,
              newDisplayValue: formatRecordDisplay("time_for_distance", durationSec),
              previousBestValue: existingBest.value,
              previousBestDisplayValue: existingBest.displayValue,
              sessionId: session.sessionId,
              sessionTitle: session.title || std.name,
              date: session.date
            };
          }
        }
      }
    }
  }

  // 2. Check user's custom records matching this sport and discipline in title or course
  for (const rec of sportRecords) {
    if (rec.recordType === "time_for_distance" && rec.isCurrentBest) {
      if (
        session.title &&
        session.title.toLowerCase().includes(rec.discipline.toLowerCase()) &&
        durationSec < rec.value
      ) {
        return {
          discipline: rec.discipline,
          sportId,
          recordType: "time_for_distance",
          newValue: durationSec,
          newDisplayValue: formatRecordDisplay("time_for_distance", durationSec),
          previousBestValue: rec.value,
          previousBestDisplayValue: rec.displayValue,
          sessionId: session.sessionId,
          sessionTitle: session.title,
          date: session.date
        };
      }
    }
  }

  return null;
}
