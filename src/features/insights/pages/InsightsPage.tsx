import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  Card,
  StatTile,
  ProgressRing,
  ConfidenceMeter,
  SourceBadge,
  Badge,
  Button,
  SectionHeader,
  SegmentedControl,
  SyncStatusBadge,
  showToast
} from "@shared/ui";
import { useThemeStore } from "@shared/lib/theme/themeStore";
import {
  getLocalDaily,
  getAllLocalDailies,
  getLocalSleepTarget,
  saveLocalSleepTarget
} from "@shared/lib/offline/offlineStorage";
import {
  calculateReadiness,
  ReadinessResult,
  bandToStatus
} from "@shared/lib/readiness";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
  AreaChart,
  Area
} from "recharts";
import {
  Moon,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export const InsightsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const isHu = i18n.language.startsWith("hu");

  const athleteId = user?.uid || "demo-athlete-001";
  const todayStr = new Date().toISOString().split("T")[0] as string;

  // Active Tab: "recovery" (Overview) vs "sleep" (Sleep Analysis)
  const initialTab = searchParams.get("tab") === "sleep" ? "sleep" : "recovery";
  const [activeTab, setActiveTab] = useState<"recovery" | "sleep">(initialTab);

  // Time range selector for charts: 7D vs 30D
  const [sleepRange, setSleepRange] = useState<"7D" | "30D">("7D");

  // Editable Sleep Target
  const [targetSleepHours, setTargetSleepHours] = useState(8.0);

  // Today's Checkin & Readiness
  const [todayReadiness, setTodayReadiness] = useState<ReadinessResult | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [lastNightSleepMinutes, setLastNightSleepMinutes] = useState(450); // 7.5h
  const [lastNightSleepQuality, setLastNightSleepQuality] = useState(4);

  // Sync tab with URL
  const handleTabChange = (tab: "recovery" | "sleep") => {
    setActiveTab(tab);
    setSearchParams(tab === "sleep" ? { tab: "sleep" } : {});
  };

  useEffect(() => {
    // Load athlete sleep target
    const target = getLocalSleepTarget(athleteId);
    setTargetSleepHours(target);

    // Load today's checkin
    const todayDoc = getLocalDaily(athleteId, todayStr);
    const historicalCount = getAllLocalDailies(athleteId).length;

    if (todayDoc) {
      setHasCheckedInToday(true);
      setLastNightSleepMinutes(todayDoc.sleep.durationMinutes);
      setLastNightSleepQuality(todayDoc.sleep.qualityScore);

      const res = calculateReadiness({
        date: todayDoc.date,
        sleep: {
          durationMinutes: todayDoc.sleep.durationMinutes,
          qualityScore: todayDoc.sleep.qualityScore,
          targetMinutes: target * 60
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
      setTodayReadiness(res);
    } else {
      setHasCheckedInToday(false);
      // Fallback demo readiness calculation
      const demoRes = calculateReadiness({
        date: todayStr,
        sleep: {
          durationMinutes: 465,
          qualityScore: 4,
          targetMinutes: target * 60
        },
        wellness: {
          fatigue: 2,
          soreness: 2,
          stress: 2,
          mood: 4,
          motivation: 4
        },
        biometrics: {
          hrvRmssd: 82,
          restingHr: 49,
          baselineHrvMean: 78,
          baselineHrvSd: 7,
          baselineRhrMean: 50
        },
        historicalDaysCount: 16
      });
      setTodayReadiness(demoRes);
    }
  }, [athleteId, todayStr]);

  const handleUpdateSleepTarget = (newTarget: number) => {
    const clamped = Math.max(5.0, Math.min(11.0, parseFloat(newTarget.toFixed(1))));
    setTargetSleepHours(clamped);
    saveLocalSleepTarget(athleteId, clamped);
    showToast({
      title: isHu ? "Alváscél frissítve" : "Sleep target updated",
      message: `${clamped} ${isHu ? "óra / éjszaka" : "hours / night"}`,
      type: "info"
    });
  };

  // 14-day simulated historical readiness trend data
  const readinessHistoryData = [
    { day: "10-13", score: 84, confidence: 90, hrv: 80, rhr: 48, status: "ready" },
    { day: "10-14", score: 88, confidence: 95, hrv: 85, rhr: 47, status: "ready" },
    { day: "10-15", score: 92, confidence: 95, hrv: 88, rhr: 47, status: "ready" },
    { day: "10-16", score: 76, confidence: 85, hrv: 74, rhr: 51, status: "ready" },
    { day: "10-17", score: 62, confidence: 90, hrv: 68, rhr: 54, status: "caution" },
    { day: "10-18", score: 58, confidence: 85, hrv: 65, rhr: 55, status: "caution" },
    { day: "10-19", score: 72, confidence: 90, hrv: 75, rhr: 50, status: "ready" },
    { day: "10-20", score: 86, confidence: 95, hrv: 82, rhr: 48, status: "ready" },
    { day: "10-21", score: 90, confidence: 95, hrv: 84, rhr: 48, status: "ready" },
    { day: "10-22", score: 68, confidence: 90, hrv: 72, rhr: 52, status: "ready" },
    { day: "10-23", score: 54, confidence: 85, hrv: 64, rhr: 56, status: "caution" },
    { day: "10-24", score: 65, confidence: 90, hrv: 70, rhr: 51, status: "caution" },
    { day: "10-25", score: 78, confidence: 95, hrv: 79, rhr: 49, status: "ready" },
    { day: "Ma", score: todayReadiness?.score || 85, confidence: todayReadiness?.confidence || 90, hrv: 82, rhr: 49, status: todayReadiness?.band || "ready" }
  ];

  // 7-day and 30-day sleep history data
  const sleep7dData = [
    { day: isHu ? "Kedd" : "Tue", hours: 7.8, quality: 4, date: "10-20" },
    { day: isHu ? "Szerda" : "Wed", hours: 8.2, quality: 5, date: "10-21" },
    { day: isHu ? "Csütörtök" : "Thu", hours: 6.5, quality: 3, date: "10-22" },
    { day: isHu ? "Péntek" : "Fri", hours: 6.2, quality: 2, date: "10-23" },
    { day: isHu ? "Szombat" : "Sat", hours: 8.5, quality: 5, date: "10-24" },
    { day: isHu ? "Vasárnap" : "Sun", hours: 8.0, quality: 4, date: "10-25" },
    { day: isHu ? "Ma" : "Today", hours: +(lastNightSleepMinutes / 60).toFixed(1), quality: lastNightSleepQuality, date: todayStr }
  ];

  // Calculate 7-day sleep debt: sum of deficits vs target
  const sevenDayDeficitMinutes = sleep7dData.reduce((acc, curr) => {
    const deficitHours = Math.max(0, targetSleepHours - curr.hours);
    return acc + deficitHours * 60;
  }, 0);

  const sleepDebtHours = Math.floor(sevenDayDeficitMinutes / 60);
  const sleepDebtRemMinutes = Math.round(sevenDayDeficitMinutes % 60);

  // Theme colors for charts
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const textColor = isDark ? "#9AA1AD" : "#5B6270";
  const tooltipBg = isDark ? "#14161B" : "#FFFFFF";
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Tab Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title={isHu ? "Regeneráció & Alváselemzés" : "Recovery & Sleep Analysis"}
          description={
            isHu
              ? "Autonóm idegrendszeri készenlét, alváshiány és élettani adaptáció."
              : "Autonomic nervous system readiness, sleep debt, and physiological trends."
          }
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <SyncStatusBadge />
          <div className="w-56">
            <SegmentedControl
              options={[
                { value: "recovery", label: isHu ? "Regeneráció" : "Recovery" },
                { value: "sleep", label: isHu ? "Alvás" : "Sleep" }
              ]}
              value={activeTab}
              onChange={(val) => handleTabChange(val as "recovery" | "sleep")}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* VIEW A: RECOVERY OVERVIEW */}
      {activeTab === "recovery" && (
        <div className="space-y-6">
          {/* Main Cockpit Banner Card */}
          <Card
            variant="elevated"
            radius="20"
            className={`p-6 border transition-all ${
              todayReadiness?.band === "green"
                ? "border-status-ready/30 bg-status-ready/5"
                : todayReadiness?.band === "amber"
                  ? "border-status-caution/30 bg-status-caution/5"
                  : "border-status-rest/30 bg-status-rest/5"
            }`}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Readiness Progress Ring */}
              <div className="flex items-center gap-6">
                <ProgressRing
                  value={todayReadiness?.score || 85}
                  size={120}
                  strokeWidth={10}
                  label="Index"
                  unit=""
                  status={bandToStatus(todayReadiness?.band)}
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={bandToStatus(todayReadiness?.band)} dot size="sm">
                      {todayReadiness?.band === "green"
                        ? isHu ? "OPTIMÁLIS KÉSZENLÉT" : "OPTIMAL READY"
                        : todayReadiness?.band === "amber"
                          ? isHu ? "MÉRSÉKELT TERHELHETŐSÉG" : "MODERATE LOAD"
                          : isHu ? "REGENERÁCIÓ SZÜKSÉGES" : "REST REQUIRED"}
                    </Badge>
                    <ConfidenceMeter confidence={todayReadiness?.confidence || 90} size="sm" />
                  </div>

                  <h2 className="text-24 font-bold text-text-primary tracking-tight">
                    {todayReadiness?.score || 85}/100 {isHu ? "Készenléti szint" : "Readiness Score"}
                  </h2>

                  <p className="text-12 text-text-secondary max-w-md">
                    {isHu ? todayReadiness?.softMessageHu : todayReadiness?.softMessageEn}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                {!hasCheckedInToday ? (
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => navigate("/checkin")}
                  >
                    {isHu ? "Reggeli check-in kitöltése" : "Complete Daily Check-in"}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="h-4 w-4 text-status-ready" />}
                    onClick={() => navigate("/checkin")}
                  >
                    {isHu ? "Check-in megtekintése" : "View Check-in"}
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTabChange("sleep")}
                >
                  {isHu ? "Alváselemzés megnyitása" : "Open Sleep Analysis"}
                </Button>
              </div>
            </div>

            {/* Cold Start Calibration Progress Banner */}
            {todayReadiness?.isCalibrating && (
              <div className="mt-5 p-3 rounded-12 bg-bg-surface border border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-3 text-12">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Sparkles className="h-4 w-4 text-brand shrink-0" />
                  <span>
                    <strong>{isHu ? "Személyes bázis kalibrálás:" : "Baseline Calibration:"}</strong>{" "}
                    {todayReadiness.calibrationProgress.daysCollected}/
                    {todayReadiness.calibrationProgress.daysRequired} {isHu ? "nap rögzítve" : "days logged"}
                  </span>
                </div>
                <div className="w-full sm:w-40 h-2 rounded-full bg-border-hairline overflow-hidden">
                  <div
                    className="h-full bg-brand transition-all duration-300"
                    style={{ width: `${todayReadiness.calibrationProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Top 3 Drivers Pill List */}
            {todayReadiness?.drivers && todayReadiness.drivers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border-hairline/80">
                <span className="text-11 font-bold uppercase tracking-wider text-text-tertiary block mb-2">
                  {isHu ? "Vezető élettani tényezők (Top 3 Drivers)" : "Primary Recovery Drivers"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {todayReadiness.drivers.map((driver) => (
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
            )}
          </Card>

          {/* 3 Metric Tiles (ACWR, Weekly Load, HRV) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatTile
              label="ACWR (Akut : Krónikus Terhelés)"
              value="1.14"
              status="ready"
              trend={{ direction: "up", value: "0.8 - 1.3 optimális", isGood: true }}
              subtext={isHu ? "Kiváló adaptáció, alacsony sérülési kockázat" : "Optimal adaptation, low injury risk"}
            />
            <StatTile
              label={isHu ? "Heti terhelési volumen" : "Weekly Training Load"}
              value="840"
              unit="AU"
              status="neutral"
              trend={{ direction: "up", value: "+5.2%", isGood: true }}
              subtext={isHu ? "Foster módszer (Perc × RPE)" : "Foster session-RPE method"}
            />
            <StatTile
              label="HRV 28-napos átlag"
              value="81"
              unit="ms"
              status="ready"
              trend={{ direction: "up", value: "+3 ms a bázishoz", isGood: true }}
              subtext={isHu ? "Vegetatív tónus stabil" : "Autonomic tone balanced"}
            />
          </div>

          {/* 14-Day Readiness & Confidence Trend Area Chart */}
          <Card variant="surface" radius="20" className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-16 font-bold text-text-primary">
                  {isHu ? "14 napos Készenléti Trend & Konfidencia Sáv" : "14-Day Readiness & Confidence Trend"}
                </h3>
                <p className="text-12 text-text-secondary">
                  {isHu
                    ? "Zöld vonal: Készenléti index (0-100) | Zöld >= 67, Borostyán 34-66, Piros < 34"
                    : "Green curve: Readiness index (0-100) | Band cutoffs at 67 and 34"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="ready" size="sm">Zöld: Kész</Badge>
                <Badge variant="caution" size="sm">Sárga: Óvatosan</Badge>
                <Badge variant="rest" size="sm">Piros: Pihenő</Badge>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={readinessHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="readinessGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#34D399" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="day" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis domain={[20, 100]} stroke={textColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isDark ? "#F5F6F8" : "#0B0C0F"
                    }}
                    formatter={(val: number) => [`${val} pont`, "Készenlét"]}
                  />
                  <ReferenceLine y={67} stroke="#34D399" strokeDasharray="4 4" label={{ value: "Ready (67)", fill: "#34D399", fontSize: 10, position: "insideTopLeft" }} />
                  <ReferenceLine y={34} stroke="#FBBF24" strokeDasharray="4 4" label={{ value: "Caution (34)", fill: "#FBBF24", fontSize: 10, position: "insideTopLeft" }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#34D399"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#readinessGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW B: SLEEP ANALYSIS SCREEN */}
      {activeTab === "sleep" && (
        <div className="space-y-6">
          {/* Last Night & Sleep Debt Cockpit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Last Night Card */}
            <Card variant="surface" radius="20" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-brand" />
                  <h3 className="text-16 font-bold text-text-primary">
                    {isHu ? "Múlt éjszakai alvás" : "Last Night's Sleep"}
                  </h3>
                </div>
                <SourceBadge source="garmin" confidence={0.92} />
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-36 sm:text-40 font-bold font-mono text-text-primary tracking-tight tabular-nums">
                  {(lastNightSleepMinutes / 60).toFixed(1)}
                </span>
                <span className="text-16 text-text-secondary font-medium">
                  {isHu ? "óra" : "hours"} ({lastNightSleepMinutes} {isHu ? "perc" : "min"})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-12 bg-bg-elevated border border-border-hairline">
                  <span className="text-11 font-medium text-text-secondary block">
                    {isHu ? "Minőség értékelés" : "Quality score"}
                  </span>
                  <span className="text-16 font-bold text-text-primary mt-0.5 block">
                    {lastNightSleepQuality} / 5 ⭐
                  </span>
                </div>

                <div className="p-3 rounded-12 bg-bg-elevated border border-border-hairline">
                  <span className="text-11 font-medium text-text-secondary block">
                    {isHu ? "Lefekvés - Ébredés" : "Bed - Wake"}
                  </span>
                  <span className="text-14 font-mono font-bold text-text-primary mt-0.5 block">
                    23:00 - 06:30
                  </span>
                </div>
              </div>
            </Card>

            {/* Sleep Target & Sleep Debt Card */}
            <Card variant="surface" radius="20" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-status-caution" />
                  <h3 className="text-16 font-bold text-text-primary">
                    {isHu ? "Alváscél & Halmozott Adósság" : "Sleep Target & Debt"}
                  </h3>
                </div>
                <Badge
                  variant={sevenDayDeficitMinutes > 180 ? "rest" : sevenDayDeficitMinutes > 60 ? "caution" : "ready"}
                  size="sm"
                >
                  {sevenDayDeficitMinutes === 0
                    ? isHu ? "Nincs deficit" : "Zero Debt"
                    : `${sleepDebtHours}ó ${sleepDebtRemMinutes}p ${isHu ? "adósság" : "debt"}`}
                </Badge>
              </div>

              {/* Editable Sleep Target Stepper */}
              <div className="p-3.5 rounded-16 bg-bg-elevated border border-border-hairline flex items-center justify-between">
                <div>
                  <span className="text-12 font-bold text-text-primary block">
                    {isHu ? "Egyéni alváscélod" : "Your Sleep Target"}
                  </span>
                  <span className="text-11 text-text-secondary">
                    {isHu ? "Szerkeszthető egyéni referencia" : "Editable athlete baseline"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateSleepTarget(targetSleepHours - 0.5)}
                    className="h-8 w-8 rounded-8 bg-bg-surface border border-border-hairline flex items-center justify-center text-text-primary hover:bg-border-hairline font-bold"
                  >
                    -
                  </button>
                  <span className="text-16 font-mono font-bold text-brand tabular-nums px-1">
                    {targetSleepHours.toFixed(1)} ó
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateSleepTarget(targetSleepHours + 0.5)}
                    className="h-8 w-8 rounded-8 bg-bg-surface border border-border-hairline flex items-center justify-center text-text-primary hover:bg-border-hairline font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Sleep Debt Summary Message */}
              <div className="text-12 text-text-secondary leading-relaxed">
                {sevenDayDeficitMinutes > 120 ? (
                  <p className="text-status-rest font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {isHu
                        ? `Figyelem: az elmúlt 7 napban ${sleepDebtHours} óra ${sleepDebtRemMinutes} perc alvásadósság halmozódott fel.`
                        : `Alert: ${sleepDebtHours}h ${sleepDebtRemMinutes}m sleep debt accumulated over the last 7 days.`}
                    </span>
                  </p>
                ) : (
                  <p className="text-status-ready font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      {isHu
                        ? "Alvásidőd egyensúlyban van a kitűzött célértékkel."
                        : "Your sleep volume is well-balanced with your personal target."}
                    </span>
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* 7-Day & 30-Day Sleep Trend Chart with Reference Line */}
          <Card variant="surface" radius="20" className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-16 font-bold text-text-primary">
                  {isHu ? "Alvásmennyiség Trend & Célvonal" : "Sleep Duration Trend vs Target"}
                </h3>
                <p className="text-12 text-text-secondary">
                  {isHu
                    ? `Szürke szaggatott vonal: kitűzött cél (${targetSleepHours} óra)`
                    : `Reference dashed line: sleep target (${targetSleepHours}h)`}
                </p>
              </div>

              <div className="inline-flex rounded-10 bg-bg-elevated p-1 border border-border-hairline">
                <button
                  type="button"
                  onClick={() => setSleepRange("7D")}
                  className={`px-3 py-1 text-12 font-medium rounded-8 transition-colors ${
                    sleepRange === "7D" ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary"
                  }`}
                >
                  7 {isHu ? "nap" : "days"}
                </button>
                <button
                  type="button"
                  onClick={() => setSleepRange("30D")}
                  className={`px-3 py-1 text-12 font-medium rounded-8 transition-colors ${
                    sleepRange === "30D" ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary"
                  }`}
                >
                  30 {isHu ? "nap" : "days"}
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sleep7dData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="day" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis domain={[4, 11]} stroke={textColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isDark ? "#F5F6F8" : "#0B0C0F"
                    }}
                    formatter={(val: number) => [`${val} óra`, "Alvás"]}
                  />
                  <ReferenceLine
                    y={targetSleepHours}
                    stroke="#3D7BFF"
                    strokeDasharray="4 4"
                    label={{
                      value: `Cél: ${targetSleepHours}ó`,
                      fill: "#3D7BFF",
                      fontSize: 11,
                      position: "insideTopRight"
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    radius={[8, 8, 0, 0]}
                    fill="#3D7BFF"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
