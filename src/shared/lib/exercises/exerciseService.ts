/**
 * Exercise Library Service
 *
 * Manages athlete exercise repository (athletes/{athleteId}/exercises).
 * Provides offline-first caching, starter exercise seeds, and search/filtering.
 */

import { ExerciseDocument } from "@shared/types/training";
import { db } from "@shared/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc
} from "firebase/firestore";
import { sanitizeForFirestore } from "@shared/lib/firebase/sanitize";

const STORAGE_KEY_PREFIX = "apex_exercises_";

export const MUSCLE_GROUPS = [
  "Láb / Comb",
  "Farizom",
  "Mellkas",
  "Hát",
  "Váll",
  "Kar / Bicepsz / Tricepsz",
  "Törzs / Has / Core",
  "Egész test"
];

export const EQUIPMENT_TAGS = [
  "Rúd / Tárcsa",
  "Kézisúlyzó",
  "Kettlebell",
  "Csiga / Gép",
  "Saját testsúly",
  "Gumiszerkezet / Szalag",
  "TRX / Felfüggesztés"
];

export const SPORT_TAGS = [
  "Erőemelés / Kondi",
  "Futás kiegészítő",
  "Úszás kiegészítő",
  "Kerékpár kiegészítő",
  "Mobilitás / Prehab"
];

export const STARTER_EXERCISES: Omit<ExerciseDocument, "athleteId">[] = [
  {
    id: "ex-back-squat",
    name: "Guggolás rúddal (Back Squat)",
    description: "Alapvető alsótest-erőfejlesztő gyakorlat. Fókusz: térd és lábfej egy vonalban, stabil törzs, semleges gerinc a teljes mozgástartományban.",
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
    defaultSetsRepsLoad: "3-4 sorozat × 6-8 ismétlés @ RPE 7-8",
    tags: ["Láb / Comb", "Farizom", "Rúd / Tárcsa", "Erőemelés / Kondi"],
    category: "Alsótest erő",
    isFavorite: true,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  },
  {
    id: "ex-rdl",
    name: "Román felhúzás (Romanian Deadlift - RDL)",
    description: "Hátulsó mozgáslánc (combhajlító, farizom, derék) megerősítése. Fókusz: csípőhátra tolása enyhén hajlított térddel, hát egyenesen tartása.",
    videoUrl: "https://www.youtube.com/watch?v=JCXUYuzwNrM",
    defaultSetsRepsLoad: "3 sorozat × 8-10 ismétlés @ RPE 7",
    tags: ["Láb / Comb", "Farizom", "Hát", "Rúd / Tárcsa", "Futás kiegészítő"],
    category: "Hátulsó lánc",
    isFavorite: true,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  },
  {
    id: "ex-bench-press",
    name: "Fekvenyomás rúddal (Bench Press)",
    description: "Felsőtest horizontális nyomóerő. Fókusz: stabil lapockazárás, lábak a talajon, rúd érintése a szegycsont alsó részén.",
    videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg",
    defaultSetsRepsLoad: "4 sorozat × 6-8 ismétlés @ RPE 8",
    tags: ["Mellkas", "Váll", "Kar / Bicepsz / Tricepsz", "Rúd / Tárcsa", "Erőemelés / Kondi"],
    category: "Felsőtest nyomás",
    isFavorite: false,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  },
  {
    id: "ex-pull-ups",
    name: "Húzódzkodás (Pull-ups)",
    description: "Felsőtest vertikális húzóerő. Fókusz: teljes nyúlás az alsó ponton, mellkas a rúdhoz emelése lendületvétel nélkül.",
    videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
    defaultSetsRepsLoad: "3-4 sorozat × 6-10 ismétlés @ RPE 8",
    tags: ["Hát", "Kar / Bicepsz / Tricepsz", "Saját testsúly", "Úszás kiegészítő"],
    category: "Felsőtest húzás",
    isFavorite: true,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  },
  {
    id: "ex-bulgarian-split-squat",
    name: "Bolgár guggolás (Bulgarian Split Squat)",
    description: "Unilaterális láberő és csípőstabilitás. Fókusz: a hátsó láb emelvényen pihen, a testsúly 85%-a az elülső talpon oszlik el.",
    videoUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE",
    defaultSetsRepsLoad: "3 sorozat × 8-10 ismétlés / láb @ RPE 7-8",
    tags: ["Láb / Comb", "Farizom", "Kézisúlyzó", "Futás kiegészítő"],
    category: "Unilaterális láb",
    isFavorite: true,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  },
  {
    id: "ex-plank",
    name: "Alkaros törzstartás (Plank)",
    description: "Anti-extenziós törzs- és core-stabilitás. Fókusz: medence semleges helyzetben, farizom és has megfeszítve, lapockák kitolva.",
    videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c",
    defaultSetsRepsLoad: "3 sorozat × 45-60 másodperc megtartás",
    tags: ["Törzs / Has / Core", "Saját testsúly", "Mobilitás / Prehab"],
    category: "Core stabilitás",
    isFavorite: false,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  },
  {
    id: "ex-banded-rotator",
    name: "Váll rotátorköpeny kirotáció gumiszalaggal",
    description: "Vállízületi sérülésmegelőzés és lapockastabilitás. Fókusz: könyök 90 fokban a test mellett, kontrollált lassú mozgás.",
    videoUrl: "https://www.youtube.com/watch?v=fV79PqC8h3E",
    defaultSetsRepsLoad: "3 sorozat × 15 ismétlés / kar",
    tags: ["Váll", "Gumiszerkezet / Szalag", "Úszás kiegészítő", "Mobilitás / Prehab"],
    category: "Prehab & Mobilitás",
    isFavorite: false,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z"
  }
];

