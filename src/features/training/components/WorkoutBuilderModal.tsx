import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  SportType,
  PlannedWorkout,
  WorkoutBlock,
  StrengthExercise,
  WorkoutTemplate
} from "@shared/types/training";
import { BottomSheet, Button, Badge, showToast } from "@shared/ui";
import {
  Plus,
  Trash2,
  Copy,
  FolderOpen,
  Dumbbell,
  Layers,
  Save,
  Clock,
  Sparkles,
  Bookmark,
  Video
} from "lucide-react";
import { ExercisePickerModal } from "./ExercisePickerModal";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { saveExercise, ExerciseDocument } from "@shared/lib/exercises";

interface WorkoutBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutToEdit?: PlannedWorkout | null;
  defaultDate?: string;
  athleteId: string;
  authorRole?: "athlete" | "coach" | "solo_generator";
  authorName?: string;
  onSaveWorkout: (workout: PlannedWorkout, saveAsTemplate?: boolean) => void;
  onCopyWeek?: (sourceDateStr: string, targetDateStr: string) => void;
}

// Pre-built template library for quick loading
const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "tpl-run-intervals",
    title: "5x1000m VO2max Intervallum (Futás)",
    sport: "running",
    description: "Klasszikus 1000m-es résztávos edzés 200m laza kocogó pihenőkkel.",
    estimatedDurationMinutes: 55,
    estimatedLoad: 80,
    blocks: [
      {
        id: "tb-1",
        name: "Bemelegítés és dinamikus fokozók",
        type: "warmup",
        durationMinutes: 15,
        targetType: "hr_zone",
        targetZone: 2
      },
      {
        id: "tb-2",
        name: "5 x 1000m VO2max inger",
        type: "interval",
        durationMinutes: 4,
        repeats: 5,
        restDurationMinutes: 2,
        targetType: "rpe",
        targetRpe: 9,
        targetZone: 5
      },
      {
        id: "tb-3",
        name: "Levezetés Z1",
        type: "cooldown",
        durationMinutes: 10,
        targetType: "hr_zone",
        targetZone: 1
      }
    ],
    tags: ["intervallum", "vo2max", "futás"]
  },
  {
    id: "tpl-bike-ftp",
    title: "3x12 perc Laktát-küszöb (FTP) Kerékpár",
    sport: "cycling",
    description: "Sustained threshold work at 95-100% FTP for aerobic power.",
    estimatedDurationMinutes: 75,
    estimatedLoad: 95,
    blocks: [
      {
        id: "tb-b1",
        name: "Progresszív bemelegítés",
        type: "warmup",
        durationMinutes: 15,
        targetType: "power",
        targetPower: 160
      },
      {
        id: "tb-b2",
        name: "3x12p FTP Blokk (95-100%)",
        type: "interval",
        durationMinutes: 12,
        repeats: 3,
        restDurationMinutes: 4,
        targetType: "power",
        targetPower: 275,
        targetZone: 4
      },
      {
        id: "tb-b3",
        name: "Pörgető levezetés",
        type: "cooldown",
        durationMinutes: 12,
        targetType: "power",
        targetPower: 140
      }
    ],
    tags: ["küszöb", "ftp", "bringa"]
  },
  {
    id: "tpl-strength-lower",
    title: "Alsótest Erő és Stabilitás",
    sport: "strength",
    description: "Guggolás, merevlábas felhúzás és egylábas stabilitás.",
    estimatedDurationMinutes: 60,
    estimatedLoad: 60,
    blocks: [],
    strengthExercises: [
      {
        id: "ex-1",
        name: "Guggolás rúddal (Back Squat)",
        sets: 4,
        reps: 6,
        loadKg: 85,
        rpe: 8,
        restSeconds: 120
      },
      {
        id: "ex-2",
        name: "Bolgár guggolás súlyzóval",
        sets: 3,
        reps: 8,
        loadKg: 20,
        rpe: 7,
        restSeconds: 90
      },
      {
        id: "ex-3",
        name: "Merevlábas felhúzás (RDL)",
        sets: 3,
        reps: 10,
        loadKg: 70,
        rpe: 8,
        restSeconds: 90
      },
      {
        id: "ex-4",
        name: "Plank saját testsúllyal",
        sets: 3,
        reps: 60,
        restSeconds: 60
      }
    ],
    tags: ["erőnlét", "alsótest", "stabilitás"]
  }
];

