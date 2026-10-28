import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  BottomSheet,
  Button,
  Input,
  NumberInput,
  Slider,
  showToast
} from "@shared/ui";
import { CompletedSessionDocument, StrengthExercise, TrainingBlock } from "@shared/types";
import {
  saveSession,
  softDeleteSession
} from "@shared/lib/repositories/sessionRepository";
import { getLocalSessions } from "@shared/lib/offline/offlineStorage";
import { recomputeLoadsFromDate } from "@shared/lib/load/loadRecomputation";
import {
  getSportById,
  SportDefinition
} from "@shared/lib/sports";
import { cloneBlocks, deriveBlocksFromStrengthSets } from "@shared/lib/blocks";
import { TrainingBlockList } from "./blocks/TrainingBlockList";
import { RestTimerModal } from "./blocks/RestTimerModal";
import { SportPickerSheet } from "@features/sports/components/SportPickerSheet";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { saveExercise, ExerciseDocument } from "@shared/lib/exercises";
import {
  getEquipmentList,
  getLastUsedEquipment,
  setLastUsedEquipment,
  recomputeEquipmentTotals
} from "@shared/lib/equipment";
import { EquipmentItem } from "@shared/types/equipment";
import { getCourses } from "@shared/lib/courses";
import { CourseDocument, RecordBeatPrompt } from "@shared/types/records";
import { getRecords, detectRecordBeat } from "@shared/lib/records";
import { RecordBeatPromptModal } from "@features/records/components/RecordBeatPromptModal";
import { WorkoutFileDropzone } from "./WorkoutFileDropzone";
import {
  ParsedWorkoutFileResult,
  DuplicateSessionMatch,
  findDuplicateSession,
  mergeFileIntoSession,
  uploadWorkoutFile
} from "@shared/lib/devices/workoutFileService";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Dumbbell,
  Video,
  Bookmark,
  Calendar as CalendarIcon,
  Wrench,
  MapPin,
  AlertTriangle,
  Sparkles,
  Layers,
  Timer
} from "lucide-react";

export interface ManualSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  sessionToEdit?: CompletedSessionDocument | null;
  onSessionSaved?: (session: CompletedSessionDocument) => void;
  onSessionDeleted?: (sessionId: string) => void;
}

const RPE_DESCRIPTIONS: Record<number, { hu: string; en: string }> = {
  1: { hu: "Nagyon könnyű (laza séta, regeneráció)", en: "Very light (easy recovery walk)" },
  2: { hu: "Könnyű (kényelmes beszélgetős tempó)", en: "Light (conversational aerobic)" },
  3: { hu: "Mérsékelt (stabil Z2 alapozó terhelés)", en: "Moderate (steady Zone 2)" },
  4: { hu: "Kicsit nehéz (érezhető munka, folyamatos)", en: "Somewhat hard (felt effort)" },
  5: { hu: "Nehéz (Z3 tempó, ritmikus légzés)", en: "Hard (Zone 3 tempo effort)" },
  6: { hu: "Nehezebb (fokozott feszültség)", en: "Harder (sustained rhythm)" },
  7: { hu: "Nagyon nehéz (Z4 laktát-küszöb, szaggatott beszéd)", en: "Very hard (Z4 lactate threshold)" },
  8: { hu: "Nagyon-nagyon nehéz (kemény intervallumok)", en: "Very hard+ (intense intervals)" },
  9: { hu: "Majdnem maximális (VO2max, savasodás)", en: "Near maximal (VO2max exhaustion)" },
  10: { hu: "Maximális erőkifejtés (teljes kimerülésig)", en: "Maximal exertion (all-out)" }
};

const COMMON_SPORTS = [
  { id: "running", labelHu: "Futás", icon: "🏃" },
  { id: "cycling", labelHu: "Bringa", icon: "🚴" },
  { id: "swimming", labelHu: "Úszás", icon: "🏊" },
  { id: "strength", labelHu: "Kondi", icon: "🏋️" },
  { id: "rowing", labelHu: "Evezés", icon: "🚣" },
  { id: "yoga", labelHu: "Jóga", icon: "🧘" }
];

