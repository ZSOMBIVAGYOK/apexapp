import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { useAppMode } from "@shared/hooks/useAppMode";
import {
  PlannedWorkout,
  Competition,
  SeasonPhase,
  AthleteTrainingZones,
  SportType
} from "@shared/types/training";
import {
  calculatePMCSeries,
  calculateLoadSummary
} from "@shared/lib/load/loadCalculator";
import {
  generateBackwardPeriodization
} from "@shared/lib/periodization/periodizationEngine";
import {
  AthleteThresholds,
  calculateAllZones
} from "@shared/lib/zones/zoneCalculator";
import { GeneratedSeasonPlan } from "@shared/lib/planner/soloPlanGenerator";
import {
  Button,
  Badge,
  SegmentedControl,
  showToast
} from "@shared/ui";
import {
  Plus,
  Sliders,
  ClipboardList,
  UserCheck,
  Calendar as CalendarIcon,
  Dumbbell,
  Wrench,
  Trophy
} from "lucide-react";

import { SeasonPlannerTimeline } from "../components/SeasonPlannerTimeline";
import { PerformanceManagementChart } from "../components/PerformanceManagementChart";
import { TrainingCalendar } from "../components/TrainingCalendar";
import { WorkoutBuilderModal } from "../components/WorkoutBuilderModal";
import { WorkoutFeedbackModal } from "../components/WorkoutFeedbackModal";
import { SoloPlanGeneratorWizard } from "../components/SoloPlanGeneratorWizard";
import { ThresholdsAndZonesModal } from "../components/ThresholdsAndZonesModal";
import { ManualSessionModal } from "../components/ManualSessionModal";
import { SessionDetailModal } from "../components/SessionDetailModal";
import { SessionShareModal } from "../components/SessionShareModal";
import { ExerciseLibraryView } from "../components/ExerciseLibraryView";
import { RecordsCoursesView } from "@features/records/components/RecordsCoursesView";
import { EquipmentView } from "@features/equipment/components/EquipmentView";
import { getEquipmentList, hasDueMaintenance } from "@shared/lib/equipment";
import { getLocalSessions } from "@shared/lib/offline/offlineStorage";
import { CompletedSessionDocument } from "@shared/types";