export const WorkoutBuilderModal: React.FC<WorkoutBuilderModalProps> = ({
  isOpen,
  onClose,
  workoutToEdit,
  defaultDate,
  athleteId,
  authorRole = "athlete",
  authorName = "Sportoló",
  onSaveWorkout,
  onCopyWeek
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language.startsWith("hu");

  const todayStr = defaultDate || new Date().toISOString().split("T")[0] as string;

  const [sport, setSport] = useState<SportType>("running");
  const [title, setTitle] = useState<string>("");
  const [date, setDate] = useState<string>(todayStr);
  const [isStrength, setIsStrength] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);

  // Structured Blocks
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([
    {
      id: "b-warmup",
      name: isHu ? "Bemelegítés Z2" : "Warmup Z2",
      type: "warmup",
      durationMinutes: 15,
      targetType: "hr_zone",
      targetZone: 2
    },
    {
      id: "b-main",
      name: isHu ? "Fő blokk" : "Main Set",
      type: "main",
      durationMinutes: 30,
      targetType: "rpe",
      targetRpe: 7,
      targetZone: 3
    },
    {
      id: "b-cooldown",
      name: isHu ? "Levezetés Z1" : "Cooldown Z1",
      type: "cooldown",
      durationMinutes: 10,
      targetType: "hr_zone",
      targetZone: 1
    }
  ]);

  // Strength Exercises
  const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>([
    {
      id: "ex-1",
      name: isHu ? "Guggolás rúddal" : "Barbell Squat",
      sets: 4,
      reps: 8,
      loadKg: 80,
      rpe: 8,
      restSeconds: 90
    }
  ]);

  // Copy Week state
  const [isCopyWeekOpen, setIsCopyWeekOpen] = useState(false);
  const [copyTargetDate, setCopyTargetDate] = useState<string>(() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0] as string;
  });

  // Exercise library picker & video modal
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [videoModalExercise, setVideoModalExercise] = useState<{
    name: string;
    description?: string;
    videoUrl?: string;
  } | null>(null);

  // Populate from workoutToEdit
  useEffect(() => {
    if (workoutToEdit) {
      setSport(workoutToEdit.sport);
      setTitle(workoutToEdit.title);
      setDate(workoutToEdit.date);
      setNotes(workoutToEdit.notes || "");
      if (workoutToEdit.sport === "strength" || (workoutToEdit.strengthExercises && workoutToEdit.strengthExercises.length > 0)) {
        setIsStrength(true);
        if (workoutToEdit.strengthExercises) {
          setStrengthExercises(workoutToEdit.strengthExercises);
        }
      } else {
        setIsStrength(false);
        if (workoutToEdit.blocks && workoutToEdit.blocks.length > 0) {
          setBlocks(workoutToEdit.blocks);
        }
      }
    } else {
      setDate(todayStr);
      setTitle("");
      setIsStrength(false);
    }
  }, [workoutToEdit, todayStr, isOpen]);

  // Calculate total duration
  const totalDurationMinutes = React.useMemo(() => {
    if (isStrength) {
      return strengthExercises.reduce((sum, ex) => sum + (ex.sets * 3), 15);
    }
    return blocks.reduce((sum, b) => {
      if (b.type === "interval" && b.repeats) {
        return sum + b.repeats * (b.durationMinutes + (b.restDurationMinutes || 0));
      }
      return sum + b.durationMinutes;
    }, 0);
  }, [blocks, isStrength, strengthExercises]);

  // Calculate estimated load
  const estimatedLoad = React.useMemo(() => {
    if (isStrength) return Math.round(totalDurationMinutes * 6.5);
    let weightedScore = 0;
    blocks.forEach((b) => {
      const duration = b.type === "interval" && b.repeats
        ? b.repeats * b.durationMinutes
        : b.durationMinutes;
      const intensity = b.targetRpe ? b.targetRpe : b.targetZone ? b.targetZone * 1.8 : 6;
      weightedScore += (duration / 60) * Math.pow(intensity / 6.5, 2) * 60;
    });
    return Math.max(10, Math.round(weightedScore));
  }, [blocks, isStrength, totalDurationMinutes]);

  // Add block
  const handleAddBlock = () => {
    const newBlock: WorkoutBlock = {
      id: `b-${Date.now()}`,
      name: isHu ? "Új blokk" : "New Block",
      type: "main",
      durationMinutes: 15,
      targetType: "rpe",
      targetRpe: 6
    };
    setBlocks([...blocks, newBlock]);
  };

  // Remove block
  const handleRemoveBlock = (id: string) => {
    if (blocks.length > 1) {
      setBlocks(blocks.filter((b) => b.id !== id));
    }
  };

  // Add strength exercise
  const handleAddExercise = () => {
    const newEx: StrengthExercise = {
      id: `ex-${Date.now()}`,
      name: isHu ? "Új gyakorlat" : "New Exercise",
      sets: 3,
      reps: 10,
      loadKg: 20,
      rpe: 7,
      restSeconds: 60
    };
    setStrengthExercises([...strengthExercises, newEx]);
  };

  // Remove strength exercise
  const handleRemoveExercise = (id: string) => {
    if (strengthExercises.length > 1) {
      setStrengthExercises(strengthExercises.filter((e) => e.id !== id));
    }
  };

  const handleAddExerciseFromLibrary = (libEx: ExerciseDocument) => {
    const newEx: StrengthExercise = {
      id: `ex-snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      libraryExerciseId: libEx.id,
      name: libEx.name,
      sets: 3,
      reps: 10,
      loadKg: 0,
      rpe: 7,
      restSeconds: 60,
      description: libEx.description,
      videoUrl: libEx.videoUrl,
      notes: libEx.defaultSetsRepsLoad
    };
    setStrengthExercises((prev) => [...prev, newEx]);
    showToast({
      title: "Gyakorlat hozzáadva",
      description: `${libEx.name} másolva az edzésbe (könyvtár változatlan)`,
      type: "success"
    });
  };

  const handleSaveExerciseToLibrary = async (ex: StrengthExercise) => {
    try {
      const saved = await saveExercise(athleteId, {
        name: ex.name,
        description: ex.description,
        videoUrl: ex.videoUrl,
        defaultSetsRepsLoad: `${ex.sets}x${ex.reps}${ex.loadKg ? ` @ ${ex.loadKg}kg` : ""}`,
        tags: ["Kondi / Erő"],
        isFavorite: false
      });
      setStrengthExercises((prev) =>
        prev.map((item) => (item.id === ex.id ? { ...item, libraryExerciseId: saved.id } : item))
      );
      showToast({
        title: "Mentve a könyvtárba",
        description: `${saved.name} sikeresen elmentve a könyvtárba.`,
        type: "success"
      });
    } catch {
      showToast({
        title: "Hiba",
        description: "Nem sikerült elmenteni a könyvtárba.",
        type: "error"
      });
    }
  };

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
        description: `${ex.name} adatai frissültek a könyvtárban.`,
        type: "success"
      });
    } catch {
      showToast({
        title: "Hiba",
        description: "Nem sikerült frissíteni a könyvtárat.",
        type: "error"
      });
    }
  };

  // Load template
  const handleLoadTemplate = (tpl: WorkoutTemplate) => {
    setTitle(tpl.title);
    setSport(tpl.sport);
    if (tpl.sport === "strength" && tpl.strengthExercises) {
      setIsStrength(true);
      setStrengthExercises(tpl.strengthExercises);
    } else {
      setIsStrength(false);
      setBlocks(tpl.blocks);
    }
  };

  // Save workout
  const handleSave = () => {
    const workout: PlannedWorkout = {
      id: workoutToEdit?.id || `wo-${Date.now()}`,
      athleteId,
      author: {
        id: authorRole === "coach" ? "coach-user" : athleteId,
        name: authorName,
        role: authorRole
      },
      title: title.trim() || (isHu ? `${sport.toUpperCase()} Edzés` : `${sport.toUpperCase()} Workout`),
      sport,
      date,
      plannedDurationMinutes: totalDurationMinutes,
      plannedLoad: estimatedLoad,
      status: workoutToEdit?.status || "scheduled",
      blocks: isStrength ? [] : blocks,
      strengthExercises: isStrength ? strengthExercises : undefined,
      notes: notes.trim() || undefined
    };

    onSaveWorkout(workout, saveAsTemplate);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        workoutToEdit
          ? isHu ? "Edzés szerkesztése" : "Edit Workout"
          : isHu ? "Új edzés tervezése (Workout Builder)" : "Workout Builder"
      }
    >
      <div className="space-y-5 text-sm p-1">
        {/* Author Provenance Badge */}
        {authorRole === "coach" && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs text-indigo-300">
            <span>🛡️ {isHu ? "Edzői tervezés módban készíted:" : "Coach planning mode:"} <strong>{authorName}</strong></span>
            <Badge variant="neutral">Coach Mode</Badge>
          </div>
        )}

        {/* Template Quick Loader Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-medium">
              {isHu ? "Sablonkönyvtár (Gyors betöltés)" : "Template Library"}
            </span>
            {onCopyWeek && (
              <button
                type="button"
                onClick={() => setIsCopyWeekOpen(!isCopyWeekOpen)}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isHu ? "Hét másolása" : "Copy Week"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {DEFAULT_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleLoadTemplate(tpl)}
                className="px-2.5 py-1.5 rounded-xl bg-[#0B0C0F] border border-white/10 hover:border-brand-500 text-xs text-left shrink-0 transition-all text-white flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-brand-400" />
                <span className="truncate max-w-[150px]">{tpl.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Copy Week Tool Drawer */}
        {isCopyWeekOpen && onCopyWeek && (
          <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-brand-500/30 space-y-2">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Copy className="w-4 h-4 text-brand-400" />
              <span>{isHu ? "Heti edzések duplikálása másik hétre" : "Duplicate Week to Another Week"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-secondary">{isHu ? "Cél hét kezdőnapja:" : "Target week start:"}</span>
              <input
                type="date"
                value={copyTargetDate}
                onChange={(e) => setCopyTargetDate(e.target.value)}
                className="bg-[#14161B] border border-white/10 rounded-xl px-2.5 py-1 text-white text-xs"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onCopyWeek(date, copyTargetDate);
                  setIsCopyWeekOpen(false);
                }}
              >
                {isHu ? "Másolás" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        {/* Basic Fields: Sport, Title, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              {isHu ? "Sportág" : "Sport"}
            </label>
            <select
              value={sport}
              onChange={(e) => {
                const s = e.target.value as SportType;
                setSport(s);
                if (s === "strength") setIsStrength(true);
              }}
              className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-brand-500 focus:outline-none"
            >
              <option value="running">🏃 {isHu ? "Futás (Running)" : "Running"}</option>
              <option value="cycling">🚴 {isHu ? "Kerékpár (Cycling)" : "Cycling"}</option>
              <option value="swimming">🏊 {isHu ? "Úszás (Swimming)" : "Swimming"}</option>
              <option value="strength">🏋️ {isHu ? "Erőnlét (Strength)" : "Strength"}</option>
              <option value="triathlon">🏅 {isHu ? "Triatlon (Triathlon)" : "Triathlon"}</option>
              <option value="other">⚡ {isHu ? "Egyéb (Other)" : "Other"}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
              {isHu ? "Dátum" : "Date"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Workout Title */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            {isHu ? "Edzés címe" : "Workout Title"}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isHu
                ? "pl. 5 x 1000m VO2max Intervallum"
                : "e.g. 5 x 1000m VO2max Intervals"
            }
            className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Type Toggle: Blocks vs Strength */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            onClick={() => setIsStrength(false)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              !isStrength
                ? "bg-brand-500 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isHu ? "Strukturált blokkok (Állóképesség)" : "Structured Blocks"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsStrength(true);
              setSport("strength");
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isStrength
                ? "bg-purple-600 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>{isHu ? "Erősítő edzés (Gyakorlatok)" : "Strength Session"}</span>
          </button>
        </div>

        {/* STRUCTURED BLOCKS BUILDER */}
        {!isStrength ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {isHu ? "Edzésblokkok" : "Workout Blocks"}
              </span>
              <button
                type="button"
                onClick={handleAddBlock}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isHu ? "Blokk hozzáadása" : "Add block"}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={block.name}
                      onChange={(e) => {
                        const updated = [...blocks];
                        if (updated[idx]) {
                          updated[idx]!.name = e.target.value;
                          setBlocks(updated);
                        }
                      }}
                      className="bg-transparent text-white font-medium text-xs flex-1 focus:outline-none"
                    />

                    <select
                      value={block.type}
                      onChange={(e) => {
                        const updated = [...blocks];
                        if (updated[idx]) {
                          updated[idx]!.type = e.target.value as WorkoutBlock["type"];
                          setBlocks(updated);
                        }
                      }}
                      className="bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white"
                    >
                      <option value="warmup">{isHu ? "Bemelegítés" : "Warmup"}</option>
                      <option value="main">{isHu ? "Fő blokk" : "Main"}</option>
                      <option value="interval">{isHu ? "Intervallum" : "Interval"}</option>
                      <option value="cooldown">{isHu ? "Levezetés" : "Cooldown"}</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(block.id)}
                      className="text-text-secondary hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Duration and Target fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-text-secondary block">
                        {isHu ? "Időtartam (perc)" : "Duration (min)"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="240"
                        value={block.durationMinutes}
                        onChange={(e) => {
                          const updated = [...blocks];
                          if (updated[idx]) {
                            updated[idx]!.durationMinutes = parseInt(e.target.value, 10) || 1;
                            setBlocks(updated);
                          }
                        }}
                        className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary block">
                        {isHu ? "Cél típus" : "Target Type"}
                      </span>
                      <select
                        value={block.targetType || "rpe"}
                        onChange={(e) => {
                          const updated = [...blocks];
                          if (updated[idx]) {
                            updated[idx]!.targetType = e.target.value as WorkoutBlock["targetType"];
                            setBlocks(updated);
                          }
                        }}
                        className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white text-[11px]"
                      >
                        <option value="rpe">RPE (1-10)</option>
                        <option value="hr_zone">HR Zóna (Z1-Z5)</option>
                        <option value="power">Watt (Power)</option>
                        <option value="pace">Tempó (Pace)</option>
                      </select>
                    </div>

                    {block.type === "interval" && (
                      <>
                        <div>
                          <span className="text-[10px] text-text-secondary block">
                            {isHu ? "Ismétlés (db)" : "Repeats"}
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={block.repeats || 4}
                            onChange={(e) => {
                              const updated = [...blocks];
                              if (updated[idx]) {
                                updated[idx]!.repeats = parseInt(e.target.value, 10) || 1;
                                setBlocks(updated);
                              }
                            }}
                            className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white font-mono"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-text-secondary block">
                            {isHu ? "Pihenő (perc)" : "Rest (min)"}
                          </span>
                          <input
                            type="number"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={block.restDurationMinutes || 2}
                            onChange={(e) => {
                              const updated = [...blocks];
                              if (updated[idx]) {
                                updated[idx]!.restDurationMinutes = parseFloat(e.target.value) || 1;
                                setBlocks(updated);
                              }
                            }}
                            className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* STRENGTH EXERCISES BUILDER */
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-purple-400" />
                <span>{isHu ? `Gyakorlatok listája (${strengthExercises.length})` : `Exercise List (${strengthExercises.length})`}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExercisePickerOpen(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{isHu ? "Könyvtárból választás" : "From library"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddExercise}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isHu ? "Új sor" : "New row"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {strengthExercises.map((ex, idx) => (
                <div
                  key={ex.id}
                  className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={ex.name}
                      onChange={(e) => {
                        const updated = [...strengthExercises];
                        if (updated[idx]) {
                          updated[idx]!.name = e.target.value;
                          setStrengthExercises(updated);
                        }
                      }}
                      className="bg-transparent text-white font-medium text-xs flex-1 focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      {(ex.videoUrl || ex.description) && (
                        <button
                          type="button"
                          onClick={() => setVideoModalExercise(ex)}
                          className="p-1 text-brand-400 hover:text-brand-300"
                          title={isHu ? "Videó és leírás megtekintése" : "View video & description"}
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {ex.libraryExerciseId ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateLibraryExercise(ex)}
                          className="text-[10px] text-purple-400 hover:underline px-1.5 py-0.5 rounded bg-purple-500/10"
                          title={isHu ? "Könyvtár bejegyzés frissítése" : "Update library exercise"}
                        >
                          {isHu ? "Frissítés könyvtárban" : "Update in library"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveExerciseToLibrary(ex)}
                          className="text-[10px] text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-emerald-500/10"
                          title={isHu ? "Mentés a könyvtárba" : "Save to library"}
                        >
                          {isHu ? "Mentés könyvtárba" : "Save to library"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(ex.id)}
                        className="text-text-secondary hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-text-secondary block font-sans">
                        {isHu ? "Sorozat" : "Sets"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={ex.sets}
                        onChange={(e) => {
                          const updated = [...strengthExercises];
                          if (updated[idx]) {
                            updated[idx]!.sets = parseInt(e.target.value, 10) || 1;
                            setStrengthExercises(updated);
                          }
                        }}
                        className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary block font-sans">
                        {isHu ? "Ismétlés" : "Reps"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={ex.reps}
                        onChange={(e) => {
                          const updated = [...strengthExercises];
                          if (updated[idx]) {
                            updated[idx]!.reps = parseInt(e.target.value, 10) || 1;
                            setStrengthExercises(updated);
                          }
                        }}
                        className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary block font-sans">
                        {isHu ? "Súly (kg)" : "Load (kg)"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="400"
                        step="2.5"
                        value={ex.loadKg || 0}
                        onChange={(e) => {
                          const updated = [...strengthExercises];
                          if (updated[idx]) {
                            updated[idx]!.loadKg = parseFloat(e.target.value) || 0;
                            setStrengthExercises(updated);
                          }
                        }}
                        className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-text-secondary block font-sans">
                        {isHu ? "Pihenő (s)" : "Rest (s)"}
                      </span>
                      <input
                        type="number"
                        min="15"
                        max="300"
                        step="15"
                        value={ex.restSeconds || 60}
                        onChange={(e) => {
                          const updated = [...strengthExercises];
                          if (updated[idx]) {
                            updated[idx]!.restSeconds = parseInt(e.target.value, 10) || 60;
                            setStrengthExercises(updated);
                          }
                        }}
                        className="w-full bg-[#14161B] border border-white/10 rounded-lg px-2 py-1 text-white text-center"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculated Volume & Load Pill */}
        <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock className="w-4 h-4 text-brand-400" />
            <span>{isHu ? "Becsült időtartam:" : "Estimated duration:"}</span>
            <strong className="text-white font-mono">{totalDurationMinutes} {isHu ? "perc" : "min"}</strong>
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isHu ? "Becsült terhelés:" : "Estimated load:"}</span>
            <strong className="text-amber-400 font-mono">{estimatedLoad} TSS</strong>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
            {isHu ? "Edzői utasítás / Megjegyzés" : "Instructions / Notes"}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isHu
                ? "pl. Frissítés 30 percenként, könnyű pörgetés lejtőkön..."
                : "e.g. Fuel every 30 mins, light cadence on downhills..."
            }
            className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl p-2.5 text-white text-xs placeholder:text-text-secondary/50 focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>

        {/* Save as Template Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="saveTemplate"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
            className="rounded bg-[#0B0C0F] border-white/10 text-brand-500 focus:ring-brand-500"
          />
          <label htmlFor="saveTemplate" className="text-xs text-text-secondary cursor-pointer">
            {isHu ? "Mentés saját sablonként a könyvtárba" : "Save as custom reusable template"}
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {isHu ? "Mégse" : "Cancel"}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isHu ? "Edzés mentése" : "Save Workout"}</span>
          </Button>
        </div>
      </div>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        isOpen={isExercisePickerOpen}
        onClose={() => setIsExercisePickerOpen(false)}
        athleteId={athleteId}
        onSelectExercise={handleAddExerciseFromLibrary}
      />

      {/* Video Player Modal */}
      {videoModalExercise && (
        <VideoPlayerModal
          isOpen={true}
          onClose={() => setVideoModalExercise(null)}
          title={videoModalExercise.name}
          videoUrl={videoModalExercise.videoUrl}
          description={videoModalExercise.description}
        />
      )}
    </BottomSheet>
  );
};