export const ManualSessionModal: React.FC<ManualSessionModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  sessionToEdit,
  onSessionSaved,
  onSessionDeleted
}) => {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const isHu = i18n.language.startsWith("hu");
  const athleteId = user?.uid || "demo-athlete-001";

  // Helper date functions
  const formatDateYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => formatDateYMD(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateYMD(d);
  }, []);
  const twoDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return formatDateYMD(d);
  }, []);

  // Form Fields
  const [sessionDate, setSessionDate] = useState<string>(todayStr);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [sportId, setSportId] = useState<string>("running");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [rpe, setRpe] = useState<number>(6);

  // Collapsed Details State
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Metric-profile specific fields
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [avgHeartRate, setAvgHeartRate] = useState<number>(0);
  const [maxHeartRate, setMaxHeartRate] = useState<number>(0);
  const [elevationMeters, setElevationMeters] = useState<number>(0);
  const [rounds, setRounds] = useState<number>(5);
  const [workSeconds, setWorkSeconds] = useState<number>(180);
  const [restSeconds, setRestSeconds] = useState<number>(60);
  const [scoreResult, setScoreResult] = useState<string>("");

  // Strength Exercises list
  const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>([]);

  // Training Blocks (Rounds and Rest)
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [isBlocksExpanded, setIsBlocksExpanded] = useState<boolean>(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState<boolean>(false);
  const [timerBlock, setTimerBlock] = useState<TrainingBlock | null>(null);
  const [useBlockAveragedRpe, setUseBlockAveragedRpe] = useState<boolean>(false);

  // Equipment & Course linking
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<CourseDocument[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [recordBeatPrompt, setRecordBeatPrompt] = useState<RecordBeatPrompt | null>(null);

  // Modals state
  const [isSportPickerOpen, setIsSportPickerOpen] = useState(false);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [videoModalExercise, setVideoModalExercise] = useState<{
    name: string;
    description?: string;
    videoUrl?: string;
  } | null>(null);

  // Workout File Upload, Prefill & Duplication State
  const [parsedFileResult, setParsedFileResult] = useState<ParsedWorkoutFileResult | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateSessionMatch | null>(null);
  const [computedFileLoad, setComputedFileLoad] = useState<number | null>(null);
  const [avgPowerWatts, setAvgPowerWatts] = useState<number>(0);
  const [calories, setCalories] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Active sport metadata
  const currentSport: SportDefinition = useMemo(() => {
    return (
      getSportById(sportId) || {
        id: sportId,
        nameHu: sportId,
        nameEn: sportId,
        category: "endurance",
        metricProfile: "duration_only",
        icon: "⚡"
      }
    );
  }, [sportId]);

  // Load equipment and courses on mount/open
  useEffect(() => {
    if (!isOpen) return;
    getEquipmentList(athleteId).then(setAllEquipment);
    getCourses(athleteId).then(setAllCourses);
  }, [athleteId, isOpen]);

  // Populate or reset form fields
  useEffect(() => {
    if (sessionToEdit) {
      setSessionDate(sessionToEdit.date);
      setSportId(sessionToEdit.sport);
      setTitle(sessionToEdit.title);
      setStartTime(
        sessionToEdit.startTime.includes("T")
          ? sessionToEdit.startTime.split("T")[1]?.substring(0, 5) || "09:00"
          : sessionToEdit.startTime
      );
      setDurationMinutes(sessionToEdit.durationMinutes);
      setRpe(sessionToEdit.rpe);
      setNotes(sessionToEdit.notes || "");
      if (sessionToEdit.metrics?.distanceMeters) {
        setDistanceKm(+(sessionToEdit.metrics.distanceMeters / 1000).toFixed(2));
      }
      if (sessionToEdit.metrics?.avgPowerWatts || sessionToEdit.metrics?.avgPower) {
        setAvgPowerWatts(sessionToEdit.metrics.avgPowerWatts || sessionToEdit.metrics.avgPower || 0);
      }
      if (sessionToEdit.metrics?.calories) setCalories(sessionToEdit.metrics.calories);
      setSelectedEquipmentIds(sessionToEdit.equipmentIds || []);
      setSelectedCourseId(sessionToEdit.courseId || "");
      setIsDetailsExpanded(true); // expand details when editing

      if (sessionToEdit.blocks && sessionToEdit.blocks.length > 0) {
        setBlocks(cloneBlocks(sessionToEdit.blocks));
        setIsBlocksExpanded(true);
      } else {
        setBlocks([]);
        setIsBlocksExpanded(false);
      }
      setUseBlockAveragedRpe(false);

      setParsedFileResult(
        sessionToEdit.fileRef
          ? {
              fileType: sessionToEdit.fileType || "fit",
              fileName: sessionToEdit.fileName || "Csatolt fájl",
              fileSizeBytes: sessionToEdit.fileSizeBytes || 0,
              sportId: sessionToEdit.sport,
              isSportKnown: true,
              date: sessionToEdit.date,
              startTime: sessionToEdit.startTime.includes("T")
                ? sessionToEdit.startTime.split("T")[1]?.substring(0, 5) || "09:00"
                : sessionToEdit.startTime,
              isoStartTime: sessionToEdit.startTime,
              durationMinutes: sessionToEdit.durationMinutes,
              durationSeconds: sessionToEdit.durationSeconds || sessionToEdit.durationMinutes * 60,
              distanceKm: sessionToEdit.metrics?.distanceMeters ? +(sessionToEdit.metrics.distanceMeters / 1000).toFixed(2) : undefined,
              avgHeartRate: sessionToEdit.metrics?.avgHeartRate,
              maxHeartRate: sessionToEdit.metrics?.maxHeartRate,
              avgPowerWatts: sessionToEdit.metrics?.avgPowerWatts || sessionToEdit.metrics?.avgPower,
              elevationGainMeters: sessionToEdit.metrics?.elevationGainMeters,
              calories: sessionToEdit.metrics?.calories,
              title: sessionToEdit.title,
              timeSeries: sessionToEdit.timeSeries || { points: [] },
              activity: {
                id: sessionToEdit.sessionId,
                userId: athleteId,
                provider: "manual",
                providerRecordId: sessionToEdit.sessionId,
                sport: "other",
                title: sessionToEdit.title,
                startTime: sessionToEdit.startTime,
                durationSeconds: sessionToEdit.durationSeconds || sessionToEdit.durationMinutes * 60,
                distanceMeters: sessionToEdit.metrics?.distanceMeters,
                elevationGainMeters: sessionToEdit.metrics?.elevationGainMeters,
                avgHeartRate: sessionToEdit.metrics?.avgHeartRate,
                maxHeartRate: sessionToEdit.metrics?.maxHeartRate,
                avgPowerWatts: sessionToEdit.metrics?.avgPowerWatts || sessionToEdit.metrics?.avgPower,
                calories: sessionToEdit.metrics?.calories,
                sourceConfidence: 1,
                createdAt: sessionToEdit.createdAt || new Date().toISOString()
              }
            }
          : null
      );
      setAttachedFile(null);
      setPrefilledFields(new Set());
      setDuplicateMatch(null);
      setComputedFileLoad(null);
    } else {
      setSessionDate(defaultDate || todayStr);
      setStartTime(new Date().toTimeString().substring(0, 5));
      setSportId("running");
      setTitle("");
      setDurationMinutes(60);
      setRpe(6);
      setNotes("");
      setDistanceKm(0);
      setAvgHeartRate(0);
      setMaxHeartRate(0);
      setElevationMeters(0);
      setAvgPowerWatts(0);
      setCalories(0);
      setStrengthExercises([]);
      setBlocks([]);
      setIsBlocksExpanded(false);
      setUseBlockAveragedRpe(false);
      const lastUsed = getLastUsedEquipment(athleteId, "running");
      setSelectedEquipmentIds(lastUsed);
      setSelectedCourseId("");
      setIsDetailsExpanded(false);
      setParsedFileResult(null);
      setAttachedFile(null);
      setPrefilledFields(new Set());
      setDuplicateMatch(null);
      setComputedFileLoad(null);
    }
    setRecordBeatPrompt(null);
    setIsConfirmingDelete(false);
  }, [sessionToEdit, defaultDate, isOpen, todayStr, athleteId]);

  // Handle file parsing & prefill
  const handleFileParsed = (result: ParsedWorkoutFileResult, file: File) => {
    // 1. Duplicate check against existing sessions (when logging a new session)
    if (!sessionToEdit) {
      const allSessions = getLocalSessions(athleteId);
      const duplicate = findDuplicateSession(result, allSessions);
      if (duplicate) {
        setDuplicateMatch(duplicate);
      }
    }

    // 2. Prefill form fields
    const prefilled = new Set<string>();

    if (result.sportId && result.isSportKnown) {
      setSportId(result.sportId);
      prefilled.add("sport");
    } else {
      if (result.sportId) {
        setSportId(result.sportId);
      }
      showToast({
        title: "Sportág kiválasztása",
        message: "A fájlból nem sikerült pontosan beazonosítani a sportágat, kérjük válassz a listából.",
        variant: "info"
      });
    }

    if (result.date) {
      setSessionDate(result.date);
      prefilled.add("date");
    }

    if (result.startTime) {
      setStartTime(result.startTime);
      prefilled.add("startTime");
    }

    if (result.durationMinutes) {
      setDurationMinutes(result.durationMinutes);
      prefilled.add("duration");
    }

    if (result.distanceKm !== undefined && result.distanceKm > 0) {
      setDistanceKm(result.distanceKm);
      prefilled.add("distance");
      setIsDetailsExpanded(true);
    }

    if (result.avgHeartRate !== undefined && result.avgHeartRate > 0) {
      setAvgHeartRate(result.avgHeartRate);
      prefilled.add("avgHeartRate");
      setIsDetailsExpanded(true);
    }

    if (result.maxHeartRate !== undefined && result.maxHeartRate > 0) {
      setMaxHeartRate(result.maxHeartRate);
      prefilled.add("maxHeartRate");
      setIsDetailsExpanded(true);
    }

    if (result.elevationGainMeters !== undefined && result.elevationGainMeters > 0) {
      setElevationMeters(result.elevationGainMeters);
      prefilled.add("elevation");
      setIsDetailsExpanded(true);
    }

    if (result.avgPowerWatts !== undefined && result.avgPowerWatts > 0) {
      setAvgPowerWatts(result.avgPowerWatts);
      prefilled.add("avgPower");
      setIsDetailsExpanded(true);
    }

    if (result.calories !== undefined && result.calories > 0) {
      setCalories(result.calories);
      prefilled.add("calories");
      setIsDetailsExpanded(true);
    }

    if (result.title) {
      setTitle(result.title);
      prefilled.add("title");
    }

    if (result.computedLoad !== undefined && result.computedLoad > 0) {
      setComputedFileLoad(result.computedLoad);
    }

    if (result.strengthSets && result.strengthSets.length > 0 && blocks.length === 0) {
      const derived = deriveBlocksFromStrengthSets(result.strengthSets);
      if (derived.length > 0) {
        setBlocks(derived);
        setIsBlocksExpanded(true);
        setIsDetailsExpanded(true);
      }
    }

    setParsedFileResult(result);
    setAttachedFile(file);
    setPrefilledFields(prefilled);

    showToast({
      title: "Fájl sikeresen beolvasva",
      message: `${result.fileName} adatai kitöltve. Ellenőrizd és add meg a megterhelést (RPE).`,
      variant: "success"
    });
  };

  const handleClearAttachedFile = () => {
    setParsedFileResult(null);
    setAttachedFile(null);
    setPrefilledFields(new Set());
    setDuplicateMatch(null);
    setComputedFileLoad(null);
  };

  const handleMergeDuplicate = async () => {
    if (!duplicateMatch || !parsedFileResult) return;
    setIsSaving(true);
    try {
      let fileRef: string | undefined;
      if (attachedFile) {
        fileRef = await uploadWorkoutFile(
          athleteId,
          duplicateMatch.existingSession.sessionId,
          attachedFile,
          parsedFileResult.fileName
        );
      }
      const merged = mergeFileIntoSession(duplicateMatch.existingSession, parsedFileResult, fileRef);
      await saveSession(merged);

      const allSessions = getLocalSessions(athleteId);
      recomputeLoadsFromDate({
        athleteId,
        sessions: allSessions,
        affectedFromDate: merged.date
      });
      await recomputeEquipmentTotals(athleteId, allSessions);

      onSessionSaved?.(merged);
      showToast({
        title: "Edzések összefésülve",
        message: `${merged.title} frissítve a fájl adataival.`,
        variant: "success"
      });
      onClose();
    } catch {
      showToast({
        title: "Hiba összefésüléskor",
        variant: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsNew = () => {
    setDuplicateMatch(null);
    showToast({
      title: "Új edzésként mentés",
      message: "Az edzés új bejegyzésként fog mentődni.",
      variant: "info"
    });
  };

  const handleCancelDuplicate = () => {
    handleClearAttachedFile();
  };


  // Check if previous session of the same sport with blocks exists
  const hasLastSessionWithBlocks = useMemo(() => {
    const allSessions = getLocalSessions(athleteId);
    return allSessions.some(
      (s) => s.sport === sportId && s.sessionId !== sessionToEdit?.sessionId && s.blocks && s.blocks.length > 0
    );
  }, [athleteId, sportId, sessionToEdit]);

  // Copy blocks from last session
  const handleCopyLastSessionBlocks = () => {
    const allSessions = getLocalSessions(athleteId);
    const similar = allSessions
      .filter((s) => s.sport === sportId && s.sessionId !== sessionToEdit?.sessionId && s.blocks && s.blocks.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (similar && similar.blocks && similar.blocks.length > 0) {
      const cloned = cloneBlocks(similar.blocks).map((b) => ({
        ...b,
        completedRounds: b.rounds,
        rows: (b.rows || []).map((r) => ({
          ...r,
          completed: false,
          resultText: undefined,
          actualPowerWatts: undefined,
          roundOverrides: r.roundOverrides?.map((o) => ({
            ...o,
            completed: false
          }))
        }))
      }));
      setBlocks(cloned);
      setIsBlocksExpanded(true);
      showToast({
        title: "Blokkok átmásolva",
        message: `${similar.date}-i ${similar.title || currentSport.nameHu} blokkstruktúrája átvéve (eredmények törölve).`,
        variant: "success"
      });
    } else {
      showToast({
        title: "Nincs korábbi edzés",
        message: `Nem található korábbi ${currentSport.nameHu} edzés blokkokkal.`,
        variant: "info"
      });
    }
  };

  // Block-averaged RPE calculation
  const blockAveragedRpe = useMemo(() => {
    if (blocks.length === 0) return null;
    let sum = 0;
    let count = 0;
    for (const b of blocks) {
      if (b.rows && b.rows.length > 0) {
        for (const r of b.rows) {
          if (r.rpe && r.rpe > 0) {
            sum += r.rpe;
            count++;
          }
          if (r.roundOverrides && r.roundOverrides.length > 0) {
            for (const o of r.roundOverrides) {
              if (o.rpe && o.rpe > 0) {
                sum += o.rpe;
                count++;
              }
            }
          }
        }
      }
    }
    return count > 0 ? Math.round(sum / count) : null;
  }, [blocks]);

  useEffect(() => {
    if (useBlockAveragedRpe && blockAveragedRpe !== null) {
      setRpe(blockAveragedRpe);
    }
  }, [useBlockAveragedRpe, blockAveragedRpe]);

  // Session-RPE Load Calculation: Foster Method
  const sessionLoad = Math.round(durationMinutes * rpe);

  // Add exercise snapshot from library
  const handleAddExerciseFromLibrary = (libEx: ExerciseDocument) => {
    const snapshot: StrengthExercise = {
      id: `ex-snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      libraryExerciseId: libEx.id,
      name: libEx.name,
      sets: 3,
      reps: 10,
      loadKg: 0,
      rpe: 7,
      description: libEx.description,
      videoUrl: libEx.videoUrl,
      notes: libEx.defaultSetsRepsLoad
    };
    setStrengthExercises((prev) => [...prev, snapshot]);
    showToast({
      title: "Gyakorlat hozzáadva",
      message: `${libEx.name} másolva az edzésbe (könyvtár változatlan)`,
      type: "success"
    });
  };

  // Add manual freehand exercise
  const handleAddManualExercise = () => {
    const newEx: StrengthExercise = {
      id: `ex-free-${Date.now()}`,
      name: `Új gyakorlat ${strengthExercises.length + 1}`,
      sets: 3,
      reps: 10,
      loadKg: 0,
      rpe: 7
    };
    setStrengthExercises((prev) => [...prev, newEx]);
  };

  // Explicit action: Save exercise from workout to library
  const handleSaveExerciseToLibrary = async (ex: StrengthExercise) => {
    try {
      const saved = await saveExercise(athleteId, {
        name: ex.name,
        description: ex.description,
        videoUrl: ex.videoUrl,
        defaultSetsRepsLoad: `${ex.sets}x${ex.reps}${ex.loadKg ? ` @ ${ex.loadKg}kg` : ""}`,
        tags: [currentSport.nameHu, "Erőemelés / Kondi"],
        isFavorite: false
      });
      // Link snapshot to new library item
      setStrengthExercises((prev) =>
        prev.map((item) => (item.id === ex.id ? { ...item, libraryExerciseId: saved.id } : item))
      );
      showToast({
        title: "Mentve a könyvtárba",
        message: `${saved.name} hozzáadva az edzéskönyvtáradhoz.`,
        type: "success"
      });
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült elmenteni a könyvtárba.",
        type: "error"
      });
    }
  };

  // Explicit action: Update linked exercise in library
  const handleUpdateLibraryExercise = async (ex: StrengthExercise) => {
    if (!ex.libraryExerciseId) return;
    try {
      await saveExercise(athleteId, {
        id: ex.libraryExerciseId,
        name: ex.name,
        description: ex.description,
        videoUrl: ex.videoUrl,
        defaultSetsRepsLoad: `${ex.sets}x${ex.reps}${ex.loadKg ? ` @ ${ex.loadKg}kg` : ""}`
      });
      showToast({
        title: "Könyvtár bejegyzés frissítve",
        message: `${ex.name} adatai frissültek a könyvtárban.`,
        type: "success"
      });
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült frissíteni a könyvtárat.",
        type: "error"
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const sessionId = sessionToEdit?.sessionId || `sess-${Date.now()}`;
      const defaultTitle = title.trim() || `${currentSport.nameHu} edzés`;

      const originalDate = sessionToEdit?.date;
      const isDateMoved = Boolean(originalDate && originalDate !== sessionDate);

      let fileRef = sessionToEdit?.fileRef;
      let fileType = sessionToEdit?.fileType || parsedFileResult?.fileType;
      let fileName = sessionToEdit?.fileName || parsedFileResult?.fileName;
      let fileSizeBytes = sessionToEdit?.fileSizeBytes || parsedFileResult?.fileSizeBytes;

      if (attachedFile && parsedFileResult) {
        try {
          fileRef = await uploadWorkoutFile(athleteId, sessionId, attachedFile, parsedFileResult.fileName);
          fileType = parsedFileResult.fileType;
          fileName = parsedFileResult.fileName;
          fileSizeBytes = parsedFileResult.fileSizeBytes;
        } catch (uploadErr) {
          console.warn("Storage upload failed, proceeding with offline cache", uploadErr);
        }
      }

      const finalRpe = (useBlockAveragedRpe && blockAveragedRpe !== null) ? blockAveragedRpe : rpe;
      const finalLoad = computedFileLoad || Math.round(durationMinutes * finalRpe);

      const sessionDoc: CompletedSessionDocument = {
        sessionId,
        athleteId,
        date: sessionDate,
        sport: sportId,
        title: defaultTitle,
        startTime,
        durationMinutes,
        rpe: finalRpe,
        targetIntensityRpe: sessionToEdit?.targetIntensityRpe || finalRpe,
        trainingLoad: finalLoad,
        blocks: blocks.length > 0 ? blocks : undefined,
        notes: notes.trim() || undefined,
        equipmentIds: selectedEquipmentIds.length > 0 ? selectedEquipmentIds : undefined,
        courseId: selectedCourseId || undefined,
        metrics: {
          distanceMeters: distanceKm > 0 ? Math.round(distanceKm * 1000) : undefined,
          avgHeartRate: avgHeartRate > 0 ? avgHeartRate : undefined,
          maxHeartRate: maxHeartRate > 0 ? maxHeartRate : undefined,
          elevationGainMeters: elevationMeters > 0 ? elevationMeters : undefined,
          avgPowerWatts: avgPowerWatts > 0 ? avgPowerWatts : undefined,
          calories: calories > 0 ? calories : undefined
        },
        completed: true,
        source: parsedFileResult ? "file" : (sessionToEdit?.source || "manual"),
        fileRef,
        fileType,
        fileName,
        fileSizeBytes,
        importedAt: parsedFileResult ? (sessionToEdit?.importedAt || new Date().toISOString()) : undefined,
        timeSeries: parsedFileResult?.timeSeries?.points?.length
          ? parsedFileResult.timeSeries
          : sessionToEdit?.timeSeries,
        confidence: parsedFileResult ? 1.0 : 0.95,
        createdAt: sessionToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: athleteId
      };

      await saveSession(sessionDoc);

      if (selectedEquipmentIds.length > 0) {
        setLastUsedEquipment(athleteId, sportId, selectedEquipmentIds);
      }

      // Recompute affected loads from the earliest affected date forward
      const affectedFromDate = isDateMoved && originalDate
        ? (originalDate < sessionDate ? originalDate : sessionDate)
        : sessionDate;

      const allSessions = getLocalSessions(athleteId);
      recomputeLoadsFromDate({
        athleteId,
        sessions: allSessions,
        affectedFromDate
      });

      // Recompute equipment totals
      await recomputeEquipmentTotals(athleteId, allSessions);

      // Check for record beat
      const existingRecords = await getRecords(athleteId);
      const beat = detectRecordBeat(sessionDoc, existingRecords);

      onSessionSaved?.(sessionDoc);

      showToast({
        title: isDateMoved
          ? `Edzés áthelyezve: ${sessionDate}`
          : isHu ? "Edzés rögzítve" : "Session logged",
        message: `${defaultTitle}: ${durationMinutes}p × ${rpe} RPE = ${sessionLoad} AU terhelés`,
        type: "success"
      });

      if (beat) {
        setRecordBeatPrompt(beat);
      } else {
        onClose();
      }
    } catch {
      showToast({
        title: "Mentési hiba",
        message: "Offline mentve.",
        type: "warning"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionToEdit) return;
    try {
      const deleteDate = sessionToEdit.date;
      await softDeleteSession(athleteId, sessionToEdit.sessionId);

      // Recompute loads after deletion from deleted session date forward
      const remainingSessions = getLocalSessions(athleteId);
      recomputeLoadsFromDate({
        athleteId,
        sessions: remainingSessions,
        affectedFromDate: deleteDate
      });

      // Recompute equipment totals
      await recomputeEquipmentTotals(athleteId, remainingSessions);

      onSessionDeleted?.(sessionToEdit.sessionId);
      showToast({
        title: "Edzés a kukába helyezve",
        message: `${sessionToEdit.title} áthelyezve a kukába (30 napig visszaállítható a Beállításokban).`,
        type: "info"
      });
      onClose();
    } catch {
      showToast({
        title: "Törlési hiba",
        message: "Kérjük próbáld újra.",
        type: "error"
      });
    }
  };

  const rpeInfo = RPE_DESCRIPTIONS[rpe] || { hu: "", en: "" };

  const renderPrefillBadge = (fieldName: string) => {
    if (!prefilledFields.has(fieldName)) return null;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
        <Sparkles className="w-2.5 h-2.5" />
        Fájlból kitöltve
      </span>
    );
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={
          sessionToEdit
            ? isHu ? "Edzés szerkesztése & áthelyezése" : "Edit & Move Training Session"
            : isHu ? "Edzés rögzítése" : "Log Training Session"
        }
      >
        <div className="p-4 sm:p-6 space-y-5">
          <form onSubmit={handleSave} className="space-y-5">
            {/* 0. FILE IMPORT OPTION: Dropzone / File Picker */}
            <div className="space-y-3">
              <WorkoutFileDropzone
                onFileParsed={handleFileParsed}
                onClearFile={handleClearAttachedFile}
                onOpenSportPicker={() => setIsSportPickerOpen(true)}
                currentParsedFile={parsedFileResult}
                compact={Boolean(parsedFileResult || sessionToEdit)}
                label={
                  sessionToEdit
                    ? "Fájl csatolása (FIT, GPX, TCX)"
                    : "Kitöltés fájlból (FIT, GPX, TCX)"
                }
              />

              {/* DUPLICATE WARNING BANNER */}
              {duplicateMatch && (
                <div className="p-3.5 rounded-16 bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-12 font-bold text-amber-300">
                        Már van hasonló edzés
                      </div>
                      <div className="text-11 text-text-secondary mt-0.5">
                        Egy hasonló időpontú ({duplicateMatch.existingSession.date} {duplicateMatch.existingSession.startTime}, {duplicateMatch.existingSession.durationMinutes} perc) <strong className="text-text-primary">{duplicateMatch.existingSession.title}</strong> edzés már létezik.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleMergeDuplicate}
                    >
                      Összefésülés
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleSaveAsNew}
                    >
                      Új edzésként mentés
                    </Button>
                    <button
                      type="button"
                      onClick={handleCancelDuplicate}
                      className="text-11 text-text-secondary hover:text-text-primary underline px-2 py-1"
                    >
                      Mégse
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 1. SPORT SELECTION: Common chips + Full catalog picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-12 font-medium uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <span>Sportág</span>
                  {renderPrefillBadge("sport")}
                </label>
                <button
                  type="button"
                  onClick={() => setIsSportPickerOpen(true)}
                  className="text-12 font-medium text-brand hover:underline"
                >
                  Több sportág keresése...
                </button>
              </div>

              {/* Quick 1-tap Common Sport Chips */}
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SPORTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSportId(item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-semibold border transition-all ${
                      sportId === item.id
                        ? "bg-brand/15 border-brand text-brand shadow-sm"
                        : "bg-bg-elevated border-border-hairline text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.labelHu}</span>
                  </button>
                ))}

                {/* If selected sport is outside common list, show it highlighted */}
                {!COMMON_SPORTS.some((c) => c.id === sportId) && (
                  <button
                    type="button"
                    onClick={() => setIsSportPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-12 text-12 font-semibold border bg-brand/15 border-brand text-brand shadow-sm"
                  >
                    <span>{currentSport.icon}</span>
                    <span>{currentSport.nameHu}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. RETROACTIVE DATE & TIME PICKER */}
            <div className="space-y-2 p-3.5 rounded-16 bg-bg-surface border border-border-hairline">
              <div className="flex items-center justify-between">
                <label className="text-12 font-medium uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-brand" />
                  <span>Dátum és időpont</span>
                  {(prefilledFields.has("date") || prefilledFields.has("startTime")) && renderPrefillBadge("date")}
                </label>
                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSessionDate(todayStr)}
                    className={`px-2 py-0.5 rounded-6 text-11 font-medium transition-colors ${
                      sessionDate === todayStr
                        ? "bg-brand text-white"
                        : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Ma
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionDate(yesterdayStr)}
                    className={`px-2 py-0.5 rounded-6 text-11 font-medium transition-colors ${
                      sessionDate === yesterdayStr
                        ? "bg-brand text-white"
                        : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Tegnap
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionDate(twoDaysAgoStr)}
                    className={`px-2 py-0.5 rounded-6 text-11 font-medium transition-colors ${
                      sessionDate === twoDaysAgoStr
                        ? "bg-brand text-white"
                        : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Két napja
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-text-tertiary block mb-1">Nap (bármely korábbi dátum)</span>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => {
                      if (e.target.value) setSessionDate(e.target.value);
                    }}
                    className="w-full rounded-10 border border-border-hairline bg-bg-elevated px-3 py-2 text-13 font-mono font-bold text-text-primary focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-text-tertiary block mb-1">Kezdési idő</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-10 border border-border-hairline bg-bg-elevated px-3 py-2 text-13 font-mono font-bold text-text-primary focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. DURATION (Minutes) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-12 font-medium uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <span>Időtartam (perc) *</span>
                  {renderPrefillBadge("duration")}
                </label>
                <div className="flex gap-1">
                  {[30, 45, 60, 90].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMinutes(m)}
                      className={`px-2 py-0.5 text-11 font-mono rounded-6 border transition-colors ${
                        durationMinutes === m
                          ? "bg-brand text-white border-brand"
                          : "bg-bg-surface border-border-hairline text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {m}p
                    </button>
                  ))}
                </div>
              </div>
              <NumberInput
                value={durationMinutes}
                onChange={(val) => setDurationMinutes(Math.max(1, val))}
                min={1}
                max={600}
                unit="perc"
              />
            </div>

            {/* 4. PERCEIVED EXERTION (RPE 1-10) */}
            <div className="space-y-2 p-4 rounded-16 bg-bg-surface border border-border-hairline">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-13 font-bold text-text-primary block">
                    Érzékelt megterhelés (RPE 1-10)
                  </span>
                  <span className="text-11 text-text-secondary">Borg CR10 skála</span>
                </div>
                <div className="text-right">
                  <span className="text-20 font-mono font-bold text-brand tabular-nums">
                    {rpe} / 10
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 block">
                    ~{computedFileLoad || sessionLoad} AU terhelés
                  </span>
                </div>
              </div>

              {computedFileLoad !== null && (
                <div className="p-2.5 rounded-12 bg-brand/10 border border-brand/20 text-xs text-brand flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-brand" />
                    <span>Számított terhelés a fájlból (HR / Watt):</span>
                  </div>
                  <span className="font-mono font-bold text-13">{computedFileLoad} AU</span>
                </div>
              )}

              <Slider
                min={1}
                max={10}
                step={1}
                value={rpe}
                onChange={setRpe}
              />
              <p className="text-12 text-text-secondary italic pt-0.5">
                {rpeInfo.hu}
              </p>
            </div>

            {/* 5. PROGRESSIVE DISCLOSURE: COLLAPSIBLE "RÉSZLETEK" */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className="w-full flex items-center justify-between p-3 rounded-12 bg-bg-surface border border-border-hairline text-12 font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <span>Részletek (cím, jegyzetek, sportági adatok)</span>
                {isDetailsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {isDetailsExpanded && (
                <div className="mt-3 p-4 rounded-16 bg-bg-surface border border-border-hairline space-y-4 animate-in fade-in duration-200">
                  {/* Session Title */}
                  <div className="space-y-1">
                    <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1.5">
                      <span>Edzés elnevezése (opcionális)</span>
                      {renderPrefillBadge("title")}
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={`pl. ${currentSport.nameHu} - Délelőtti edzés`}
                      fullWidth
                    />
                  </div>

                  {/* Sport Metric Profile Specific Inputs */}
                  {currentSport.metricProfile === "distance_duration" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1.5">
                          <span>Távolság (km)</span>
                          {renderPrefillBadge("distance")}
                        </label>
                        <NumberInput
                          value={distanceKm}
                          onChange={(val) => setDistanceKm(Math.max(0, val))}
                          step={0.1}
                          unit="km"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1.5">
                          <span>Átlagpulzus (bpm)</span>
                          {renderPrefillBadge("avgHeartRate")}
                        </label>
                        <NumberInput
                          value={avgHeartRate}
                          onChange={(val) => setAvgHeartRate(Math.max(0, val))}
                          step={1}
                          unit="bpm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1.5">
                          <span>Szintemelkedés (m)</span>
                          {renderPrefillBadge("elevation")}
                        </label>
                        <NumberInput
                          value={elevationMeters}
                          onChange={(val) => setElevationMeters(Math.max(0, val))}
                          step={5}
                          unit="m"
                        />
                      </div>
                    </div>
                  )}

                  {/* Power and Calories (if present or prefilled) */}
                  {(avgPowerWatts > 0 || calories > 0 || prefilledFields.has("avgPower") || prefilledFields.has("calories")) && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1.5">
                          <span>Átlagos teljesítmény (W)</span>
                          {renderPrefillBadge("avgPower")}
                        </label>
                        <NumberInput
                          value={avgPowerWatts}
                          onChange={(val) => setAvgPowerWatts(Math.max(0, val))}
                          step={5}
                          unit="W"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1.5">
                          <span>Elégetett energia (kcal)</span>
                          {renderPrefillBadge("calories")}
                        </label>
                        <NumberInput
                          value={calories}
                          onChange={(val) => setCalories(Math.max(0, val))}
                          step={10}
                          unit="kcal"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sets / Reps / Load (Strength Exercises) */}
                  {currentSport.metricProfile === "sets_reps_load" && (
                    <div className="space-y-3 pt-1 border-t border-border-hairline">
                      <div className="flex items-center justify-between">
                        <span className="text-12 font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                          <Dumbbell className="h-4 w-4 text-purple-400" />
                          <span>Gyakorlatok ({strengthExercises.length})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsExercisePickerOpen(true)}
                            leftIcon={<Bookmark className="h-3.5 w-3.5 text-brand" />}
                          >
                            Könyvtárból választás
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleAddManualExercise}
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                          >
                            + Sor
                          </Button>
                        </div>
                      </div>

                      {strengthExercises.length === 0 ? (
                        <p className="text-12 text-text-tertiary italic p-3 text-center bg-bg-elevated/40 rounded-10">
                          Nincs hozzáadva gyakorlat. Válassz a könyvtárból vagy adj hozzá egy új sort.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {strengthExercises.map((ex, idx) => (
                            <div
                              key={ex.id}
                              className="p-3 rounded-12 bg-bg-elevated/70 border border-border-hairline space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={ex.name}
                                  onChange={(e) => {
                                    const copy = [...strengthExercises];
                                    if (copy[idx]) {
                                      copy[idx]!.name = e.target.value;
                                      setStrengthExercises(copy);
                                    }
                                  }}
                                  className="bg-transparent text-13 font-semibold text-text-primary flex-1 focus:outline-none"
                                />

                                <div className="flex items-center gap-1">
                                  {/* View video / details if present */}
                                  {(ex.videoUrl || ex.description) && (
                                    <button
                                      type="button"
                                      onClick={() => setVideoModalExercise(ex)}
                                      className="p-1 text-brand hover:text-brand-300"
                                      title="Videó és leírás megtekintése"
                                    >
                                      <Video className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  {/* Save or update to library */}
                                  {ex.libraryExerciseId ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateLibraryExercise(ex)}
                                      className="text-[10px] text-purple-400 hover:underline px-1.5 py-0.5 rounded bg-purple-500/10"
                                      title="Könyvtár bejegyzés frissítése"
                                    >
                                      Frissítés könyvtárban
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveExerciseToLibrary(ex)}
                                      className="text-[10px] text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-emerald-500/10"
                                      title="Mentés a könyvtárba"
                                    >
                                      Mentés könyvtárba
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStrengthExercises((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="p-1 text-text-tertiary hover:text-status-rest"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                <div>
                                  <span className="text-[10px] text-text-tertiary block font-sans">
                                    Sorozat
                                  </span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={ex.sets}
                                    onChange={(e) => {
                                      const copy = [...strengthExercises];
                                      if (copy[idx]) {
                                        copy[idx]!.sets = parseInt(e.target.value, 10) || 1;
                                        setStrengthExercises(copy);
                                      }
                                    }}
                                    className="w-full bg-bg-surface border border-border-hairline rounded-8 px-2 py-1 text-text-primary text-center font-bold"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-text-tertiary block font-sans">
                                    Ismétlés
                                  </span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={ex.reps}
                                    onChange={(e) => {
                                      const copy = [...strengthExercises];
                                      if (copy[idx]) {
                                        copy[idx]!.reps = parseInt(e.target.value, 10) || 1;
                                        setStrengthExercises(copy);
                                      }
                                    }}
                                    className="w-full bg-bg-surface border border-border-hairline rounded-8 px-2 py-1 text-text-primary text-center font-bold"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-text-tertiary block font-sans">
                                    Súly (kg)
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={500}
                                    step={0.5}
                                    value={ex.loadKg || 0}
                                    onChange={(e) => {
                                      const copy = [...strengthExercises];
                                      if (copy[idx]) {
                                        copy[idx]!.loadKg = parseFloat(e.target.value) || 0;
                                        setStrengthExercises(copy);
                                      }
                                    }}
                                    className="w-full bg-bg-surface border border-border-hairline rounded-8 px-2 py-1 text-text-primary text-center font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rounds and Time */}
                  {currentSport.metricProfile === "rounds_time" && (
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary">
                          Menetek száma
                        </label>
                        <NumberInput
                          value={rounds}
                          onChange={(val) => setRounds(Math.max(1, val))}
                          min={1}
                          max={30}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary">
                          Munka (mp)
                        </label>
                        <NumberInput
                          value={workSeconds}
                          onChange={(val) => setWorkSeconds(Math.max(10, val))}
                          step={10}
                          unit="mp"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-11 font-semibold uppercase text-text-tertiary">
                          Pihenő (mp)
                        </label>
                        <NumberInput
                          value={restSeconds}
                          onChange={(val) => setRestSeconds(Math.max(5, val))}
                          step={5}
                          unit="mp"
                        />
                      </div>
                    </div>
                  )}

                  {/* Points / Score */}
                  {currentSport.metricProfile === "points" && (
                    <div className="space-y-1 pt-1">
                      <label className="text-11 font-semibold uppercase text-text-tertiary">
                        Eredmény / Pontszám
                      </label>
                      <Input
                        value={scoreResult}
                        onChange={(e) => setScoreResult(e.target.value)}
                        placeholder="pl. 6:4, 3:6, 7:5"
                        fullWidth
                      />
                    </div>
                  )}

                  {/* Equipment selector */}
                  {allEquipment.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5" />
                        Használt felszerelés
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {allEquipment
                          .filter(
                            (e) =>
                              e.status === "active" &&
                              (e.sportIds.length === 0 || e.sportIds.includes(sportId))
                          )
                          .map((eq) => {
                            const isSelected = selectedEquipmentIds.includes(eq.id);
                            return (
                              <button
                                key={eq.id}
                                type="button"
                                onClick={() =>
                                  setSelectedEquipmentIds((prev) =>
                                    prev.includes(eq.id)
                                      ? prev.filter((id) => id !== eq.id)
                                      : [...prev, eq.id]
                                  )
                                }
                                className={`px-2.5 py-1 rounded-8 text-xs font-medium border transition-colors ${
                                  isSelected
                                    ? "bg-brand/15 border-brand text-brand"
                                    : "bg-bg-elevated border-border-hairline text-text-secondary hover:text-text-primary"
                                }`}
                              >
                                {eq.name} ({eq.totalKm.toLocaleString("hu-HU")} km)
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Course / Pálya selector */}
                  {allCourses.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <label className="text-11 font-semibold uppercase text-text-tertiary flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        Pálya / Szakasz (opcionális)
                      </label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => {
                          const cId = e.target.value;
                          setSelectedCourseId(cId);
                          const crs = allCourses.find((c) => c.id === cId);
                          if (crs) {
                            if (distanceKm === 0) {
                              setDistanceKm(+(crs.distanceMeters / 1000).toFixed(2));
                            }
                            if (elevationMeters === 0 && crs.elevationGainMeters > 0) {
                              setElevationMeters(crs.elevationGainMeters);
                            }
                            if (!title) {
                              setTitle(`${crs.name}`);
                            }
                          }
                        }}
                        className="w-full rounded-12 border border-border-hairline bg-bg-elevated p-2 text-13 text-text-primary focus:border-brand focus:outline-none"
                      >
                        <option value="">-- Nincs kiválasztva --</option>
                        {allCourses
                          .filter((c) => !c.sportId || c.sportId === sportId)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({(c.distanceMeters / 1000).toFixed(2)} km, +{c.elevationGainMeters}m)
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Collapsible Edzésblokkok (Training Blocks) */}
                  <div className="space-y-2 pt-2 border-t border-border-hairline">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsBlocksExpanded((prev) => !prev)}
                        className="flex items-center gap-2 text-12 font-bold uppercase tracking-wider text-text-primary hover:text-brand transition-colors"
                      >
                        <Layers className="w-4 h-4 text-brand" />
                        <span>Blokkok {blocks.length > 0 ? `(${blocks.length})` : ""}</span>
                        {isBlocksExpanded ? (
                          <ChevronUp className="w-4 h-4 text-text-tertiary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-tertiary" />
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        {blocks.length > 0 && (
                          <label className="hidden sm:flex items-center gap-1.5 text-11 text-text-secondary cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={useBlockAveragedRpe}
                              onChange={(e) => setUseBlockAveragedRpe(e.target.checked)}
                              className="rounded bg-bg-surface border-border-hairline text-brand focus:ring-brand"
                            />
                            <span>RPE blokkonként átlagolva</span>
                          </label>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setTimerBlock(blocks[0] || null);
                            setIsRestTimerOpen(true);
                          }}
                          leftIcon={<Timer className="w-3.5 h-3.5 text-brand" />}
                        >
                          Pihenő időzítő
                        </Button>
                      </div>
                    </div>

                    {isBlocksExpanded && (
                      <div className="space-y-3 pt-2">
                        {blocks.length > 0 && (
                          <div className="sm:hidden flex items-center justify-between pb-1">
                            <label className="flex items-center gap-1.5 text-11 text-text-secondary cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={useBlockAveragedRpe}
                                onChange={(e) => setUseBlockAveragedRpe(e.target.checked)}
                                className="rounded bg-bg-surface border-border-hairline text-brand focus:ring-brand"
                              />
                              <span>RPE blokkonként átlagolva</span>
                            </label>
                          </div>
                        )}
                        <TrainingBlockList
                          blocks={blocks}
                          onChange={setBlocks}
                          athleteId={athleteId}
                          isCompletedSession={true}
                          hasLastSession={hasLastSessionWithBlocks}
                          onCopyLastSessionBlocks={handleCopyLastSessionBlocks}
                          laps={parsedFileResult?.laps}
                          strengthSets={parsedFileResult?.strengthSets}
                          onOpenTimer={(b) => {
                            setTimerBlock(b);
                            setIsRestTimerOpen(true);
                          }}
                          sport={sportId}
                        />
                      </div>
                    )}
                  </div>

                  {/* Subjective Notes */}
                  <div className="space-y-1">
                    <label className="text-11 font-semibold uppercase text-text-tertiary">
                      Sportolói megjegyzések & tapasztalatok
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="pl. Könnyű tempó, a combhajlító enyhén feszes volt az elején..."
                      className="w-full rounded-12 border border-border-hairline bg-bg-elevated p-2.5 text-13 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Save / Cancel / Delete */}
            <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
              <div>
                {sessionToEdit && (
                  <>
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={handleDelete}
                        >
                          Biztosan törlöd?
                        </Button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDelete(false)}
                          className="text-12 text-text-secondary hover:text-text-primary underline"
                        >
                          Mégse
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(true)}
                        className="inline-flex items-center gap-1.5 text-12 text-status-rest hover:underline font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Edzés törlése</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Mégse
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSaving}
                >
                  {sessionToEdit ? "Módosítás mentése" : "Edzés mentése"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Shared Sport Picker Sheet */}
      <SportPickerSheet
        isOpen={isSportPickerOpen}
        onClose={() => setIsSportPickerOpen(false)}
        selectedSportIds={[sportId]}
        onToggleSport={(id) => {
          setSportId(id);
          setIsSportPickerOpen(false);
        }}
        userId={athleteId}
      />

      {/* Exercise Picker from Library */}
      <ExercisePickerModal
        isOpen={isExercisePickerOpen}
        onClose={() => setIsExercisePickerOpen(false)}
        athleteId={athleteId}
        onSelectExercise={handleAddExerciseFromLibrary}
      />

      {/* Video Modal Player */}
      {videoModalExercise && (
        <VideoPlayerModal
          isOpen={Boolean(videoModalExercise)}
          onClose={() => setVideoModalExercise(null)}
          videoUrl={videoModalExercise.videoUrl}
          title={videoModalExercise.name}
          description={videoModalExercise.description}
        />
      )}

      {/* Record Beat Prompt Modal */}
      <RecordBeatPromptModal
        prompt={recordBeatPrompt}
        athleteId={athleteId}
        onClose={() => {
          setRecordBeatPrompt(null);
          onClose();
        }}
        onSaved={() => {
          setRecordBeatPrompt(null);
          onClose();
        }}
      />

      {/* Rest Timer Modal */}
      <RestTimerModal
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
        initialSeconds={timerBlock?.restBetweenRoundsSeconds || timerBlock?.restAfterBlockSeconds || 60}
        block={timerBlock || undefined}
      />
    </>
  );
};