export const TrainingPage: React.FC = () => {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const { hasCoach } = useAppMode();
  const isHu = i18n.language.startsWith("hu");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0] as string, []);
  const athleteId = user?.uid || "demo-athlete-001";

  // State: selected date on calendar
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Segmented control navigation: Naptár · Gyakorlatok · Eszközök · Rekordok
  const [activeTab, setActiveTab] = useState<"calendar" | "exercises" | "equipment" | "records">("calendar");
  const [hasMaintenanceDue, setHasMaintenanceDue] = useState(false);

  useEffect(() => {
    getEquipmentList(athleteId).then((items) => {
      setHasMaintenanceDue(hasDueMaintenance(items).hasDue);
    });
  }, [athleteId, activeTab]);


  // Default A-race 12 weeks ahead
  const defaultARaceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 12 * 7);
    return d.toISOString().split("T")[0] as string;
  }, []);

  // Competitions
  const [competitions, setCompetitions] = useState<Competition[]>(() => {
    const saved = localStorage.getItem(`apex_competitions_${athleteId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }

    // If user entered a target competition in onboarding or profile, use it as the A-race!
    if (user?.targetCompetition) {
      return [
        {
          id: `comp-user-${athleteId}`,
          title: user.targetCompetition,
          date: user.targetCompetitionDate || defaultARaceDate,
          priority: "A",
          sport: user.mainSport || user.sport || "running",
          distance: ""
        }
      ];
    }

    // In production or for real users without competitions: start COMPLETELY EMPTY
    if (import.meta.env.PROD || athleteId !== "demo-athlete-001") {
      return [];
    }

    const bRaceDate = new Date();
    bRaceDate.setDate(bRaceDate.getDate() + 6 * 7);

    return [
      {
        id: "comp-a",
        title: isHu ? "Budapest Maraton" : "Budapest Marathon",
        date: defaultARaceDate,
        priority: "A",
        sport: "running",
        distance: "42.2 km",
        targetTime: "3:29:59"
      },
      {
        id: "comp-b",
        title: isHu ? "Félmaraton Felmérő" : "Half Marathon Test",
        date: bRaceDate.toISOString().split("T")[0] as string,
        priority: "B",
        sport: "running",
        distance: "21.1 km"
      }
    ];
  });

  // Season Phases
  const [phases, setPhases] = useState<SeasonPhase[]>(() => {
    const primaryARace = competitions.find((c) => c.priority === "A");
    if (!primaryARace) {
      return [];
    }
    return generateBackwardPeriodization({
      aRaceDate: primaryARace.date,
      targetPeakWeeklyHours: 10
    });
  });

  // Thresholds & Zones: only demo athlete gets hardcoded numbers, real users start empty
  const [thresholds, setThresholds] = useState<AthleteThresholds>(() => {
    if (import.meta.env.PROD || athleteId !== "demo-athlete-001") {
      return {
        maxHr: 190,
        lthr: 165,
        ftp: 250,
        thresholdPaceSeconds: 300,
        criticalSwimSpeedSeconds: 100
      };
    }
    return {
      maxHr: 194,
      lthr: 172,
      ftp: 285,
      thresholdPaceSeconds: 255, // 4:15/km
      criticalSwimSpeedSeconds: 85 // 1:25/100m
    };
  });

  const [zones, setZones] = useState<AthleteTrainingZones>(() =>
    calculateAllZones(thresholds)
  );

  // Workouts
  const [workouts, setWorkouts] = useState<PlannedWorkout[]>(() => {
    const saved = localStorage.getItem(`apex_planned_workouts_${athleteId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }

    // Real production users or non-demo accounts start with clean empty workouts list
    if (import.meta.env.PROD || athleteId !== "demo-athlete-001") {
      return [];
    }

    // Seed realistic 28 days of past workouts + 14 days of future planned workouts (demo only)
    const initial: PlannedWorkout[] = [];

    // Past 28 days
    for (let i = 28; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0] as string;
      const dayOfWeek = d.getDay();

      if (dayOfWeek === 1 || dayOfWeek === 5) {
        // Rest day
        continue;
      }

      if (dayOfWeek === 0) {
        // Long run on Sunday
        initial.push({
          id: `seed-past-${dateStr}`,
          athleteId,
          author: { id: "coach-1", name: "Péter Edző", role: "coach" },
          title: isHu ? "Hosszú Z2 Aerob Állóképesség" : "Long Z2 Aerobic Run",
          sport: "running",
          date: dateStr,
          plannedDurationMinutes: 100,
          actualDurationMinutes: 102,
          actualRpe: 5,
          plannedLoad: 95,
          status: "completed",
          blocks: [
            { id: "b1", name: "Bemelegítés", type: "warmup", durationMinutes: 15 },
            { id: "b2", name: "Z2 Aerob bázis", type: "main", durationMinutes: 75, targetZone: 2 },
            { id: "b3", name: "Levezetés", type: "cooldown", durationMinutes: 10 }
          ]
        });
      } else if (dayOfWeek === 2) {
        // Intervals
        initial.push({
          id: `seed-past-${dateStr}`,
          athleteId,
          author: { id: "coach-1", name: "Péter Edző", role: "coach" },
          title: isHu ? "5x1000m Küszöb résztávok" : "5x1000m Threshold Intervals",
          sport: "running",
          date: dateStr,
          plannedDurationMinutes: 55,
          actualDurationMinutes: 55,
          actualRpe: 8,
          plannedLoad: 75,
          status: "completed",
          blocks: []
        });
      } else if (dayOfWeek === 3) {
        // Strength
        initial.push({
          id: `seed-past-${dateStr}`,
          athleteId,
          author: { id: athleteId, name: "Sportoló", role: "athlete" },
          title: isHu ? "Alsótest és Törzsstabilitás" : "Lower Body & Core Strength",
          sport: "strength",
          date: dateStr,
          plannedDurationMinutes: 60,
          actualDurationMinutes: 60,
          actualRpe: 7,
          plannedLoad: 60,
          status: "completed",
          blocks: []
        });
      } else if (dayOfWeek === 4) {
        // Recovery spin
        initial.push({
          id: `seed-past-${dateStr}`,
          athleteId,
          author: { id: athleteId, name: "Sportoló", role: "athlete" },
          title: isHu ? "Z1 Regeneráló Pörgetés" : "Z1 Recovery Spin",
          sport: "cycling",
          date: dateStr,
          plannedDurationMinutes: 45,
          actualDurationMinutes: 45,
          actualRpe: 3,
          plannedLoad: 35,
          status: "completed",
          blocks: []
        });
      } else if (dayOfWeek === 6) {
        // Tempo run
        initial.push({
          id: `seed-past-${dateStr}`,
          athleteId,
          author: { id: "coach-1", name: "Péter Edző", role: "coach" },
          title: isHu ? "Félmaratoni tempófutás Z3" : "Half Marathon Tempo Run Z3",
          sport: "running",
          date: dateStr,
          plannedDurationMinutes: 70,
          actualDurationMinutes: 68,
          actualRpe: 7,
          plannedLoad: 80,
          status: "completed",
          blocks: []
        });
      }
    }

    // Today's workout
    initial.push({
      id: `seed-today-${todayStr}`,
      athleteId,
      author: { id: "coach-1", name: "Péter Edző", role: "coach" },
      title: isHu ? "4 x 2000m Laktát-küszöb blokk (Z4)" : "4 x 2000m Lactate Threshold Blocks (Z4)",
      sport: "running",
      date: todayStr,
      plannedDurationMinutes: 75,
      plannedLoad: 90,
      status: "scheduled",
      blocks: [
        { id: "b1", name: "Bemelegítés és dinamikus nyújtás", type: "warmup", durationMinutes: 15, targetZone: 2 },
        { id: "b2", name: "4x2000m Z4 küszöbön (3p pihenő)", type: "interval", durationMinutes: 10, repeats: 4, restDurationMinutes: 3, targetZone: 4, targetRpe: 8 },
        { id: "b3", name: "Levezető lassú kocogás", type: "cooldown", durationMinutes: 10, targetZone: 1 }
      ],
      notes: isHu ? "Tartsd a 4:10-4:15 közötti tempót egyenletesen!" : "Keep 4:10-4:15 pace steady!"
    });

    // Next 14 days of scheduled workouts
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0] as string;
      const dayOfWeek = d.getDay();

      if (dayOfWeek === 1 || dayOfWeek === 5) continue;

      if (dayOfWeek === 0) {
        initial.push({
          id: `seed-future-${dateStr}`,
          athleteId,
          author: { id: "coach-1", name: "Péter Edző", role: "coach" },
          title: isHu ? "Progresszív Hosszú Futás (Z2-Z3)" : "Progressive Long Run (Z2-Z3)",
          sport: "running",
          date: dateStr,
          plannedDurationMinutes: 110,
          plannedLoad: 105,
          status: "scheduled",
          blocks: []
        });
      } else if (dayOfWeek === 2) {
        initial.push({
          id: `seed-future-${dateStr}`,
          athleteId,
          author: { id: "coach-1", name: "Péter Edző", role: "coach" },
          title: isHu ? "VO2max Repülők és dombfutás" : "VO2max Reps & Hill Sprints",
          sport: "running",
          date: dateStr,
          plannedDurationMinutes: 60,
          plannedLoad: 85,
          status: "scheduled",
          blocks: []
        });
      } else if (dayOfWeek === 3) {
        initial.push({
          id: `seed-future-${dateStr}`,
          athleteId,
          author: { id: athleteId, name: "Sportoló", role: "athlete" },
          title: isHu ? "Erőnléti stabilitás edzés" : "Strength & Stability Session",
          sport: "strength",
          date: dateStr,
          plannedDurationMinutes: 55,
          plannedLoad: 55,
          status: "scheduled",
          blocks: []
        });
      } else if (dayOfWeek === 6) {
        initial.push({
          id: `seed-future-${dateStr}`,
          athleteId,
          author: { id: "coach-1", name: "Péter Edző", role: "coach" },
          title: isHu ? "Z3 Tempó és ritmusfutás" : "Z3 Steady Pace Run",
          sport: "running",
          date: dateStr,
          plannedDurationMinutes: 70,
          plannedLoad: 75,
          status: "scheduled",
          blocks: []
        });
      }
    }

    return initial;
  });

  // Save workouts & competitions to localStorage on change
  useEffect(() => {
    localStorage.setItem(`apex_planned_workouts_${athleteId}`, JSON.stringify(workouts));
  }, [workouts, athleteId]);

  useEffect(() => {
    localStorage.setItem(`apex_competitions_${athleteId}`, JSON.stringify(competitions));
  }, [competitions, athleteId]);

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<PlannedWorkout | null>(null);
  const [builderDate, setBuilderDate] = useState<string>(todayStr);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [workoutToFeedback, setWorkoutToFeedback] = useState<PlannedWorkout | null>(null);

  const [isSoloGeneratorOpen, setIsSoloGeneratorOpen] = useState(false);
  const [isZonesModalOpen, setIsZonesModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [sessionToEditInManual, setSessionToEditInManual] = useState<CompletedSessionDocument | null>(null);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<CompletedSessionDocument | null>(null);

  const handleOpenSessionDetail = (workout: PlannedWorkout) => {
    const allSessions = getLocalSessions(athleteId);
    const existing = allSessions.find(
      (s) => s.sessionId === workout.id || (s.date === workout.date && s.sport === workout.sport)
    );

    if (existing) {
      setSelectedSessionForDetail(existing);
    } else {
      const fallbackSession: CompletedSessionDocument = {
        sessionId: workout.id,
        athleteId,
        date: workout.date,
        sport: workout.sport,
        title: workout.title,
        startTime: "09:00",
        durationMinutes: workout.actualDurationMinutes || workout.plannedDurationMinutes,
        rpe: workout.actualRpe || 6,
        targetIntensityRpe: workout.actualRpe || 6,
        trainingLoad: workout.plannedLoad,
        completed: true,
        source: "manual",
        confidence: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: athleteId
      };
      setSelectedSessionForDetail(fallbackSession);
    }
  };

  const [sessionForShare, setSessionForShare] = useState<CompletedSessionDocument | null>(null);

  const handleOpenShareSession = (workout: PlannedWorkout) => {
    const allSessions = getLocalSessions(athleteId);
    const existing = allSessions.find(
      (s) => s.sessionId === workout.id || (s.date === workout.date && s.sport === workout.sport)
    );

    if (existing) {
      setSessionForShare(existing);
    } else {
      const fallbackSession: CompletedSessionDocument = {
        sessionId: workout.id,
        athleteId,
        date: workout.date,
        sport: workout.sport,
        title: workout.title,
        startTime: "09:00",
        durationMinutes: workout.actualDurationMinutes || workout.plannedDurationMinutes,
        rpe: workout.actualRpe || 6,
        targetIntensityRpe: workout.actualRpe || 6,
        trainingLoad: workout.plannedLoad,
        completed: true,
        source: "manual",
        confidence: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: athleteId
      };
      setSessionForShare(fallbackSession);
    }
  };

  // Compute historical & planned daily loads mapping
  const { historicalDailyLoads, plannedLoads } = useMemo(() => {
    const historical: Record<string, number> = {};
    const planned: Record<string, number> = {};

    workouts.forEach((w) => {
      const isPastOrToday = w.date <= todayStr;
      const load =
        w.status === "completed" && w.actualRpe
          ? Math.round((w.actualDurationMinutes || w.plannedDurationMinutes) * w.actualRpe)
          : w.plannedLoad;

      if (isPastOrToday) {
        historical[w.date] = (historical[w.date] || 0) + load;
      } else {
        planned[w.date] = (planned[w.date] || 0) + load;
      }
    });

    return { historicalDailyLoads: historical, plannedLoads: planned };
  }, [workouts, todayStr]);

  // Compute Bannister Performance Management series
  const pmcSeries = useMemo(() => {
    return calculatePMCSeries({
      historicalDailyLoads,
      plannedFutureLoads: plannedLoads,
      todayStr,
      daysPast: 42,
      daysFuture: 28,
      competitions,
      phases
    });
  }, [historicalDailyLoads, plannedLoads, todayStr, competitions, phases]);

  // Compute Load Analytics Summary
  const loadSummary = useMemo(() => {
    return calculateLoadSummary(historicalDailyLoads, plannedLoads, todayStr);
  }, [historicalDailyLoads, plannedLoads, todayStr]);

  // Handlers
  const handleOpenBuilder = (dateStr: string, workout?: PlannedWorkout) => {
    setBuilderDate(dateStr);
    setWorkoutToEdit(workout || null);
    setIsBuilderOpen(true);
  };

  const handleOpenFeedback = (workout: PlannedWorkout) => {
    setWorkoutToFeedback(workout);
    setIsFeedbackOpen(true);
  };

  const handleSaveWorkout = (workout: PlannedWorkout, saveAsTemplate?: boolean) => {
    const existingIndex = workouts.findIndex((w) => w.id === workout.id);
    if (existingIndex >= 0) {
      const updated = [...workouts];
      updated[existingIndex] = workout;
      setWorkouts(updated);
      showToast({
        title: isHu ? "Edzés frissítve" : "Workout updated",
        description: workout.title,
        type: "success"
      });
    } else {
      setWorkouts([...workouts, workout]);
      showToast({
        title: isHu ? "Új edzés elmentve" : "New workout scheduled",
        description: `${workout.title} (${workout.date})`,
        type: "success"
      });
    }

    if (saveAsTemplate) {
      showToast({
        title: isHu ? "Sablon elmentve" : "Template saved",
        description: isHu ? "Hozzáadva a saját sablonkönyvtárhoz" : "Added to your template library",
        type: "success"
      });
    }
  };

  const handleRescheduleWorkout = (workoutId: string, newDateStr: string) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, date: newDateStr } : w))
    );
    showToast({
      title: isHu ? "Edzés áthelyezve" : "Workout rescheduled",
      description: `${isHu ? "Új időpont:" : "New date:"} ${newDateStr}`,
      type: "success"
    });
  };

  const handleSaveFeedback = (
    workoutId: string,
    feedback: {
      status: "completed" | "modified" | "skipped";
      actualDurationMinutes?: number;
      actualRpe?: number;
      athleteComment?: string;
      skipReason?: string;
      modificationReason?: string;
    }
  ) => {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id === workoutId) {
          return {
            ...w,
            status: feedback.status,
            actualDurationMinutes: feedback.actualDurationMinutes,
            actualRpe: feedback.actualRpe,
            athleteFeedbackComment: feedback.athleteComment,
            skipReason: feedback.skipReason,
            modificationReason: feedback.modificationReason
          };
        }
        return w;
      })
    );
    showToast({
      title: isHu ? "Visszajelzés rögzítve" : "Feedback saved",
      description: isHu ? "A terhelési görbék automatikusan frissültek." : "Load curves updated.",
      type: "success"
    });
  };

  const handleCopyWeek = (sourceDateStr: string, targetDateStr: string) => {
    // Copy workouts from source week
    const srcDate = new Date(sourceDateStr);
    const day = srcDate.getDay();
    const diff = srcDate.getDate() - day + (day === 0 ? -6 : 1);
    const srcMonday = new Date(srcDate.setDate(diff));

    const targetDate = new Date(targetDateStr);
    const targetDay = targetDate.getDay();
    const targetDiff = targetDate.getDate() - targetDay + (targetDay === 0 ? -6 : 1);
    const targetMonday = new Date(targetDate.setDate(targetDiff));

    const dayShiftMs = targetMonday.getTime() - srcMonday.getTime();
    const dayShift = Math.round(dayShiftMs / (1000 * 60 * 60 * 24));

    const srcSunday = new Date(srcMonday);
    srcSunday.setDate(srcMonday.getDate() + 6);
    const srcStartStr = srcMonday.toISOString().split("T")[0] as string;
    const srcEndStr = srcSunday.toISOString().split("T")[0] as string;

    const sourceWeekWorkouts = workouts.filter(
      (w) => w.date >= srcStartStr && w.date <= srcEndStr
    );

    const duplicatedWorkouts = sourceWeekWorkouts.map((w) => {
      const origDate = new Date(w.date);
      origDate.setDate(origDate.getDate() + dayShift);
      const newDateStr = origDate.toISOString().split("T")[0] as string;

      return {
        ...w,
        id: `wo-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: newDateStr,
        status: "scheduled" as const,
        actualDurationMinutes: undefined,
        actualRpe: undefined,
        athleteFeedbackComment: undefined
      };
    });

    setWorkouts([...workouts, ...duplicatedWorkouts]);
    showToast({
      title: isHu ? "Hét sikeresen másolva" : "Week duplicated",
      description: `${duplicatedWorkouts.length} ${isHu ? "edzés átmásolva" : "workouts copied"}`,
      type: "success"
    });
  };

  const handlePlanGenerated = (plan: GeneratedSeasonPlan) => {
    setPhases(plan.phases);
    setWorkouts((prev) => {
      // Retain past completed workouts, replace future workouts
      const past = prev.filter((w) => w.date < todayStr);
      return [...past, ...plan.workouts];
    });
    showToast({
      title: isHu ? "Solo terv sikeresen alkalmazva!" : "Solo plan applied!",
      description: `${plan.phases.length} ${isHu ? "fázis és" : "phases and"} ${plan.totalWorkoutsCount} ${isHu ? "edzés hozzáadva." : "workouts scheduled."}`,
      type: "success"
    });
  };

  const handleSaveThresholds = (newThresholds: AthleteThresholds, newZones: AthleteTrainingZones) => {
    setThresholds(newThresholds);
    setZones(newZones);
    showToast({
      title: isHu ? "Zónák és küszöbértékek frissítve" : "Zones updated",
      description: `${isHu ? "LTHR:" : "LTHR:"} ${newThresholds.lthr} bpm | FTP: ${newThresholds.ftp} W`,
      type: "success"
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Title & Top Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isHu ? "Edzés és Szezonmenedzsment" : "Training & Season"}
            </h1>
            {hasCoach && (
              <Badge variant="neutral" className="flex items-center gap-1 text-[11px]">
                <UserCheck className="w-3 h-3 text-indigo-400" />
                <span>Coach Mode</span>
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {isHu
              ? "Periodizált naptár, teljesítmény-menedzsment (PMC) és strukturált edzéstervező."
              : "Periodized calendar, performance management (PMC), and structured workout builder."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsZonesModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-brand-400" />
            <span>{isHu ? "Küszöbök & Zónák" : "Zones"}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <span>{isHu ? "Gyors naplózás" : "Quick Log"}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenBuilder(selectedDate)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isHu ? "Új edzés" : "Add Workout"}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Segmented Control: Naptár · Gyakorlatok (Eszközök & Rekordok reserved) */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
        <SegmentedControl
          value={activeTab}
          onChange={(val) => setActiveTab(val as "calendar" | "exercises" | "equipment" | "records")}
          options={[
            {
              value: "calendar",
              label: isHu ? "Naptár & Tervezés" : "Calendar & Plan",
              icon: <CalendarIcon className="w-4 h-4 text-brand-400" />
            },
            {
              value: "exercises",
              label: isHu ? "Gyakorlatok könyvtára" : "Exercise Library",
              icon: <Dumbbell className="w-4 h-4 text-purple-400" />
            },
            {
              value: "equipment",
              label: isHu ? "Eszközök" : "Equipment",
              icon: <Wrench className="w-4 h-4 text-amber-400" />,
              badge: hasMaintenanceDue ? (isHu ? "Karbantartás!" : "Due!") : undefined
            },
            {
              value: "records",
              label: isHu ? "Rekordok & Pályák" : "Records & Courses",
              icon: <Trophy className="w-4 h-4 text-amber-500" />
            }
          ]}
        />
      </div>

      {/* TAB CONTENT */}
      {activeTab === "calendar" ? (
        <>
          {/* 1. SEASON PLANNER TIMELINE */}
          <SeasonPlannerTimeline
            phases={phases}
            competitions={competitions}
            onOpenSoloGenerator={() => setIsSoloGeneratorOpen(true)}
            onAddCompetition={() => {
              const nextDate = new Date();
              nextDate.setDate(nextDate.getDate() + 18 * 7);
              const newComp: Competition = {
                id: `comp-${Date.now()}`,
                title: isHu ? "Új Célverseny (C)" : "New Target Race (C)",
                date: nextDate.toISOString().split("T")[0] as string,
                priority: "C",
                sport: "running"
              };
              setCompetitions((prev) => [...prev, newComp]);
              showToast({
                title: isHu ? "Új verseny hozzáadva" : "Race added",
                description: newComp.title,
                type: "success"
              });
            }}
          />

          {/* 2. PERFORMANCE MANAGEMENT CHART (PMC) */}
          <PerformanceManagementChart
            data={pmcSeries}
            summary={loadSummary}
            todayStr={todayStr}
          />

          {/* 3. INTERACTIVE TRAINING CALENDAR */}
          <TrainingCalendar
            workouts={workouts}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onOpenWorkoutBuilder={handleOpenBuilder}
            onOpenWorkoutFeedback={handleOpenFeedback}
            onRescheduleWorkout={handleRescheduleWorkout}
            onOpenSessionDetail={handleOpenSessionDetail}
            onOpenShareSession={handleOpenShareSession}
            onOpenManualLog={(dateStr) => {
              setSelectedDate(dateStr);
              setSessionToEditInManual(null);
              setIsManualModalOpen(true);
            }}
          />
        </>
      ) : activeTab === "exercises" ? (
        /* EXERCISE LIBRARY TAB */
        <ExerciseLibraryView athleteId={athleteId} />
      ) : activeTab === "equipment" ? (
        /* EQUIPMENT & MAINTENANCE TAB */
        <EquipmentView athleteId={athleteId} />
      ) : (
        /* RECORDS & COURSES TAB */
        <RecordsCoursesView athleteId={athleteId} />
      )}

      {/* MODALS */}

      {/* Workout Builder */}
      <WorkoutBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        workoutToEdit={workoutToEdit}
        defaultDate={builderDate}
        athleteId={athleteId}
        authorRole={hasCoach ? "coach" : "athlete"}
        authorName={hasCoach ? "Péter Edző" : "Sportoló"}
        onSaveWorkout={handleSaveWorkout}
        onCopyWeek={handleCopyWeek}
      />

      {/* Workout Feedback */}
      <WorkoutFeedbackModal
        workout={workoutToFeedback}
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSaveFeedback={handleSaveFeedback}
      />

      {/* Solo Plan Generator Wizard */}
      <SoloPlanGeneratorWizard
        isOpen={isSoloGeneratorOpen}
        onClose={() => setIsSoloGeneratorOpen(false)}
        athleteId={athleteId}
        onPlanGenerated={handlePlanGenerated}
      />

      {/* Thresholds and Zones Modal */}
      <ThresholdsAndZonesModal
        isOpen={isZonesModalOpen}
        onClose={() => setIsZonesModalOpen(false)}
        initialThresholds={thresholds}
        initialZones={zones}
        onSave={handleSaveThresholds}
      />

      {/* Session Detail Modal (Charts & SVG Route Outline & Attach File) */}
      <SessionDetailModal
        isOpen={Boolean(selectedSessionForDetail)}
        onClose={() => setSelectedSessionForDetail(null)}
        session={selectedSessionForDetail}
        athleteId={athleteId}
        onEditSession={(sess) => {
          setSelectedSessionForDetail(null);
          setSessionToEditInManual(sess);
          setIsManualModalOpen(true);
        }}
        onSessionUpdated={(updated) => {
          setSelectedSessionForDetail(updated);
          setWorkouts((prev) =>
            prev.map((w) =>
              w.id === updated.sessionId
                ? {
                    ...w,
                    title: updated.title,
                    sport: updated.sport as SportType,
                    actualDurationMinutes: updated.durationMinutes,
                    actualRpe: updated.rpe,
                    plannedLoad: updated.trainingLoad || w.plannedLoad
                  }
                : w
            )
          );
        }}
      />

      {/* Manual Quick Session Modal */}
      <ManualSessionModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setSessionToEditInManual(null);
        }}
        sessionToEdit={sessionToEditInManual}
        defaultDate={selectedDate}
        onSessionSaved={(session) => {
          // Add or update in workouts as completed
          const newWorkout: PlannedWorkout = {
            id: session.sessionId,
            athleteId,
            author: { id: athleteId, name: "Sportoló", role: "athlete" },
            title: session.title,
            sport: session.sport as SportType,
            date: session.date,
            plannedDurationMinutes: session.durationMinutes,
            actualDurationMinutes: session.durationMinutes,
            actualRpe: session.rpe,
            plannedLoad: session.trainingLoad || 50,
            status: "completed",
            blocks: [],
            strengthExercises: session.strengthExercises
          };
          handleSaveWorkout(newWorkout);
        }}
      />

      {/* Share Workout Modal */}
      <SessionShareModal
        isOpen={!!sessionForShare}
        onClose={() => setSessionForShare(null)}
        session={sessionForShare}
        athleteId={athleteId}
      />
    </div>
  );
};

export default TrainingPage;
