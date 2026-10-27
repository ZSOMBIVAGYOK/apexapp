import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  Card,
  Button,
  Slider,
  NumberInput,
  ProgressRing,
  SectionHeader,
  Badge,
  SourceBadge,
  ConfidenceMeter,
  SyncStatusBadge,
  SorenessBodyMap,
  BottomSheet,
  Toggle,
  DaySwitcher,
  showToast
} from "@shared/ui";
import {
  calculateReadiness,
  ReadinessResult,
  bandToStatus
} from "@shared/lib/readiness";
import {
  persistDailyCheckin,
  getLocalDaily,
  getAllLocalDailies,
  getLocalSessions
} from "@shared/lib/offline/offlineStorage";
import {
  recomputeLoadsFromDate
} from "@shared/lib/load/loadRecomputation";
import {
  DailyAggregateDocument,
  DataSourceOrigin
} from "@shared/types";
import {
  Activity,
  Moon,
  HeartPulse,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles
} from "lucide-react";

export const CheckinPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isHu = i18n.language.startsWith("hu");

  const todayStr = new Date().toISOString().split("T")[0] as string;
  const athleteId = user?.uid || "demo-athlete-001";

  // Selected date on checkin page (supports any earlier date)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Check if target day already has a saved checkin
  const [existingDoc, setExistingDoc] = useState<DailyAggregateDocument | null>(null);
  const [readinessResult, setReadinessResult] = useState<ReadinessResult | null>(null);

  // Form States - Sleep
  const [sleepMode, setSleepMode] = useState<"hours" | "times">("hours");
  const [sleepDurationMinutes, setSleepDurationMinutes] = useState(450); // 7.5 hours
  const [bedTime, setBedTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [sleepQuality, setSleepQuality] = useState(4); // 1-5 scale
  const [sleepSource, setSleepSource] = useState<DataSourceOrigin>("manual");
  const [sleepOverridden, setSleepOverridden] = useState(false);

  // Hooper Wellness Ratings (1-5)
  const [fatigue, setFatigue] = useState(2); // 1 = Fresh, 5 = Exhausted
  const [soreness, setSoreness] = useState(2); // 1 = None, 5 = Extreme
  const [stress, setStress] = useState(2); // 1 = Calm, 5 = Extreme
  const [mood, setMood] = useState(4); // 1 = Poor, 5 = Great
  const [motivation, setMotivation] = useState(4); // 1 = Low, 5 = Peak
  const [appetite, setAppetite] = useState(4); // 1 = Poor, 5 = High
  const [illness, setIllness] = useState(false);

  // Soreness Body Map
  const [soreAreas, setSoreAreas] = useState<string[]>([]);
  const [isBodyMapOpen, setIsBodyMapOpen] = useState(false);

  // Optional Morning Biometrics
  const [restingHr, setRestingHr] = useState<number | undefined>(50);
  const [hrvRmssd, setHrvRmssd] = useState<number | undefined>(78);
  const [weightKg, setWeightKg] = useState<number | undefined>(74.5);
  const [hrvSource] = useState<DataSourceOrigin>("garmin");
  const [rhrSource] = useState<DataSourceOrigin>("garmin");

  // Notes & UI State
  const [notes, setNotes] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load daily checkin data for selected date
  const loadDateData = React.useCallback((targetDate: string) => {
    const existing = getLocalDaily(athleteId, targetDate);
    if (existing) {
      setExistingDoc(existing);
      setSleepDurationMinutes(existing.sleep.durationMinutes);
      setSleepQuality(existing.sleep.qualityScore);
      if (existing.sleep.bedTime) setBedTime(existing.sleep.bedTime);
      if (existing.sleep.wakeTime) setWakeTime(existing.sleep.wakeTime);
      setFatigue(existing.subjective.fatigue || 2);
      setSoreness(existing.subjective.soreness);
      setStress(existing.subjective.stress);
      setMood(existing.subjective.mood || 4);
      setMotivation(existing.subjective.motivation || 4);
      setAppetite(existing.subjective.appetite || 4);
      setIllness(Boolean(existing.subjective.illness));
      setSoreAreas(existing.subjective.soreAreas || []);
      setRestingHr(existing.restingHeartRate);
      setHrvRmssd(existing.hrv?.rmssd);
      setWeightKg(existing.weightKg);
      if (existing.notes) setNotes(existing.notes);

      // Re-run readiness engine on the stored data
      const historicalDays = getAllLocalDailies(athleteId).length;
      const res = calculateReadiness({
        date: existing.date,
        sleep: {
          durationMinutes: existing.sleep.durationMinutes,
          qualityScore: existing.sleep.qualityScore
        },
        wellness: {
          fatigue: existing.subjective.fatigue || 2,
          soreness: existing.subjective.soreness,
          stress: existing.subjective.stress,
          mood: existing.subjective.mood || 4,
          motivation: existing.subjective.motivation || 4,
          appetite: existing.subjective.appetite,
          illness: existing.subjective.illness,
          soreAreas: existing.subjective.soreAreas
        },
        biometrics: {
          hrvRmssd: existing.hrv?.rmssd,
          restingHr: existing.restingHeartRate,
          baselineHrvMean: 76,
          baselineHrvSd: 8,
          baselineRhrMean: 50
        },
        historicalDaysCount: historicalDays
      });
      setReadinessResult(res);
    } else {
      setExistingDoc(null);
      setReadinessResult(null);
      setNotes("");
    }
  }, [athleteId]);

  useEffect(() => {
    loadDateData(selectedDate);
  }, [selectedDate, loadDateData]);

  // Bed & Wake time duration calculation
  const handleTimeChange = (bed: string, wake: string) => {
    setBedTime(bed);
    setWakeTime(wake);
    const [bH, bM] = bed.split(":").map(Number);
    const [wH, wM] = wake.split(":").map(Number);
    if (bH !== undefined && bM !== undefined && wH !== undefined && wM !== undefined) {
      const bMinutes = bH * 60 + bM;
      let wMinutes = wH * 60 + wM;
      if (wMinutes < bMinutes) {
        wMinutes += 24 * 60; // Next day
      }
      const diff = Math.max(0, wMinutes - bMinutes);
      setSleepDurationMinutes(diff);
    }
  };

  const handleOverrideDevice = () => {
    setSleepSource("manual");
    setSleepOverridden(true);
    showToast({
      title: isHu ? "Kézi felülírás aktív" : "Manual override enabled",
      message: isHu ? "Módosíthatod az alvásértékeket tetszés szerint" : "You can adjust sleep values freely",
      type: "info"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const historicalCount = getAllLocalDailies(athleteId).length;
      const readiness = calculateReadiness({
        date: selectedDate,
        sleep: {
          durationMinutes: sleepDurationMinutes,
          qualityScore: sleepQuality,
          bedTime: sleepMode === "times" ? bedTime : undefined,
          wakeTime: sleepMode === "times" ? wakeTime : undefined
        },
        wellness: {
          fatigue,
          soreness,
          stress,
          mood,
          motivation,
          appetite,
          illness,
          soreAreas
        },
        biometrics: {
          hrvRmssd,
          restingHr,
          baselineHrvMean: 76,
          baselineHrvSd: 8,
          baselineRhrMean: 50
        },
        historicalDaysCount: historicalCount
      });

      const docData: DailyAggregateDocument = {
        date: selectedDate,
        athleteId,
        sleep: {
          durationMinutes: sleepDurationMinutes,
          qualityScore: sleepQuality,
          bedTime: sleepMode === "times" ? bedTime : undefined,
          wakeTime: sleepMode === "times" ? wakeTime : undefined
        },
        hrv: hrvRmssd
          ? {
              rmssd: hrvRmssd,
              score: readiness.score,
              status: readiness.band === "green" ? "balanced" : readiness.band === "amber" ? "low" : "low"
            }
          : undefined,
        restingHeartRate: restingHr,
        weightKg,
        subjective: {
          fatigue,
          soreness,
          stress,
          mood,
          motivation,
          appetite,
          illness,
          soreAreas,
          sleepQuality
        },
        readinessScore: readiness.score,
        readinessStatus: bandToStatus(readiness.band),
        readinessConfidence: readiness.confidence,
        readinessDrivers: readiness.drivers.map((d) => ({
          id: d.id,
          label: isHu ? d.labelHu : d.labelEn,
          impact: d.impact,
          category: d.category
        })),
        isCalibrating: readiness.isCalibrating,
        calibrationDays: readiness.calibrationProgress.daysCollected,
        sourceFlags: {
          sleepSource,
          hrvSource: hrvRmssd ? hrvSource : undefined,
          rhrSource: restingHr ? rhrSource : undefined,
          wellnessSource: "manual"
        },
        notes: notes.trim() || undefined,
        source: sleepSource === "garmin" ? "garmin" : "manual",
        confidence: readiness.confidence / 100,
        createdAt: existingDoc?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: athleteId
      };

      await persistDailyCheckin(docData);
      setExistingDoc(docData);
      setReadinessResult(readiness);

      // Recompute loads & readiness from the selected date forward
      const allSessions = getLocalSessions(athleteId);
      recomputeLoadsFromDate({
        athleteId,
        sessions: allSessions,
        affectedFromDate: selectedDate
      });

      showToast({
        title: isHu ? "Check-in elmentve" : "Check-in saved",
        message: isHu
          ? `${selectedDate === todayStr ? "Mai" : selectedDate} készenléti index: ${readiness.score}/100 (${readiness.band.toUpperCase()})`
          : `Readiness score for ${selectedDate}: ${readiness.score}/100 (${readiness.band.toUpperCase()})`,
        type: readiness.band === "green" ? "success" : readiness.band === "amber" ? "info" : "warning"
      });
    } catch {
      showToast({
        title: isHu ? "Mentési hiba" : "Save error",
        message: isHu ? "Az adatokat helyben tároltuk offline" : "Stored locally offline",
        type: "warning"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sleepHours = (sleepDurationMinutes / 60).toFixed(1);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      {/* Header with Quick Timer Badge & Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SectionHeader
          title={t("checkin.title", "Reggeli Napi Check-in")}
          description={t("checkin.subtitle", "Rögzítsd a regenerációs mutatókat a terhelés finomhangolásához.")}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="brand" size="sm">
            ⏱ {isHu ? "< 30 másodperc" : "< 30 seconds"}
          </Badge>
          <SyncStatusBadge />
        </div>
      </div>

      {/* Day Switcher (supports any earlier date) */}
      <div className="flex items-center justify-between pb-1">
        <DaySwitcher
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          allowFuture={false}
        />
      </div>

      {/* If Completed / Computed: Readiness Result Cockpit Card */}
      {readinessResult && (
        <Card
          variant="elevated"
          radius="20"
          className={`p-6 border transition-all ${
            readinessResult.band === "green"
              ? "border-status-ready/30 bg-status-ready/5"
              : readinessResult.band === "amber"
                ? "border-status-caution/30 bg-status-caution/5"
                : "border-status-rest/30 bg-status-rest/5"
          }`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Readiness Ring & Status Label */}
            <div className="flex items-center gap-5">
              <ProgressRing
                value={readinessResult.score}
                size={110}
                strokeWidth={9}
                label="Apex"
                unit=""
                status={bandToStatus(readinessResult.band)}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={bandToStatus(readinessResult.band)} dot size="sm">
                    {readinessResult.band === "green"
                      ? isHu ? "KÉSZEN ÁLLSZ (READY)" : "OPTIMAL READY"
                      : readinessResult.band === "amber"
                        ? isHu ? "MÉRSÉKELT (CAUTION)" : "MODERATE LOAD"
                        : isHu ? "PIHENŐ (REST)" : "RECOVERY REQUIRED"}
                  </Badge>
                  <ConfidenceMeter confidence={readinessResult.confidence} size="sm" />
                </div>
                <h3 className="text-20 font-bold text-text-primary tracking-tight">
                  {readinessResult.score}/100 {isHu ? "Készenlét" : "Readiness"}
                </h3>
                <p className="text-12 text-text-secondary max-w-sm">
                  {isHu ? readinessResult.softMessageHu : readinessResult.softMessageEn}
                </p>
              </div>
            </div>

            {/* Quick Navigation CTAs */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate("/")}
              >
                {isHu ? "Ugrás a mai edzéshez" : "View Today's Plan"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/insights")}
              >
                {isHu ? "Regenerációs áttekintés" : "Recovery Overview"}
              </Button>
            </div>
          </div>

          {/* Cold Start Calibration Banner if < 14 days */}
          {readinessResult.isCalibrating && (
            <div className="mt-5 p-3 rounded-12 bg-bg-surface border border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-3 text-12">
              <div className="flex items-center gap-2 text-text-secondary">
                <Sparkles className="h-4 w-4 text-brand shrink-0" />
                <span>
                  <strong>{isHu ? "Bázis kalibrálás:" : "Calibration:"}</strong>{" "}
                  {readinessResult.calibrationProgress.daysCollected}/
                  {readinessResult.calibrationProgress.daysRequired} {isHu ? "nap rögzítve" : "days logged"}
                </span>
              </div>
              <div className="w-full sm:w-36 h-2 rounded-full bg-border-hairline overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-300"
                  style={{ width: `${readinessResult.calibrationProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Top 3 Drivers Pill List */}
          <div className="mt-5 pt-4 border-t border-border-hairline/80">
            <span className="text-11 font-bold uppercase tracking-wider text-text-tertiary block mb-2">
              {isHu ? "Fő befolyásoló tényezők (Top 3)" : "Primary Drivers"}
            </span>
            <div className="flex flex-wrap gap-2">
              {readinessResult.drivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-10 text-12 font-medium border ${
                    driver.impact === "positive"
                      ? "bg-status-ready/10 text-status-ready border-status-ready/20"
                      : "bg-status-rest/10 text-status-rest border-status-rest/20"
                  }`}
                >
                  <span>{driver.impact === "positive" ? "▲" : "▼"}</span>
                  <span>{isHu ? driver.labelHu : driver.labelEn}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Main Checkin Form */}
      <Card variant="surface" radius="20" className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: Sleep */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-brand" />
                <h2 className="text-16 font-bold text-text-primary">
                  {isHu ? "1. Alvás & Pihenés" : "1. Sleep & Rest"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <SourceBadge source={sleepSource} confidence={0.9} />
                {sleepSource !== "manual" && !sleepOverridden && (
                  <button
                    type="button"
                    onClick={handleOverrideDevice}
                    className="text-11 text-brand hover:underline font-medium"
                  >
                    {isHu ? "Felülírás" : "Override"}
                  </button>
                )}
              </div>
            </div>

            {/* Sleep Mode Switcher: Hours vs Times */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSleepMode("hours")}
                className={`px-3 py-1.5 rounded-8 text-12 font-medium transition-colors ${
                  sleepMode === "hours"
                    ? "bg-brand text-white shadow-sm"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                {isHu ? "Időtartam (óra)" : "Duration (hours)"}
              </button>
              <button
                type="button"
                onClick={() => setSleepMode("times")}
                className={`px-3 py-1.5 rounded-8 text-12 font-medium transition-colors ${
                  sleepMode === "times"
                    ? "bg-brand text-white shadow-sm"
                    : "bg-bg-elevated text-text-secondary hover:text-text-primary"
                }`}
              >
                {isHu ? "Lefekvés & Ébredés" : "Bed & Wake times"}
              </button>
            </div>

            {sleepMode === "hours" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-13 text-text-secondary">
                    {isHu ? "Alvásidő" : "Sleep duration"}:
                  </span>
                  <span className="text-20 font-bold text-text-primary tabular-nums">
                    {sleepHours} {isHu ? "óra" : "hours"} ({sleepDurationMinutes} {isHu ? "perc" : "min"})
                  </span>
                </div>
                <Slider
                  min={180}
                  max={660}
                  step={15}
                  value={sleepDurationMinutes}
                  onChange={(val) => {
                    setSleepDurationMinutes(val);
                    if (sleepSource !== "manual") setSleepOverridden(true);
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-12 font-medium text-text-secondary block mb-1">
                    {isHu ? "Lefekvés" : "Bedtime"}
                  </label>
                  <input
                    type="time"
                    value={bedTime}
                    onChange={(e) => handleTimeChange(e.target.value, wakeTime)}
                    className="w-full bg-bg-elevated text-text-primary rounded-12 border border-border-hairline p-2.5 text-14 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-12 font-medium text-text-secondary block mb-1">
                    {isHu ? "Ébredés" : "Wake time"}
                  </label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => handleTimeChange(bedTime, e.target.value)}
                    className="w-full bg-bg-elevated text-text-primary rounded-12 border border-border-hairline p-2.5 text-14 font-mono font-bold"
                  />
                </div>
              </div>
            )}

            {/* Sleep Quality (1-5 Hooper scale) */}
            <div className="space-y-1.5 pt-2">
              <label className="text-13 font-medium text-text-secondary">
                {isHu ? "Alvás minősége" : "Sleep quality"}:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { val: 1, labelHu: "Nagyon rossz", labelEn: "Very poor" },
                  { val: 2, labelHu: "Nyugtalan", labelEn: "Restless" },
                  { val: 3, labelHu: "Átlagos", labelEn: "Average" },
                  { val: 4, labelHu: "Jó", labelEn: "Good" },
                  { val: 5, labelHu: "Kiváló", labelEn: "Deep / Great" }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setSleepQuality(item.val)}
                    className={`py-2 px-1 rounded-12 text-center border transition-all ${
                      sleepQuality === item.val
                        ? "bg-brand/15 border-brand text-brand font-bold shadow-sm"
                        : "bg-bg-elevated border-border-hairline text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <span className="block text-16 font-bold">{item.val}</span>
                    <span className="block text-[10px] truncate">
                      {isHu ? item.labelHu : item.labelEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* SECTION 2: Hooper Wellness Index (1-5 sliders) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-status-ready" />
                <h2 className="text-16 font-bold text-text-primary">
                  {isHu ? "2. Szubjektív Jóllét (Hooper Index)" : "2. Subjective Wellness (Hooper Index)"}
                </h2>
              </div>
              <Badge variant="outline" size="sm">
                1 - 5 {isHu ? "skála" : "scale"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fatigue */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-13">
                  <span className="font-semibold text-text-primary">
                    {isHu ? "Fáradtság (Fatigue)" : "Fatigue"}
                  </span>
                  <span className="text-14 font-mono font-bold text-text-primary">{fatigue}/5</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={fatigue}
                  onChange={setFatigue}
                />
                <div className="flex justify-between text-10 text-text-tertiary">
                  <span>{isHu ? "1: Kipihent" : "1: Fresh"}</span>
                  <span>{isHu ? "5: Kimerült" : "5: Exhausted"}</span>
                </div>
              </div>

              {/* Muscle Soreness & Body Map Trigger */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-13">
                  <span className="font-semibold text-text-primary">
                    {isHu ? "Izomláz (Soreness)" : "Muscle Soreness"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBodyMapOpen(true)}
                      className="text-11 text-brand hover:underline font-medium"
                    >
                      🗺 {isHu ? "Izomláz térkép" : "Body map"}
                      {soreAreas.length > 0 && ` (${soreAreas.length})`}
                    </button>
                    <span className="text-14 font-mono font-bold text-text-primary">{soreness}/5</span>
                  </div>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={soreness}
                  onChange={setSoreness}
                />
                <div className="flex justify-between text-10 text-text-tertiary">
                  <span>{isHu ? "1: Nincs izomláz" : "1: None"}</span>
                  <span>{isHu ? "5: Extrém izomláz" : "5: Severe"}</span>
                </div>
              </div>

              {/* Stress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-13">
                  <span className="font-semibold text-text-primary">
                    {isHu ? "Stressz (Mental Stress)" : "Stress"}
                  </span>
                  <span className="text-14 font-mono font-bold text-text-primary">{stress}/5</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={stress}
                  onChange={setStress}
                />
                <div className="flex justify-between text-10 text-text-tertiary">
                  <span>{isHu ? "1: Nyugodt / Fókuszált" : "1: Calm"}</span>
                  <span>{isHu ? "5: Nagyon stresszes" : "5: Very high"}</span>
                </div>
              </div>

              {/* Mood */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-13">
                  <span className="font-semibold text-text-primary">
                    {isHu ? "Hangulat (Mood)" : "Mood"}
                  </span>
                  <span className="text-14 font-mono font-bold text-text-primary">{mood}/5</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={mood}
                  onChange={setMood}
                />
                <div className="flex justify-between text-10 text-text-tertiary">
                  <span>{isHu ? "1: Nagyon rossz" : "1: Poor"}</span>
                  <span>{isHu ? "5: Kiváló / Vidám" : "5: Great"}</span>
                </div>
              </div>

              {/* Motivation */}
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between text-13">
                  <span className="font-semibold text-text-primary">
                    {isHu ? "Edzésmotiváció (Motivation)" : "Motivation"}
                  </span>
                  <span className="text-14 font-mono font-bold text-text-primary">{motivation}/5</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={motivation}
                  onChange={setMotivation}
                />
                <div className="flex justify-between text-10 text-text-tertiary">
                  <span>{isHu ? "1: Semmi kedvem edzeni" : "1: Zero drive"}</span>
                  <span>{isHu ? "5: Alig várom a mai edzést" : "5: Peak drive"}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border-hairline" />

          {/* SECTION 3: Optional Collapsible Morning Measurements & Illness */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptionalFields((prev) => !prev)}
              className="flex items-center justify-between w-full py-2 text-left font-semibold text-14 text-text-secondary hover:text-text-primary"
            >
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-brand" />
                <span>
                  {isHu ? "3. Opcionális reggeli mérések & Étvágy" : "3. Optional Morning Metrics & Appetite"}
                </span>
                {illness && (
                  <Badge variant="rest" size="sm">
                    {isHu ? "Betegség jelezve" : "Illness active"}
                  </Badge>
                )}
              </div>
              {showOptionalFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showOptionalFields && (
              <div className="pt-4 space-y-6">
                {/* Illness Toggle */}
                <div className="p-3.5 rounded-16 bg-bg-elevated border border-border-hairline flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-status-rest" />
                      <span className="text-13 font-bold text-text-primary">
                        {isHu ? "Betegség vagy fertőzés tünetek" : "Illness or cold symptoms"}
                      </span>
                    </div>
                    <p className="text-11 text-text-secondary">
                      {isHu
                        ? "Láz, torokfájás, gyomorrontás vagy általános gyengeség"
                        : "Fever, sore throat, GI distress, or systemic fatigue"}
                    </p>
                  </div>
                  <Toggle
                    checked={illness}
                    onChange={(checked) => setIllness(checked)}
                  />
                </div>

                {/* Biometrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-12 font-medium text-text-secondary">
                        {isHu ? "Nyugalmi pulzus (bpm)" : "Resting HR (bpm)"}
                      </label>
                      <SourceBadge source={rhrSource} />
                    </div>
                    <NumberInput
                      value={restingHr || 50}
                      onChange={(val) => setRestingHr(val)}
                      min={30}
                      max={120}
                      step={1}
                      unit="bpm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-12 font-medium text-text-secondary">
                        {isHu ? "HRV (rMSSD ms)" : "HRV (rMSSD ms)"}
                      </label>
                      <SourceBadge source={hrvSource} />
                    </div>
                    <NumberInput
                      value={hrvRmssd || 75}
                      onChange={(val) => setHrvRmssd(val)}
                      min={10}
                      max={200}
                      step={1}
                      unit="ms"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-12 font-medium text-text-secondary">
                        {isHu ? "Testsúly (kg)" : "Body weight (kg)"}
                      </label>
                      <SourceBadge source="manual" />
                    </div>
                    <NumberInput
                      value={weightKg || 74.0}
                      onChange={(val) => setWeightKg(val)}
                      min={35}
                      max={200}
                      step={0.1}
                      unit="kg"
                    />
                  </div>
                </div>

                {/* Appetite */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-13">
                    <span className="font-semibold text-text-secondary">
                      {isHu ? "Étvágy (Appetite)" : "Appetite"}
                    </span>
                    <span className="text-13 font-mono font-bold text-text-primary">{appetite}/5</span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={appetite}
                    onChange={setAppetite}
                  />
                </div>

                {/* Freeform Notes */}
                <div>
                  <label className="text-12 font-medium text-text-secondary block mb-1">
                    {isHu ? "Reggeli megjegyzések / Érzések" : "Morning notes / Perceptions"}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isHu ? "pl. Kicsit nehéz lábak tegnapi résztávok után..." : "e.g. Heavy legs after intervals..."}
                    className="w-full bg-bg-elevated text-text-primary text-13 rounded-12 border border-border-hairline p-3 placeholder:text-text-tertiary focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit CTA Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              leftIcon={<Activity className="h-5 w-5" />}
            >
              {isHu ? "Check-in mentése & Készenlét számítása" : "Save Check-in & Compute Readiness"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Soreness Body Map Modal / BottomSheet */}
      <BottomSheet
        isOpen={isBodyMapOpen}
        onClose={() => setIsBodyMapOpen(false)}
        title={isHu ? "Izomláz és Fájdalom Térkép" : "Muscle Soreness Body Map"}
      >
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-12 text-text-secondary text-center max-w-sm mx-auto">
            {isHu
              ? "Koppints a fájdalmas vagy kötött izomcsoportokra az anatómiai sziluetten."
              : "Tap the muscle groups on the silhouette to tag areas of tightness or soreness."}
          </p>

          <SorenessBodyMap
            selectedRegions={soreAreas}
            onChange={(regions) => setSoreAreas(regions)}
          />

          <div className="flex justify-end pt-3">
            <Button variant="primary" onClick={() => setIsBodyMapOpen(false)}>
              {isHu ? "Kész" : "Done"} ({soreAreas.length})
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default CheckinPage;
