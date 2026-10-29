import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { useAppMode } from "@shared/hooks/useAppMode";
import {
  Card,
  StatTile,
  Button,
  Badge,
  SourceBadge,
  ConfidenceMeter,
  SyncStatusBadge,
  showToast
} from "@shared/ui";
import {
  Activity,
  Dumbbell,
  Droplets,
  Play,
  CheckCircle2,
  Clock,
  Plus,
  FileEdit,
  Flame,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Info,
  Wrench,
  Moon
} from "lucide-react";
import {
  getLocalDaily,
  getAllLocalDailies,
  getLocalSessions
} from "@shared/lib/offline/offlineStorage";
import {
  getOrComputeDailyScores,
  calculateWeeklyScoreSummary,
  DayScoreSummary,
  DailyScoresRecord
} from "@shared/lib/scores";
import { DailyAggregateDocument, CompletedSessionDocument } from "@shared/types";
import { PlannedWorkout } from "@shared/types/training";
import { ManualSessionModal } from "@features/training/components/ManualSessionModal";
import { HydrationTrackerCard } from "@features/nutrition/components/HydrationTrackerCard";
import { getEquipmentList, hasDueMaintenance } from "@shared/lib/equipment";
import { getRecoveryLogs } from "@shared/lib/recovery";
import { RecoveryActivityLog } from "@shared/types/recovery";
import { ThreeScoresHeroCard } from "../components/ThreeScoresHeroCard";
import { RecoveryDetailSheet } from "../components/sheets/RecoveryDetailSheet";
import { StrainDetailSheet } from "../components/sheets/StrainDetailSheet";
import { SleepDetailSheet } from "../components/sheets/SleepDetailSheet";
import { WeeklyScoreCard } from "../components/WeeklyScoreCard";