export function getLocalExercises(athleteId: string): ExerciseDocument[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${athleteId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  // Seed default starter exercises for new athletes
  const seeded: ExerciseDocument[] = STARTER_EXERCISES.map((ex) => ({
    ...ex,
    athleteId
  }));
  saveLocalExercises(athleteId, seeded);
  return seeded;
}

export function saveLocalExercises(athleteId: string, exercises: ExerciseDocument[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${athleteId}`, JSON.stringify(exercises));
  } catch {
    // storage full
  }
}

/**
 * Fetch all exercises for the athlete (local cached first, optionally synced with Firestore)
 */
export async function getExercises(athleteId: string): Promise<ExerciseDocument[]> {
  const local = getLocalExercises(athleteId);

  // Sync from Firestore in background if online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const colRef = collection(db, "athletes", athleteId, "exercises");
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const firestoreList: ExerciseDocument[] = [];
        snapshot.forEach((d) => {
          firestoreList.push(d.data() as ExerciseDocument);
        });
        saveLocalExercises(athleteId, firestoreList);
        return firestoreList;
      }
    } catch {
      // Fallback to local
    }
  }

  return local;
}

/**
 * Save or update an exercise in the athlete's library
 */
export interface ExerciseInput {
  id?: string;
  name: string;
  description?: string;
  videoUrl?: string;
  defaultSetsRepsLoad?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt?: string;
}

export async function saveExercise(
  athleteId: string,
  exerciseData: ExerciseInput
): Promise<ExerciseDocument> {
  const existingList = getLocalExercises(athleteId);
  const now = new Date().toISOString();
  const id = exerciseData.id || `ex-${Date.now()}`;
  const existingItem = existingList.find((e) => e.id === id);

  const fullDoc: ExerciseDocument = {
    id,
    athleteId,
    name: exerciseData.name,
    description: exerciseData.description ?? existingItem?.description,
    videoUrl: exerciseData.videoUrl ?? existingItem?.videoUrl,
    defaultSetsRepsLoad: exerciseData.defaultSetsRepsLoad ?? existingItem?.defaultSetsRepsLoad,
    tags: exerciseData.tags ?? existingItem?.tags ?? [],
    isFavorite: exerciseData.isFavorite !== undefined ? exerciseData.isFavorite : (existingItem?.isFavorite ?? false),
    createdAt: exerciseData.createdAt || existingItem?.createdAt || now,
    updatedAt: now
  };

  const existingIdx = existingList.findIndex((e) => e.id === id);
  let updatedList: ExerciseDocument[];
  if (existingIdx >= 0) {
    updatedList = [...existingList];
    updatedList[existingIdx] = fullDoc;
  } else {
    updatedList = [fullDoc, ...existingList];
  }

  saveLocalExercises(athleteId, updatedList);

  // Save to Firestore if online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const docRef = doc(db, "athletes", athleteId, "exercises", id);
      await setDoc(docRef, sanitizeForFirestore({ ...fullDoc, schemaVersion: 1 }), { merge: true });
    } catch {
      // Offline fallback
    }
  }

  return fullDoc;
}

/**
 * Delete an exercise from the library (soft delete)
 */
export async function deleteExercise(athleteId: string, exerciseId: string): Promise<void> {
  const existingList = getLocalExercises(athleteId);
  const now = new Date().toISOString();
  const updatedList = existingList.map((e) => (e.id === exerciseId ? { ...e, deletedAt: now } : e));
  saveLocalExercises(athleteId, updatedList.filter((e) => !e.deletedAt));

  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const docRef = doc(db, "athletes", athleteId, "exercises", exerciseId);
      await setDoc(docRef, { deletedAt: now }, { merge: true });
    } catch {
      // Offline fallback
    }
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavoriteExercise(athleteId: string, exerciseId: string): Promise<boolean> {
  const existingList = getLocalExercises(athleteId);
  const item = existingList.find((e) => e.id === exerciseId);
  if (!item) return false;

  const newStatus = !item.isFavorite;
  await saveExercise(athleteId, {
    ...item,
    isFavorite: newStatus
  });

  return newStatus;
}
