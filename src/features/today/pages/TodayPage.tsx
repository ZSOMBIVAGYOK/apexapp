import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { useAppMode } from "@shared/hooks/useAppMode";
import {
  Card,
  StatTile,
  ProgressRing,
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
  ArrowRight,
  Flame
} from "lucide-react";
import {
  getLocalDaily,
  getAllLocalDailies
} from "@shared/lib/offline/offlineStorage";
import {
  calculateReadiness,
  ReadinessResult,
  bandToStatus
} from "@shared/lib/readiness";
import { ManualSessionModal } from "@features/training/components/ManualSessionModal";

export const TodayPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isManualOnly, plateBasedViewOnly } = useAppMode();
  const isHu = i18n.language.startsWith("hu");

  const athleteId = user?.uid || "demo-athlete-001";
  const todayStr = new Date().toISOString().split("T")[0] as string;

  const [waterLiters, setWaterLiters] = useState(2.5);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Check-in & Readiness state
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [readinessResult, setReadinessResult] = useState<ReadinessResult | null>(null);
  const [todaySleepDurationHours, setTodaySleepDurationHours] = useState("8.0");
  const [todayRestingHr, setTodayRestingHr] = useState(48);
  const [todayHrv, setTodayHrv] = useState(85);

  useEffect(() => {
    const todayDoc = getLocalDaily(athleteId, todayStr);
    const historicalCount = getAllLocalDailies(athleteId).length;

    if (todayDoc) {
      setHasCheckedInToday(true);
      setTodaySleepDurationHours((todayDoc.sleep.durationMinutes / 60).toFixed(1));
      if (todayDoc.restingHeartRate) setTodayRestingHr(todayDoc.restingHeartRate);
      if (todayDoc.hrv?.rmssd) setTodayHrv(todayDoc.hrv.rmssd);

      const res = calculateReadiness({
        date: todayDoc.date,
        sleep: {
          durationMinutes: todayDoc.sleep.durationMinutes,
          qualityScore: todayDoc.sleep.qualityScore
        },
        wellness: {
          fatigue: todayDoc.subjective.fatigue || 2,
          soreness: todayDoc.subjective.soreness,
          stress: todayDoc.subjective.stress,
          mood: todayDoc.subjective.mood || 4,
          motivation: todayDoc.subjective.motivation || 4,
          illness: todayDoc.subjective.illness,
          soreAreas: todayDoc.subjective.soreAreas
        },
        biometrics: {
          hrvRmssd: todayDoc.hrv?.rmssd,
          restingHr: todayDoc.restingHeartRate,
          baselineHrvMean: 76,
          baselineHrvSd: 8,
          baselineRhrMean: 50
        },
        historicalDaysCount: historicalCount
      });
      setReadinessResult(res);
    } else {
      setHasCheckedInToday(false);
      // Neutral pre-checkin estimate
      const baselineRes = calculateReadiness({
        date: todayStr,
        sleep: { durationMinutes: 480, qualityScore: 4 },
        wellness: { fatigue: 2, soreness: 2, stress: 2, mood: 4, motivation: 4 },
        biometrics: { hrvRmssd: 82, restingHr: 48, baselineHrvMean: 80, baselineHrvSd: 7, baselineRhrMean: 50 },
        historicalDaysCount: historicalCount
      });
      setReadinessResult(baselineRes);
    }
  }, [athleteId, todayStr]);

  const handleAddWater = () => {
    setWaterLiters((prev) => +(prev + 0.25).toFixed(2));
    showToast({
      title: "+250 ml víz rögzítve",
      message: `Napi folyadékbevitel: ${+(waterLiters + 0.25).toFixed(2)} liter`,
      type: "success"
    });
  };

  const handleToggleWorkout = () => {
    const next = !workoutStarted;
    setWorkoutStarted(next);
    showToast({
      title: next ? (isHu ? "Edzés blokk elindítva" : "Session started") : (isHu ? "Edzés leállítva" : "Session stopped"),
      message: next ? (isHu ? "Pulzus és terheléskövetés aktív" : "Heart rate tracking active") : (isHu ? "Edzésnapló frissítve" : "Training log updated"),
      type: next ? "info" : "success"
    });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              {user?.sport || "Triatlon"}
            </Badge>
            <Badge variant="outline" size="sm">
              {user?.level || "Olimpiai keret"}
            </Badge>
            <SyncStatusBadge />
          </div>
          <h1 className="text-28 sm:text-40 font-bold tracking-tight text-text-primary">
            {t("today.greeting", "Üdvözlünk")}, {user?.displayName || "Sportoló"}
          </h1>
          <p className="text-14 text-text-secondary">
            {hasCheckedInToday
              ? (isHu ? "A mai reggeli check-in rögzítve" : "Today's morning check-in completed")
              : (isHu ? "Töltsd ki a mai check-int az edzés előtt" : "Complete today's check-in before training")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsLogModalOpen(true)}
          >
            {isHu ? "Edzés naplózása" : "Log session"}
          </Button>

          <Button
            variant="primary"
            leftIcon={<Activity className="h-4 w-4" />}
            onClick={() => navigate("/checkin")}
          >
            {hasCheckedInToday ? (isHu ? "Check-in megnyitása" : "View check-in") : t("today.quickCheckinBtn", "Napi Check-in")}
          </Button>
        </div>
      </div>

      {/* Check-in Reminder Banner if NOT checked in today */}
      {!hasCheckedInToday && (
        <Card variant="elevated" radius="20" className="p-4 border-brand/30 bg-brand/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/15 text-brand flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-14 font-bold text-text-primary">
                {isHu ? "A mai reggeli check-in még hiányzik!" : "Morning check-in is pending!"}
              </h3>
              <p className="text-12 text-text-secondary">
                {isHu
                  ? "Mindössze 30 másodperc: alvás, Hooper jóllét és izomláz rögzítése."
                  : "Under 30 seconds: log sleep, Hooper wellness, and muscle soreness."}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={() => navigate("/checkin")}
            className="shrink-0"
          >
            {isHu ? "Kitöltés (~30 mp)" : "Complete (~30s)"}
          </Button>
        </Card>
      )}

      {/* Adaptive Mode Notice Banners */}
      {isManualOnly && (
        <div className="flex items-center gap-3 p-3.5 rounded-16 border border-border-hairline bg-bg-surface text-12 text-text-secondary">
          <FileEdit className="h-4 w-4 text-brand shrink-0" />
          <span>{t("today.adaptiveManualNotice", "Kézi naplózási mód: az edzések és a check-in közvetlenül az űrlapokon rögzíthető.")}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLogModalOpen(true)}
            className="ml-auto text-12"
          >
            {t("training.logSession", "Manuális rögzítés")}
          </Button>
        </div>
      )}

      {/* Hero Readiness Overview Card */}
      <Card variant="surface" radius="28" className="p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <ProgressRing
              value={readinessResult?.score || 85}
              label={isHu ? "Regeneráció" : "Recovery"}
              unit=""
              size={130}
              strokeWidth={9}
              status={bandToStatus(readinessResult?.band)}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={bandToStatus(readinessResult?.band)} dot size="sm">
                  {readinessResult?.band === "green"
                    ? (isHu ? "KIVÁLÓ ÁLLAPOT (READY)" : "OPTIMAL READY")
                    : readinessResult?.band === "amber"
                      ? (isHu ? "MÉRSÉKELT (CAUTION)" : "MODERATE LOAD")
                      : (isHu ? "PIHENŐ (REST)" : "RECOVERY REQUIRED")}
                </Badge>
                <ConfidenceMeter confidence={readinessResult?.confidence || 90} size="sm" />
              </div>
              <h2 className="text-20 sm:text-24 font-bold tracking-tight text-text-primary">
                {readinessResult?.band === "green"
                  ? (isHu ? "Készen állsz a nagy intenzitású edzésre" : "Ready for High-Intensity Key Workout")
                  : (isHu ? "Mérsékelt terhelhetőség javasolt" : "Controlled Aerobic Load Recommended")}
              </h2>
              <p className="text-13 text-text-secondary max-w-lg leading-normal">
                {isHu ? readinessResult?.softMessageHu : readinessResult?.softMessageEn}
              </p>

              {/* Primary Driver Pill */}
              {readinessResult?.drivers && readinessResult.drivers[0] && (
                <div className="pt-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-8 text-11 font-medium border ${
                      readinessResult.drivers[0].impact === "positive"
                        ? "bg-status-ready/10 text-status-ready border-status-ready/20"
                        : "bg-status-rest/10 text-status-rest border-status-rest/20"
                    }`}
                  >
                    <span>{readinessResult.drivers[0].impact === "positive" ? "▲" : "▼"}</span>
                    <span>{isHu ? readinessResult.drivers[0].labelHu : readinessResult.drivers[0].labelEn}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-border-hairline pt-4 md:pt-0 md:pl-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/checkin")}
            >
              {isHu ? "Mérési részletek" : "Check-in Details"}
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => navigate("/insights")}
            >
              {isHu ? "Regeneráció Görbe" : "Recovery Curve"}
            </Button>
          </div>
        </div>
      </Card>

      {/* 4 Key Biometrics Cockpit Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label={t("today.hrvMetric", "HRV (rMSSD)")}
          value={todayHrv}
          unit="ms"
          status="ready"
          trend={{ direction: "up", value: "+4%", isGood: true }}
          subtext="28d átlag: 80 ms"
          topRight={<SourceBadge source="garmin" confidence={0.95} />}
        />
        <StatTile
          label={isHu ? "Nyugalmi pulzus" : "Resting HR"}
          value={todayRestingHr}
          unit="bpm"
          status="ready"
          trend={{ direction: "down", value: "-2 bpm", isGood: true }}
          subtext="Alvási min: 45 bpm"
          topRight={<SourceBadge source="garmin" confidence={0.95} />}
        />
        <StatTile
          label={t("today.sleepMetric", "Alvásidő")}
          value={todaySleepDurationHours}
          unit={isHu ? "óra" : "h"}
          status="ready"
          trend={{ direction: "up", value: "Cél: 8.0ó", isGood: true }}
          subtext={isHu ? "Kattints az elemzéshez" : "Click for sleep chart"}
          topRight={<ConfidenceMeter confidence={92} size="sm" />}
          onClick={() => navigate("/insights?tab=sleep")}
        />
        <StatTile
          label={t("nutrition.hydration", "Folyadékbevitel")}
          value={waterLiters}
          unit="/ 3.5 l"
          status="ready"
          subtext={`${Math.round((waterLiters / 3.5) * 100)}% cél elérve`}
          topRight={
            <button
              type="button"
              onClick={handleAddWater}
              className="rounded-8 bg-brand/10 px-2 py-0.5 text-12 font-bold text-brand hover:bg-brand/20 transition-colors"
            >
              +250ml
            </button>
          }
        />
      </div>

      {/* Today's Workout & Nutrition Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planned Session */}
        <Card variant="surface" radius="20" className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-brand" aria-hidden="true" />
                <h3 className="text-16 font-semibold tracking-tight text-text-primary">
                  {t("today.plannedSession", "Napi Fő Edzés")}
                </h3>
              </div>
              <Badge variant="neutral" size="sm">
                10:00 - 11:30
              </Badge>
            </div>

            <div className="rounded-16 border border-border-hairline bg-bg-elevated p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-14 font-bold text-text-primary">
                    5 x 400m Laktát-küszöb sorozat (Úszás)
                  </h4>
                  <p className="text-12 text-text-secondary mt-0.5">
                    Célterhelés: RPE 8.5 • Z4 pulzustartomány (168-175 bpm)
                  </p>
                </div>
                <Badge variant="caution" size="sm">
                  RPE 8.5
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-12 text-text-secondary pt-2 border-t border-border-hairline">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  90 perc
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-brand">
                  <Flame className="h-3.5 w-3.5" />
                  720 AU terhelés
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
              {workoutStarted ? (isHu ? "Edzés folyamatban (Kész)" : "Session running (Done)") : t("training.startSession", "Edzés indítása")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsLogModalOpen(true)}
            >
              {isHu ? "Kézi naplózás" : "Log session"}
            </Button>
          </div>
        </Card>

        {/* Nutrition Summary */}
        <Card variant="surface" radius="20" className="p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-brand" aria-hidden="true" />
                <h3 className="text-16 font-semibold tracking-tight text-text-primary">
                  {t("nutrition.title", "Táplálkozás")}
                </h3>
              </div>
              {plateBasedViewOnly ? (
                <Badge variant="brand" size="sm">
                  {t("nutrition.plateViewActive", "Tányéralapú nézet")}
                </Badge>
              ) : (
                <span className="text-14 font-bold text-text-primary tabular-nums">
                  2 850 / 3 450 kcal
                </span>
              )}
            </div>

            {plateBasedViewOnly ? (
              <div className="space-y-3">
                <p className="text-12 text-text-secondary">
                  {t("nutrition.plateRatio", "Tányérarányok (Fehérje : Szénhidrát : Zöldség)")}
                </p>
                <div className="flex h-3 w-full overflow-hidden rounded-full border border-border-hairline">
                  <div className="bg-brand h-full" style={{ width: "30%" }} title="Fehérje 30%" />
                  <div className="bg-status-ready h-full" style={{ width: "40%" }} title="Zöldség & Rost 40%" />
                  <div className="bg-status-caution h-full" style={{ width: "30%" }} title="Minőségi szénhidrát 30%" />
                </div>
                <div className="flex justify-between text-11 text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-brand" /> 30% Fehérje
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-status-ready" /> 40% Rost / Zöldség
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-status-caution" /> 30% Szénhidrát
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-12 text-text-secondary mb-1">
                    <span>{t("nutrition.protein", "Fehérje")}</span>
                    <span className="tabular-nums font-medium text-text-primary">155g / 185g (84%)</span>
                  </div>
                  <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand h-1.5 rounded-full" style={{ width: "84%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-12 text-text-secondary mb-1">
                    <span>{t("nutrition.carbs", "Szénhidrát")}</span>
                    <span className="tabular-nums font-medium text-text-primary">340g / 450g (75%)</span>
                  </div>
                  <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand h-1.5 rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-12 text-text-secondary mb-1">
                    <span>{t("nutrition.fats", "Zsír")}</span>
                    <span className="tabular-nums font-medium text-text-primary">58g / 75g (77%)</span>
                  </div>
                  <div className="w-full bg-border-hairline rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand h-1.5 rounded-full" style={{ width: "77%" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border-hairline">
            <span className="text-12 text-text-secondary">Dietetikus: Molnár Eszter</span>
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
      </div>

      {/* Manual Session Quick Modal */}
      <ManualSessionModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />
    </div>
  );
};

export default TodayPage;