export const TodayPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isManualOnly } = useAppMode();
  const isHu = i18n.language.startsWith("hu");

  const athleteId = user?.uid || "demo-athlete-001";
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0] as string, []);
  const isSunday = useMemo(() => new Date().getDay() === 0, []);

  // Primary data states
  const [todayDoc] = useState<DailyAggregateDocument | null>(() =>
    getLocalDaily(athleteId, todayStr)
  );
  const [allSessions] = useState<CompletedSessionDocument[]>(() =>
    getLocalSessions(athleteId)
  );
  const [allDailies] = useState<DailyAggregateDocument[]>(() =>
    getAllLocalDailies(athleteId)
  );
  const [plannedWorkouts] = useState<PlannedWorkout[]>(() => {
    try {
      const raw = localStorage.getItem(`apex_planned_workouts_${athleteId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [waterLiters, setWaterLiters] = useState(0);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeDetailSheet, setActiveDetailSheet] = useState<"recovery" | "strain" | "sleep" | null>(null);

  // Recovery activities for today
  const [todayRecoveryLogs, setTodayRecoveryLogs] = useState<RecoveryActivityLog[]>([]);

  // Equipment maintenance due status
  const [dueMaintenanceInfo, setDueMaintenanceInfo] = useState<{
    hasDue: boolean;
    overdueCount: number;
    dueSoonCount: number;
  }>({ hasDue: false, overdueCount: 0, dueSoonCount: 0 });

  // Workout adaptive suggestion state (when recovery is amber/red)
  const [suggestionState, setSuggestionState] = useState<"pending" | "applied" | "dismissed">("pending");

  // Mode resolution
  const supportModes = user?.supportMode || ["solo"];
  const isCoachMode = supportModes.includes("coach") || supportModes.includes("specialist");

  // Load secondary background activities once
  useEffect(() => {
    getRecoveryLogs(athleteId).then((logs) => {
      setTodayRecoveryLogs(logs.filter((l) => l.date === todayStr));
    });
    getEquipmentList(athleteId).then((items) => {
      setDueMaintenanceInfo(hasDueMaintenance(items));
    });
  }, [athleteId, todayStr]);

  // Unified Three Scores Calculation (Pure & Memoized)
  const scoresRecord: DailyScoresRecord = useMemo(() => {
    return getOrComputeDailyScores({
      athleteId,
      date: todayStr,
      dailyDoc: todayDoc,
      sessions: allSessions,
      plannedWorkouts,
      athleteLevel: user?.level
    });
  }, [athleteId, todayStr, todayDoc, allSessions, plannedWorkouts, user?.level]);

  // Historical 7-day records for sparklines
  const last7DaysRecords: DailyScoresRecord[] = useMemo(() => {
    const list: DailyScoresRecord[] = [];
    const baseDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split("T")[0]!;
      const r = getOrComputeDailyScores({
        athleteId,
        date: dStr,
        sessions: allSessions,
        plannedWorkouts,
        athleteLevel: user?.level
      });
      list.push(r);
    }
    return list;
  }, [athleteId, allSessions, plannedWorkouts, user?.level]);

  // Weekly score summary (for Sundays and Weekly review)
  const weeklySummary = useMemo(() => {
    const summaryDays: DayScoreSummary[] = last7DaysRecords.map((r) => ({
      date: r.date,
      dayNameHu: "",
      recoveryScore: r.recoveryScore,
      recoveryBand: r.recoveryBand,
      strainScore: r.strainScore,
      strainTargetLow: r.strainTargetLow,
      strainTargetHigh: r.strainTargetHigh,
      sleepScore: r.sleepScore,
      sleepDurationMinutes: r.sleep.durationMinutes
    }));
    return calculateWeeklyScoreSummary(summaryDays);
  }, [last7DaysRecords]);

  // 14-day trends for detail sheets
  const recoveryTrend14d = useMemo(() => {
    return allDailies.slice(0, 14).reverse().map((d) => ({
      date: d.date,
      score: d.recoveryScore || d.readinessScore || 70,
      hrv: d.hrv?.rmssd,
      rhr: d.restingHeartRate
    }));
  }, [allDailies]);

  const strainTrend14d = useMemo(() => {
    return last7DaysRecords.map((r) => ({
      date: r.date,
      strain: r.strainScore,
      targetLow: r.strainTargetLow,
      targetHigh: r.strainTargetHigh
    }));
  }, [last7DaysRecords]);

  const sleepTrend14d = useMemo(() => {
    return allDailies.slice(0, 14).reverse().map((d) => ({
      date: d.date,
      durationMinutes: d.sleep?.durationMinutes || 480,
      score: d.sleepScore || 80
    }));
  }, [allDailies]);

  const handleAddWater = (amountMl = 250) => {
    const addedL = +(amountMl / 1000).toFixed(2);
    setWaterLiters((prev) => +(prev + addedL).toFixed(2));
    showToast({
      title: `+${amountMl} ml víz rögzítve`,
      message: `Napi folyadékbevitel: ${+(waterLiters + addedL).toFixed(2)} / 3.5 liter`,
      type: "success"
    });
  };

  const handleToggleWorkout = () => {
    const next = !workoutStarted;
    setWorkoutStarted(next);
    showToast({
      title: next
        ? (isHu ? "Edzés blokk elindítva" : "Session started")
        : (isHu ? "Edzés leállítva" : "Session stopped"),
      message: next
        ? (isHu ? "Pulzus és terheléskövetés aktív" : "Heart rate tracking active")
        : (isHu ? "Edzésnapló frissítve" : "Training log updated"),
      type: next ? "info" : "success"
    });
  };

  const hasCheckedInToday = scoresRecord.hasCheckIn;
  const todaySleepDurationHours = scoresRecord.hasSleepData
    ? (scoresRecord.sleep.durationMinutes / 60).toFixed(1)
    : "--";
  const todayRestingHr = todayDoc?.restingHeartRate ?? null;
  const todayHrv = todayDoc?.hrv?.rmssd ?? null;

  return (
    <div className="space-y-6 pb-20">
      {/* Unfinished Onboarding Banner */}
      {user && !user.onboardingCompleted && (
        <div className="flex items-center justify-between p-3.5 rounded-16 bg-brand/10 border border-brand/25 text-13">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-brand shrink-0" />
            <span className="text-text-primary">
              A sportolói profil beállítása még nem fejeződött be.
            </span>
          </div>
          <Link
            to="/onboarding"
            className="text-brand font-bold hover:underline shrink-0 flex items-center gap-1 text-12 ml-2"
          >
            Beállítás folytatása &rarr;
          </Link>
        </div>
      )}

      {/* Top Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="brand" size="sm">
              {user?.sport || "Triatlon"}
            </Badge>
            <Badge variant="outline" size="sm">
              {user?.level || "Olimpiai keret"}
            </Badge>
            <SyncStatusBadge />
            <span className="text-11 text-text-tertiary font-mono">
              {new Date().toLocaleDateString(isHu ? "hu-HU" : "en-US", {
                weekday: "long",
                month: "short",
                day: "numeric"
              })}
            </span>
          </div>
          <h1 className="text-28 sm:text-36 font-bold tracking-tight text-text-primary">
            {t("today.greeting", "Üdvözlünk")}, {user?.displayName || "Sportoló"}
          </h1>
          <p className="text-13 text-text-secondary mt-0.5">
            {hasCheckedInToday
              ? (isHu ? "A mai reggeli check-in rögzítve • Minden pontszám friss" : "Morning check-in logged • All scores fresh")
              : (isHu ? "Töltsd ki a mai check-int a pontos regenerációhoz és célsávhoz" : "Complete today's check-in for exact recovery and strain target")}
          </p>
        </div>
      </div>

      {/* 4 Large Capsule Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => navigate("/checkin")}
          className="touch-target min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-full bg-bg-surface-solid dark:bg-white/[0.05] border border-border/60 hover:bg-bg-elevated text-text-primary flex items-center justify-center gap-2 text-12 sm:text-13 font-semibold shadow-glass-sm transition-all active:scale-[0.98]"
        >
          <Activity className="h-4 w-4 text-brand shrink-0" />
          <span className="truncate">{hasCheckedInToday ? (isHu ? "Check-in adatok" : "Check-in data") : (isHu ? "Reggeli Check-in" : "Morning check-in")}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsLogModalOpen(true)}
          className="touch-target min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-full bg-bg-surface-solid dark:bg-white/[0.05] border border-border/60 hover:bg-bg-elevated text-text-primary flex items-center justify-center gap-2 text-12 sm:text-13 font-semibold shadow-glass-sm transition-all active:scale-[0.98]"
        >
          <Dumbbell className="h-4 w-4 text-brand shrink-0" />
          <span className="truncate">{isHu ? "Edzés rögzítése" : "Log workout"}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/nutrition")}
          className="touch-target min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-full bg-bg-surface-solid dark:bg-white/[0.05] border border-border/60 hover:bg-bg-elevated text-text-primary flex items-center justify-center gap-2 text-12 sm:text-13 font-semibold shadow-glass-sm transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 text-brand shrink-0" />
          <span className="truncate">{isHu ? "Étkezés naplózása" : "Log meal"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleAddWater(250)}
          className="touch-target min-w-0 min-h-[44px] px-3.5 py-2.5 rounded-full bg-bg-surface-solid dark:bg-white/[0.05] border border-border/60 hover:bg-bg-elevated text-text-primary flex items-center justify-center gap-2 text-12 sm:text-13 font-semibold shadow-glass-sm transition-all active:scale-[0.98]"
        >
          <Droplets className="h-4 w-4 text-status-ready shrink-0" />
          <span className="truncate">{isHu ? "Vízivás (+250ml)" : "Water (+250ml)"}</span>
        </button>
      </div>

      {/* Maintenance Due Alert Banner */}
      {dueMaintenanceInfo.hasDue && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>{isHu ? "Karbantartás esedékes!" : "Maintenance Required!"}</span>
                <Badge variant="caution" size="sm">
                  {dueMaintenanceInfo.overdueCount > 0
                    ? `${dueMaintenanceInfo.overdueCount} esedékes`
                    : "Hamarosan"}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {isHu
                  ? "Egy vagy több sportfelszerelésed elérte a szervizintervallumot."
                  : "One or more equipment items have reached their service interval."}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/training")}
            className="shrink-0"
          >
            {isHu ? "Eszközök &rarr;" : "View &rarr;"}
          </Button>
        </div>
      )}

      {/* First-Day Experience Banner if fresh user with 0 historical check-ins */}
      {allDailies.length === 0 && !hasCheckedInToday && (
        <Card
          variant="elevated"
          radius="20"
          className="p-5 border border-brand/40 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-12 bg-brand/20 text-brand flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="brand" size="sm">
                  1. NAP AZ APEX-EN
                </Badge>
                <span className="text-12 text-text-secondary">Üdv a fedélzeten!</span>
              </div>
              <h3 className="text-15 font-bold text-text-primary mt-1">
                {isHu ? "Kezdd el a mai professzionális napodat 3 egyszerű lépésben:" : "Start your elite day in 3 simple steps:"}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div
              onClick={() => navigate("/checkin")}
              className="p-3 rounded-14 bg-surface border border-border-hairline hover:border-brand/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-12 font-bold text-brand">
                <span className="h-5 w-5 rounded-full bg-brand/15 flex items-center justify-center text-11">1</span>
                <span>{isHu ? "Reggeli Check-in" : "Morning Check-in"}</span>
              </div>
              <p className="text-11 text-text-secondary mt-1">
                {isHu ? "Rögzítsd alvásodat és jóllétedet (30 mp)." : "Log sleep and wellness (30s)."}
              </p>
            </div>

            <div
              onClick={() => navigate("/training")}
              className="p-3 rounded-14 bg-surface border border-border-hairline hover:border-brand/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-12 font-bold text-brand">
                <span className="h-5 w-5 rounded-full bg-brand/15 flex items-center justify-center text-11">2</span>
                <span>{isHu ? "Napi Edzés Terv" : "Today's Plan"}</span>
              </div>
              <p className="text-11 text-text-secondary mt-1">
                {isHu ? "Nézd meg a mai kulcsblokkokat és célzónákat." : "Review key sets and target zones."}
              </p>
            </div>

            <div
              onClick={() => navigate("/nutrition")}
              className="p-3 rounded-14 bg-surface border border-border-hairline hover:border-brand/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 text-12 font-bold text-brand">
                <span className="h-5 w-5 rounded-full bg-brand/15 flex items-center justify-center text-11">3</span>
                <span>{isHu ? "Táplálkozási Célok" : "Fuel Targets"}</span>
              </div>
              <p className="text-11 text-text-secondary mt-1">
                {isHu ? "Kövesd a terheléshez igazított makrókat." : "Track load-periodized macronutrients."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Adaptive Mode Specific Hints */}
      {isManualOnly && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-16 border border-border-hairline bg-surface text-12 text-text-secondary">
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-brand shrink-0" />
            <span>
              {isHu
                ? "Kézi naplózási mód aktív: az edzések, izomláz és a táplálkozás manuálisan rögzíthető."
                : "Manual mode active: check-ins, sessions, and meals logged directly."}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLogModalOpen(true)}
            className="text-12 h-7"
          >
            {isHu ? "Kézi rögzítés" : "Log session"}
          </Button>
        </div>
      )}

      {isCoachMode && athleteId === "demo-athlete-001" && (
        <Card variant="surface" radius="20" className="p-4 border-l-4 border-l-brand flex items-start gap-3">
          <MessageSquare className="h-5 w-5 text-brand shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-12 font-bold text-text-primary">Kovács Péter (Vezetőedző)</span>
              <span className="text-10 text-text-tertiary font-mono">Ma, 07:15</span>
            </div>
            <p className="text-12 text-text-secondary mt-1 leading-relaxed">
              &quot;Kiváló volt a tegnapi laktát-küszöb sorozat pulzusválasza! A mai úszóedzésnél fókuszálj az alkar befordítására és a technikai hatékonyságra. Ha az izomláz magas, vedd vissza a tempót Z2-re.&quot;
            </p>
          </div>
        </Card>
      )}

      {/* Responsive Cockpit Layout: 2/3 Main on laptop, 1/3 Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 2/3 Column: Three Rings Hero + Rhythm-aware Cards + Planned Workout */}
        <div className="lg:col-span-2 space-y-6">
          {/* THREE SCORES HERO CARD (WHOOP-INSPIRED APEX COCKPIT) */}
          <ThreeScoresHeroCard
            scoresRecord={scoresRecord}
            historicalRecords={last7DaysRecords}
            onOpenDetail={(type) => setActiveDetailSheet(type)}
            onOpenCheckIn={() => navigate("/checkin")}
          />

          {/* RHYTHM-AWARE POST-TRAINING RECOVERY PROMPT */}
          {scoresRecord.rhythm.showRecoveryPrompt && (
            <Card
              variant="elevated"
              radius="28"
              className="p-5 border border-ready/30 bg-ready/5 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-16 bg-ready/20 text-ready shrink-0 mt-0.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="text-14 font-bold text-text-primary">
                    Edzés Utáni Regenerációs Ablak Aktív
                  </h4>
                  <p className="text-text-secondary leading-relaxed">
                    A terhelési célsáv elérve! Most a levezetés, a +500 ml folyadék és a minőségi fehérjebevitel a legfontosabb az izomrostok regenerációjához.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/insights?tab=recovery")}
                className="shrink-0 text-xs"
              >
                Regeneráció &rarr;
              </Button>
            </Card>
          )}

          {/* RHYTHM-AWARE EVENING BEDTIME CARD */}
          {scoresRecord.rhythm.showBedtimeCard && (
            <Card
              variant="elevated"
              radius="28"
              className="p-5 border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-16 bg-indigo-500/20 text-indigo-400 shrink-0">
                  <Moon className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-text-primary block text-14">
                    Esti Felkészülés az Alvásra
                  </span>
                  <span className="text-text-secondary">
                    {scoresRecord.sleep.bedtimeRecommendation.textHu}
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveDetailSheet("sleep")}
                className="shrink-0 text-xs bg-indigo-600 hover:bg-indigo-500"
              >
                Alvásrészletek
              </Button>
            </Card>
          )}

          {/* WEEKLY SCORE CARD (SUNDAYS) */}
          {isSunday && (
            <WeeklyScoreCard summary={weeklySummary} />
          )}

          {/* Planned Workout Card */}
          <Card variant="surface" radius="28" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-brand" aria-hidden="true" />
                  <h3 className="text-16 font-semibold tracking-tight text-text-primary">
                    {t("today.plannedSession", "Napi Fő Edzés")}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand" size="sm">
                    {scoresRecord.strain.targetRange.roomRemaining > 0
                      ? scoresRecord.strain.targetRange.roomDescriptionHu
                      : "Célsávban vagy"}
                  </Badge>
                  <span className="text-11 text-text-tertiary font-mono">10:00 - 11:30</span>
                </div>
              </div>

              {/* Adaptive Workout Adjustment Suggestion */}
              {(scoresRecord.recovery.band === "amber" || scoresRecord.recovery.band === "red") &&
                suggestionState !== "dismissed" && (
                  <div
                    className={`p-4 rounded-16 border space-y-2.5 transition-all ${
                      suggestionState === "applied"
                        ? "border-status-ready/30 bg-status-ready/10"
                        : "border-status-caution/40 bg-status-caution/10"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle
                        className={`h-5 w-5 shrink-0 mt-0.5 ${
                          suggestionState === "applied" ? "text-status-ready" : "text-status-caution"
                        }`}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-13 font-bold text-text-primary">
                            {suggestionState === "applied"
                              ? (isHu ? "Apex Javaslat alkalmazva: Z2 Aerob Állóképesség" : "Suggestion applied: Z2 Aerobic Volume")
                              : (isHu ? "Apex Terhelési Javaslat (Mérsékelt Regeneráció)" : "Apex Load Suggestion (Caution Recovery)")}
                          </span>
                          <Badge variant={suggestionState === "applied" ? "ready" : "caution"} size="sm">
                            {suggestionState === "applied" ? "Alkalmazva" : "Javasolt"}
                          </Badge>
                        </div>
                        <p className="text-12 text-text-secondary leading-relaxed">
                          {suggestionState === "applied"
                            ? (isHu
                                ? "Az edzés intenzitása Z2 aerob alapra csökkentve (60 perc). A laktát-küszöb blokkokat a következő kipihent napra ütemeztük."
                                : "Intensity stepped down to Z2 aerobic base (60m). High-threshold blocks deferred to next optimal recovery day.")
                            : (isHu
                                ? "Az autonóm idegrendszeri terhelés és izomláz alapján javasoljuk az intenzitás csökkentését 1 szinttel (Z4 küszöb helyett Z2 aerob alap, 60 perc), vagy a volumen 30%-os visszavételét."
                                : "Based on autonomic fatigue, we suggest reducing intensity by one level (Z2 aerobic instead of Z4 threshold, 60m) or trimming volume by 30%.")}
                        </p>
                      </div>
                    </div>

                    {suggestionState === "pending" && (
                      <div className="flex items-center gap-2 pt-1 pl-7">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSuggestionState("applied");
                            showToast({
                              title: "Edzésterv módosítva a mai napra",
                              message: "Z2 aerob könnyű edzés rögzítve az optimális adaptációért.",
                              type: "info"
                            });
                          }}
                          className="text-11 h-7 px-3"
                        >
                          {isHu ? "Javaslat alkalmazása (Z2 aerob)" : "Apply suggestion (Z2)"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSuggestionState("dismissed")}
                          className="text-11 h-7 px-2 text-text-tertiary"
                        >
                          {isHu ? "Eredeti terv megtartása" : "Keep original"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              {/* Workout Details Box */}
              <div className="rounded-16 border border-border-hairline bg-surface-elevated p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-14 font-bold text-text-primary">
                      {suggestionState === "applied"
                        ? "60p Folyamatos Z2 Aerob Állóképesség (Úszás)"
                        : "5 x 400m Laktát-küszöb sorozat (Úszás)"}
                    </h4>
                    <p className="text-12 text-text-secondary mt-0.5">
                      {suggestionState === "applied"
                        ? "Cél: Z2 aerob zóna (135-145 bpm) • Technikai fókusz • RPE 5.0"
                        : "Célterhelés: RPE 8.5 • Z4 pulzustartomány (168-175 bpm) • 100m aktív pihenő"}
                    </p>
                  </div>
                  <Badge variant={suggestionState === "applied" ? "ready" : "caution"} size="sm">
                    {suggestionState === "applied" ? "RPE 5.0" : "RPE 8.5"}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-12 text-text-secondary pt-2 border-t border-border-hairline">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {suggestionState === "applied" ? "60 perc" : "90 perc"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-brand">
                    <Flame className="h-3.5 w-3.5" />
                    {suggestionState === "applied" ? "300 AU terhelés" : "720 AU terhelés"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant={workoutStarted ? "secondary" : "primary"}
                fullWidth
                leftIcon={
                  workoutStarted ? (
                    <CheckCircle2 className="h-4 w-4 text-status-ready" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )
                }
                onClick={handleToggleWorkout}
              >
                {workoutStarted
                  ? (isHu ? "Edzés folyamatban (Kész)" : "Session running (Done)")
                  : t("training.startSession", "Edzés indítása")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsLogModalOpen(true)}
              >
                {isHu ? "Kézi naplózás" : "Log session"}
              </Button>
            </div>
          </Card>

          {/* 4 Key Biometrics Cockpit Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <StatTile
              label={t("today.hrvMetric", "HRV (rMSSD)")}
              value={todayHrv !== null ? todayHrv : "--"}
              unit="ms"
              status={todayHrv !== null ? (todayHrv >= 75 ? "ready" : todayHrv >= 60 ? "caution" : "rest") : "neutral"}
              subtext={todayHrv !== null ? "Check-in alapján" : (isHu ? "Még nincs mai adat" : "No data yet")}
              topRight={<SourceBadge source="manual" confidence={todayHrv !== null ? 0.95 : 0} />}
            />
            <StatTile
              label={isHu ? "Nyugalmi pulzus" : "Resting HR"}
              value={todayRestingHr !== null ? todayRestingHr : "--"}
              unit="bpm"
              status={todayRestingHr !== null ? "ready" : "neutral"}
              subtext={todayRestingHr !== null ? "Check-in alapján" : (isHu ? "Még nincs mai adat" : "No data yet")}
              topRight={<SourceBadge source="manual" confidence={todayRestingHr !== null ? 0.95 : 0} />}
            />
            <StatTile
              label={t("today.sleepMetric", "Alvásidő")}
              value={todaySleepDurationHours}
              unit={isHu ? "óra" : "h"}
              status={todaySleepDurationHours !== "--" ? (+todaySleepDurationHours >= 7.5 ? "ready" : "caution") : "neutral"}
              subtext={todaySleepDurationHours !== "--" ? (isHu ? "Kattints az elemzéshez" : "Click for sleep chart") : (isHu ? "Még nincs mai adat" : "No data yet")}
              topRight={<ConfidenceMeter confidence={todaySleepDurationHours !== "--" ? 92 : 0} size="sm" />}
              onClick={() => setActiveDetailSheet("sleep")}
            />
            <StatTile
              label={t("nutrition.hydration", "Folyadék")}
              value={waterLiters}
              unit="/ 3.5 l"
              status={waterLiters >= 3.0 ? "ready" : "caution"}
              subtext={`${Math.round((waterLiters / 3.5) * 100)}%`}
              topRight={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddWater(250);
                  }}
                  aria-label="250 ml víz hozzáadása"
                  className="rounded-8 bg-brand/10 px-1.5 py-0.5 text-10 font-bold text-brand hover:bg-brand/20 transition-colors shrink-0"
                >
                  +250ml
                </button>
              }
            />
          </div>
        </div>

        {/* Side 1/3 Column: Countdown + Weekly Card + Fuel + Recovery + Hydration */}
        <div className="lg:col-span-1 space-y-6">
          {/* Target Race Countdown Card */}
          {user?.targetCompetition && (
            <Card variant="surface" radius="28" className="p-5 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-11 font-bold tracking-widest text-brand uppercase font-mono">
                  CÉLVERSENY VISSZASZÁMLÁLÓ
                </span>
                <Badge variant="brand" size="sm">„A” Verseny</Badge>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-15 font-bold text-text-primary truncate">
                  {user.targetCompetition}
                </h4>
                {user.targetCompetitionDate && (() => {
                  const diffDays = Math.ceil((new Date(user.targetCompetitionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const diffWeeks = Math.max(0, Math.ceil(diffDays / 7));
                  return (
                    <div className="text-right shrink-0">
                      <span className="text-20 font-black font-mono tabular-nums text-text-primary">
                        {diffDays > 0 ? diffDays : 0}
                      </span>
                      <span className="text-12 text-text-secondary ml-1 font-medium">nap</span>
                      <span className="text-11 text-text-tertiary block font-mono">({diffWeeks} hét)</span>
                    </div>
                  );
                })()}
              </div>
            </Card>
          )}

          {/* WEEKLY SCORE CARD ("HETI KÖR") */}
          <WeeklyScoreCard
            summary={weeklySummary}
            onShare={() => {
              showToast({
                title: "Heti kör megosztása",
                message: "A megosztási kép előkészítése folyamatban.",
                type: "info"
              });
            }}
          />

          {/* Nutrition & Fuel Card */}
          <Card variant="surface" radius="28" className="p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-brand" aria-hidden="true" />
                  <h3 className="text-16 font-semibold tracking-tight text-text-primary">
                    {t("nutrition.title", "Táplálkozási Célok")}
                  </h3>
                </div>
                <span className="text-14 font-bold text-text-primary tabular-nums">
                  2 150 / 3 450 kcal
                </span>
              </div>

              {/* Session Fuelling Hint Pill */}
              <div className="p-3 rounded-14 border border-brand/20 bg-brand/5 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <div className="text-12">
                  <span className="font-bold text-text-primary block">
                    {isHu ? "Következő edzés előtti üzemanyag hint:" : "Next session fuelling hint:"}
                  </span>
                  <p className="text-text-secondary mt-0.5 leading-relaxed">
                    {isHu
                      ? "60-90 perccel a 10:00-s úszás előtt: 45g gyorsan felszívódó szénhidrát és 500ml víz javasolt a glikogénraktárak telítéséhez."
                      : "60-90m before 10:00 swim: 45g rapid carbohydrates and 500ml hydration advised."}
                  </p>
                </div>
              </div>

              {/* Macronutrient Progress Bars */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-12 text-text-secondary mb-1">
                    <span>{t("nutrition.protein", "Fehérje")} (2.0 g/kg)</span>
                    <span className="tabular-nums font-medium text-text-primary">155g / 185g (84%)</span>
                  </div>
                  <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand h-1.5 rounded-full" style={{ width: "84%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-12 text-text-secondary mb-1">
                    <span>{t("nutrition.carbs", "Szénhidrát")} (5.5 g/kg)</span>
                    <span className="tabular-nums font-medium text-text-primary">340g / 450g (75%)</span>
                  </div>
                  <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                    <div className="bg-status-caution h-1.5 rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-12 text-text-secondary mb-1">
                    <span>{t("nutrition.fats", "Zsír")}</span>
                    <span className="tabular-nums font-medium text-text-primary">58g / 75g (77%)</span>
                  </div>
                  <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                    <div className="bg-status-ready h-1.5 rounded-full" style={{ width: "77%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
              <span className="text-11 text-text-secondary">
                {isHu ? "Dietetikus: Molnár Eszter" : "Dietitian: Eszter Molnár"}
              </span>
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => navigate("/nutrition")}
              >
                {isHu ? "Étkezés rögzítése" : "Log meal"}
              </Button>
            </div>
          </Card>

          {/* Today's Recovery Activities Summary */}
          <Card variant="surface" radius="28" className="p-5 border border-border-hairline flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-12 bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-11 font-semibold uppercase tracking-wider text-text-tertiary">
                  {isHu ? "Mai regenerációs aktivitások" : "Today's Recovery Protocols"}
                </div>
                {todayRecoveryLogs.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    {todayRecoveryLogs.map((log) => (
                      <span
                        key={log.id}
                        className="inline-flex items-center gap-1 text-11 px-2.5 py-0.5 rounded-full bg-surface-elevated border border-border-hairline text-text-primary font-medium"
                      >
                        <span>{log.activityName}</span>
                        <span className="text-text-tertiary">({log.durationMinutes}p)</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-12 text-text-secondary mt-1">
                    {isHu
                      ? "Mára még nincs rögzített regeneráció (szauna, hidegfürdő, masszázs, nyújtás)"
                      : "No recovery logged yet today (sauna, cold plunge, massage, mobility)"}
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="tertiary"
              size="sm"
              onClick={() => navigate("/insights?tab=recovery")}
              className="text-11 self-end"
            >
              {isHu ? "Regeneráció napló &rarr;" : "Recovery log &rarr;"}
            </Button>
          </Card>

          {/* Beverage-Engine Driven Hydration Section */}
          <HydrationTrackerCard
            userId={athleteId}
            date={todayStr}
            targetLiters={3.5}
          />
        </div>
      </div>

      {/* DETAIL SHEETS */}
      <RecoveryDetailSheet
        isOpen={activeDetailSheet === "recovery"}
        onClose={() => setActiveDetailSheet(null)}
        recovery={scoresRecord.recovery}
        onNavigateToCheckIn={() => navigate("/checkin")}
        historicalTrend={recoveryTrend14d}
      />

      <StrainDetailSheet
        isOpen={activeDetailSheet === "strain"}
        onClose={() => setActiveDetailSheet(null)}
        strain={scoresRecord.strain}
        historicalTrend={strainTrend14d}
        weeklyTotalStrain={weeklySummary.totalStrain}
      />

      <SleepDetailSheet
        isOpen={activeDetailSheet === "sleep"}
        onClose={() => setActiveDetailSheet(null)}
        sleep={scoresRecord.sleep}
        historicalTrend={sleepTrend14d}
      />

      {/* Manual Session Quick Modal */}
      <ManualSessionModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </div>
  );
};

export default TodayPage;
