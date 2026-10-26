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
  Flame,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Info,
  Check
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
  const { isManualOnly } = useAppMode();
  const isHu = i18n.language.startsWith("hu");

  const athleteId = user?.uid || "demo-athlete-001";
  const todayStr = new Date().toISOString().split("T")[0] as string;

  const [waterLiters, setWaterLiters] = useState(2.75);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Check-in & Readiness state
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [readinessResult, setReadinessResult] = useState<ReadinessResult | null>(null);
  const [todaySleepDurationHours, setTodaySleepDurationHours] = useState("8.0");
  const [todayRestingHr, setTodayRestingHr] = useState(48);
  const [todayHrv, setTodayHrv] = useState(85);
  const [historicalDaysCount, setHistoricalDaysCount] = useState(0);

  // Workout adaptive suggestion state (when readiness is amber/red)
  const [suggestionState, setSuggestionState] = useState<"pending" | "applied" | "dismissed">("pending");

  // Mode resolution
  const userMode = user?.dataMode || "hybrid";
  const supportModes = user?.supportMode || ["solo"];
  const isSoloMode = supportModes.includes("solo");
  const isCoachMode = supportModes.includes("coach") || supportModes.includes("specialist");

  useEffect(() => {
    const todayDoc = getLocalDaily(athleteId, todayStr);
    const allDailies = getAllLocalDailies(athleteId);
    setHistoricalDaysCount(allDailies.length);

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
        historicalDaysCount: allDailies.length
      });
      setReadinessResult(res);
    } else {
      setHasCheckedInToday(false);
      // Realistic baseline readiness estimate
      const baselineRes = calculateReadiness({
        date: todayStr,
        sleep: { durationMinutes: 480, qualityScore: 4 },
        wellness: { fatigue: 2, soreness: 2, stress: 2, mood: 4, motivation: 4 },
        biometrics: { hrvRmssd: 82, restingHr: 48, baselineHrvMean: 80, baselineHrvSd: 7, baselineRhrMean: 50 },
        historicalDaysCount: allDailies.length
      });
      setReadinessResult(baselineRes);
    }
  }, [athleteId, todayStr]);

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

  // Plain language primary driver sentence
  const getDriverSentence = () => {
    if (!readinessResult) return "";
    const isReady = readinessResult.band === "green";
    const isCaution = readinessResult.band === "amber";

    if (readinessResult.drivers && readinessResult.drivers.length > 0) {
      const topDriver = readinessResult.drivers[0]!;
      const driverLabel = isHu ? topDriver.labelHu : topDriver.labelEn;
      if (topDriver.impact === "positive") {
        return isHu
          ? `A magas autonóm idegrendszeri nyugalmi állapot és a(z) ${driverLabel.toLowerCase()} optimálisan támogatja a mai kulcsterhelést.`
          : `High parasympathetic tone and ${driverLabel.toLowerCase()} strongly support high-intensity training today.`;
      } else {
        return isHu
          ? `A(z) ${driverLabel.toLowerCase()} mérsékli a regenerációt; kontrollált intenzitás vagy könnyebb volumen indokolt.`
          : `${driverLabel} is currently dampening recovery; controlled intensity or volume reduction is advised.`;
      }
    }

    if (isReady) {
      return isHu
        ? "Minden élettani mutató a személyes bázistartományban van, ideális nap a minőségi edzésmunkához."
        : "All biometrics are within your personal baseline zone; prime condition for key training.";
    } else if (isCaution) {
      return isHu
        ? "Mérsékelt idegrendszeri fáradtság érzékelhető, a szubmaximális aerob munka javasolt."
        : "Mild autonomic fatigue detected; submaximal aerobic load is recommended.";
    } else {
      return isHu
        ? "Jelentős fáradtság vagy izomfájdalom áll fenn; a mai napon az aktív regeneráció élvez elsőbbséget."
        : "Elevated physiological strain detected; active recovery or rest takes priority today.";
    }
  };

  return (
    <div className="space-y-6 pb-20">
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
              ? (isHu ? "A mai reggeli check-in rögzítve • Minden mutató friss" : "Morning check-in logged • All biometrics fresh")
              : (isHu ? "Töltsd ki a mai check-int az edzés előtt a pontos készenléthez" : "Complete today's check-in before training for accurate readiness")}
          </p>
        </div>

        {/* Quick Actions Header Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsLogModalOpen(true)}
          >
            {isHu ? "Edzés rögzítése" : "Log session"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Activity className="h-4 w-4" />}
            onClick={() => navigate("/checkin")}
          >
            {hasCheckedInToday ? (isHu ? "Check-in adatok" : "View check-in") : (isHu ? "Reggeli Check-in (~30 mp)" : "Daily Check-in (~30s)")}
          </Button>
        </div>
      </div>

      {/* First-Day Experience Banner if fresh user with 0 historical check-ins */}
      {historicalDaysCount === 0 && !hasCheckedInToday && (
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

      {isCoachMode && (
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

      {isSoloMode && !isCoachMode && (
        <div className="flex items-center gap-3 p-3.5 rounded-16 border border-border-hairline bg-surface text-12 text-text-secondary">
          <Sparkles className="h-4 w-4 text-brand shrink-0" />
          <span>
            {isHu
              ? "Solo adaptív generátor: A célversenyedig 11 hét van hátra. A mai cél: bázis állóképesség fenntartása."
              : "Solo plan engine: 11 weeks until A-race. Focus today: base aerobic stamina preservation."}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/training")}
            className="ml-auto text-11 h-7"
          >
            {isHu ? "Terv megnyitása" : "Open plan"}
          </Button>
        </div>
      )}

      {/* Hero Readiness Overview Card */}
      <Card variant="surface" radius="28" className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <ProgressRing
              value={readinessResult?.score || 85}
              label={isHu ? "Készenlét" : "Readiness"}
              unit=""
              size={135}
              strokeWidth={10}
              status={bandToStatus(readinessResult?.band)}
            />
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={bandToStatus(readinessResult?.band)} dot size="sm">
                  {readinessResult?.band === "green"
                    ? (isHu ? "KIVÁLÓ ÁLLAPOT (READY)" : "OPTIMAL READY")
                    : readinessResult?.band === "amber"
                      ? (isHu ? "MÉRSÉKELT (CAUTION)" : "MODERATE LOAD")
                      : (isHu ? "PIHENŐ (REST REQUIRED)" : "RECOVERY REQUIRED")}
                </Badge>
                <ConfidenceMeter confidence={readinessResult?.confidence || 90} size="sm" />
                {hasCheckedInToday && (
                  <span className="text-11 text-status-ready font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {isHu ? "Mai check-in alapján" : "From today's check-in"}
                  </span>
                )}
              </div>

              <h2 className="text-20 sm:text-24 font-bold tracking-tight text-text-primary">
                {readinessResult?.band === "green"
                  ? (isHu ? "Készen állsz a magas intenzitású kulcsedzésre" : "Ready for High-Intensity Key Training")
                  : readinessResult?.band === "amber"
                    ? (isHu ? "Mérsékelt terhelhetőség • Kontrollált aerob munka javasolt" : "Moderate Capacity • Controlled Aerobic Load")
                    : (isHu ? "Alacsony regeneráció • Aktív pihenés javasolt" : "Low Recovery • Active Rest Recommended")}
              </h2>

              {/* Plain-language explanation sentence for drivers */}
              <p className="text-13 text-text-secondary leading-relaxed pt-1">
                {getDriverSentence()}
              </p>

              {/* Driver pills */}
              {readinessResult?.drivers && readinessResult.drivers.length > 0 && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  {readinessResult.drivers.slice(0, 3).map((driver, idx) => (
                    <div
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-8 text-11 font-medium border ${
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
              )}
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-border-hairline pt-4 lg:pt-0 lg:pl-6">
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
          status={todayHrv >= 75 ? "ready" : todayHrv >= 60 ? "caution" : "rest"}
          trend={{ direction: "up", value: "+4%", isGood: true }}
          subtext="28d bázisátlag: 80 ms"
          topRight={<SourceBadge source={userMode === "manual" ? "manual" : "garmin"} confidence={0.95} />}
        />
        <StatTile
          label={isHu ? "Nyugalmi pulzus" : "Resting HR"}
          value={todayRestingHr}
          unit="bpm"
          status="ready"
          trend={{ direction: "down", value: "-2 bpm", isGood: true }}
          subtext="Alvási min: 45 bpm"
          topRight={<SourceBadge source={userMode === "manual" ? "manual" : "garmin"} confidence={0.95} />}
        />
        <StatTile
          label={t("today.sleepMetric", "Alvásidő")}
          value={todaySleepDurationHours}
          unit={isHu ? "óra" : "h"}
          status={+todaySleepDurationHours >= 7.5 ? "ready" : "caution"}
          trend={{ direction: "up", value: "Cél: 8.0ó", isGood: true }}
          subtext={isHu ? "Kattints az elemzéshez" : "Click for sleep chart"}
          topRight={<ConfidenceMeter confidence={92} size="sm" />}
          onClick={() => navigate("/insights?tab=sleep")}
        />
        <StatTile
          label={t("nutrition.hydration", "Folyadékbevitel")}
          value={waterLiters}
          unit="/ 3.5 l"
          status={waterLiters >= 3.0 ? "ready" : "caution"}
          subtext={`${Math.round((waterLiters / 3.5) * 100)}% cél elérve`}
          topRight={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleAddWater(250)}
                className="rounded-8 bg-brand/10 px-2 py-0.5 text-11 font-bold text-brand hover:bg-brand/20 transition-colors"
              >
                +250ml
              </button>
            </div>
          }
        />
      </div>

      {/* Today's Workout & Nutrition Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planned Workout Card */}
        <Card variant="surface" radius="20" className="p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
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

            {/* ADAPTIVE WORKOUT ADJUSTMENT SUGGESTION (if readiness is amber or red) */}
            {(readinessResult?.band === "amber" || readinessResult?.band === "red") &&
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
                            : (isHu ? "Apex Terhelési Javaslat (Mérsékelt Készenlét)" : "Apex Load Suggestion (Caution Readiness)")}
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
                      <p className="text-10 text-text-tertiary italic">
                        *Az Apex soha nem módosítja önhatalmúan az edzői tervet; a döntést a sportoló vagy az edző hagyja jóvá.
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

        {/* Nutrition & Fuel Card */}
        <Card variant="surface" radius="20" className="p-6 flex flex-col justify-between space-y-4">
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
                  <span>{t("nutrition.carbs", "Szénhidrát")} (5.5 g/kg - Kemény nap)</span>
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
            <span className="text-12 text-text-secondary">
              {isHu ? "Dietetikus által validálva: Molnár Eszter" : "Dietitian approved: Eszter Molnár"}
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
