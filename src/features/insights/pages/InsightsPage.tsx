import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  Card,
  Button,
  StatTile,
  Badge,
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
  ReadinessResult
} from "@shared/lib/readiness";
import {
  generateWeeklyReview
} from "@shared/lib/insights/weeklyReviewEngine";
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
  Area,
  LineChart,
  Line,
  ScatterChart,
  Scatter
} from "recharts";
import {
  Clock,
  Sparkles,
  CheckCircle2,
  Trophy,
  Flame,
  Dumbbell,
  Scale,
  TrendingUp,
  Target
} from "lucide-react";
import { RecoveryActivitiesView } from "@features/recovery/components/RecoveryActivitiesView";

export const InsightsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const isHu = i18n.language.startsWith("hu");
  const navigate = useNavigate();
  const [historicalCount, setHistoricalCount] = useState(0);
  const athleteId = user?.uid || "demo-athlete-001";
  const todayStr = new Date().toISOString().split("T")[0] as string;

  // Tabs: "weekly" (Heti összegzés) | "recovery" (Regeneráció & Alvás) | "correlations" (Korrelációk) | "tests" (Tesztek & Rekordok) | "goals" (Célverseny A)
  type TabKey = "weekly" | "recovery" | "correlations" | "tests" | "goals";
  const urlTab = searchParams.get("tab") as TabKey | null;
  const initialTab: TabKey = urlTab && ["weekly", "recovery", "correlations", "tests", "goals"].includes(urlTab)
    ? urlTab
    : "weekly";

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Editable Sleep Target
  const [targetSleepHours, setTargetSleepHours] = useState(8.0);

  // Today's Checkin & Readiness
  const [todayReadiness, setTodayReadiness] = useState<ReadinessResult | null>(null);
  const [lastNightSleepMinutes, setLastNightSleepMinutes] = useState(450); // 7.5h
  const [lastNightSleepQuality, setLastNightSleepQuality] = useState(4);

  // Sync tab with URL
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams(tab === "weekly" ? {} : { tab });
  };

  useEffect(() => {
    // Load athlete sleep target
    const target = getLocalSleepTarget(athleteId);
    setTargetSleepHours(target);

    // Load today's checkin
    const todayDoc = getLocalDaily(athleteId, todayStr);
    const count = getAllLocalDailies(athleteId).length;
    setHistoricalCount(count);

    if (todayDoc) {
      setLastNightSleepMinutes(todayDoc.sleep.durationMinutes);
      setLastNightSleepQuality(todayDoc.sleep.qualityScore);

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
        historicalDaysCount: count
      });
      setTodayReadiness(res);
    } else {
      if (import.meta.env.PROD || athleteId !== "demo-athlete-001") {
        setTodayReadiness(null);
      } else {
        const demoRes = calculateReadiness({
          date: todayStr,
          sleep: { durationMinutes: 480, qualityScore: 4 },
          wellness: { fatigue: 2, soreness: 2, stress: 2, mood: 4, motivation: 4 },
          biometrics: { hrvRmssd: 82, restingHr: 48, baselineHrvMean: 80, baselineHrvSd: 7, baselineRhrMean: 50 },
          historicalDaysCount: count
        });
        setTodayReadiness(demoRes);
      }
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

  // Rule-based Weekly Review generation
  const weeklyReview = generateWeeklyReview({
    weekStartDate: "2026-10-19",
    currentWeekLoadAu: 2450,
    previousWeekLoadAu: 2100,
    averageSleepHours: 7.8,
    sleepTargetHours: targetSleepHours,
    readinessCounts: { green: 5, amber: 2, red: 0 },
    nutritionDaysAdherent: 6,
    nutritionTotalDays: 7,
    workoutsPlanned: 6,
    workoutsCompleted: 6,
    averageHrvMs: 82,
    baselineHrvMs: 78
  });

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

  // 7-day sleep history data
  const sleep7dData = [
    { day: isHu ? "Kedd" : "Tue", hours: 7.8, quality: 4, date: "10-20" },
    { day: isHu ? "Szerda" : "Wed", hours: 8.2, quality: 5, date: "10-21" },
    { day: isHu ? "Csütörtök" : "Thu", hours: 6.5, quality: 3, date: "10-22" },
    { day: isHu ? "Péntek" : "Fri", hours: 6.2, quality: 2, date: "10-23" },
    { day: isHu ? "Szombat" : "Sat", hours: 8.5, quality: 5, date: "10-24" },
    { day: isHu ? "Vasárnap" : "Sun", hours: 8.0, quality: 4, date: "10-25" },
    { day: isHu ? "Ma" : "Today", hours: +(lastNightSleepMinutes / 60).toFixed(1), quality: lastNightSleepQuality, date: todayStr }
  ];

  // Correlation: Sleep vs Next-Day Readiness
  const sleepVsReadinessData = [
    { sleepHours: 6.0, readiness: 52, label: "Péntek" },
    { sleepHours: 6.4, readiness: 58, label: "Csüt" },
    { sleepHours: 7.0, readiness: 68, label: "Hétfő" },
    { sleepHours: 7.5, readiness: 74, label: "Kedd" },
    { sleepHours: 7.8, readiness: 82, label: "Vasárnap" },
    { sleepHours: 8.2, readiness: 89, label: "Szombat" },
    { sleepHours: 8.5, readiness: 93, label: "Szerda" }
  ];

  // Correlation: Training Load (AU) vs Next-Day Soreness (1-5)
  const loadVsSorenessData = [
    { day: "H", load: 350, soreness: 1.5 },
    { day: "K", load: 720, soreness: 2.0 },
    { day: "Sze", load: 250, soreness: 3.8 }, // DOMS lag
    { day: "Cs", load: 600, soreness: 2.2 },
    { day: "P", load: 150, soreness: 3.5 },
    { day: "Szo", load: 850, soreness: 2.0 },
    { day: "V", load: 0, soreness: 3.9 }
  ];

  // Body Composition 90-day progress data
  const bodyCompData = [
    { date: "Aug 01", weightKg: 74.2, fatPercent: 12.1, muscleKg: 60.5 },
    { date: "Aug 15", weightKg: 73.8, fatPercent: 11.8, muscleKg: 60.7 },
    { date: "Szep 01", weightKg: 73.2, fatPercent: 11.4, muscleKg: 60.9 },
    { date: "Szep 15", weightKg: 72.8, fatPercent: 11.0, muscleKg: 61.1 },
    { date: "Okt 01", weightKg: 72.5, fatPercent: 10.7, muscleKg: 61.3 },
    { date: "Okt 15", weightKg: 72.2, fatPercent: 10.4, muscleKg: 61.5 }
  ];

  // Theme colors for charts
  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const textColor = isDark ? "#9AA1AD" : "#5B6270";
  const tooltipBg = isDark ? "#14161B" : "#FFFFFF";
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <SectionHeader
          title={isHu ? "Élettani Elemzések & Betekintések" : "Physiological Insights & Trends"}
          description={
            isHu
              ? "Automatikus heti összegző, korrelációk, mérési csúcsok és célverseny visszaszámláló."
              : "Rule-based weekly reviews, correlations, performance records, and A-race timeline."
          }
        />
        <div className="flex items-center gap-2 self-start lg:self-auto overflow-x-auto max-w-full pb-1">
          <SyncStatusBadge />
          <div className="w-full sm:w-auto">
            <SegmentedControl
              options={[
                { value: "weekly", label: isHu ? "Heti Összegző" : "Weekly Review" },
                { value: "recovery", label: isHu ? "Regeneráció & Alvás" : "Recovery & Sleep" },
                { value: "correlations", label: isHu ? "Korrelációk" : "Correlations" },
                { value: "tests", label: isHu ? "Tesztek & Csúcsok" : "Tests & Records" },
                { value: "goals", label: isHu ? "Célverseny (A)" : "A-Race" }
              ]}
              value={activeTab}
              onChange={(val) => handleTabChange(val as TabKey)}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WEEKLY REVIEW (Rule-based Textual Synthesis) */}
      {/* ========================================================================= */}
      {activeTab === "weekly" && (
        historicalCount === 0 && (import.meta.env.PROD || athleteId !== "demo-athlete-001") ? (
          <Card variant="surface" radius="20" className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-20 bg-brand/10 text-brand">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-18 font-bold text-text-primary">
                {isHu ? "Még nincs adat a heti összegzéshez" : "No data for weekly review yet"}
              </h3>
              <p className="text-13 text-text-secondary leading-relaxed">
                {isHu
                  ? "Kezdd az első napi check-in kitöltésével és edzésnaplózással, hogy a rendszer automatikusan elkészíthesse az élettani értékelésedet."
                  : "Log your first daily check-in and training session to generate your automated weekly review."}
              </p>
            </div>
            <div className="pt-2">
              <Button variant="primary" size="sm" onClick={() => navigate("/checkin")}>
                {isHu ? "Első check-in rögzítése" : "Log first check-in"}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Hero Rule-Based Synthesis Card */}
            <Card variant="surface" radius="20" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-12 bg-brand/15 text-brand flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-18 font-bold text-text-primary">
                      {isHu ? "Automatikus Heti Élettani Értékelés" : "Automated Weekly Review"}
                    </h3>
                    <span className="text-12 text-text-secondary font-mono">
                      2026. október 19. - 25. • 42. Hét
                    </span>
                  </div>
                </div>
                <Badge variant="brand" size="sm">
                  Rule-Based Engine v1.0
                </Badge>
              </div>

              {/* Synthesized Text Paragraph */}
              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline text-14 leading-relaxed text-text-secondary space-y-3">
                <p className="text-text-primary font-medium">
                  {isHu ? weeklyReview.summaryHu : weeklyReview.summaryEn}
                </p>
              </div>

              {/* Highlights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {(isHu ? weeklyReview.keyHighlightsHu : weeklyReview.keyHighlightsEn).map(
                  (highlight, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-3 rounded-12 bg-surface border border-border-hairline text-12 font-medium text-text-primary"
                    >
                      <CheckCircle2 className="h-4 w-4 text-status-ready shrink-0" />
                      <span>{highlight}</span>
                    </div>
                  )
                )}
              </div>
            </Card>

            {/* 4 Quantitative Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                label={isHu ? "Heti Összterhelés" : "Weekly Load"}
                value="2 450"
                unit="AU"
                status="ready"
                trend={{ direction: "up", value: `+${weeklyReview.loadChangePercent}%`, isGood: weeklyReview.isLoadSafe }}
                subtext="Előző hét: 2 100 AU"
              />
              <StatTile
                label={isHu ? "Átlagos Alvás" : "Average Sleep"}
                value="7.8"
                unit="h"
                status="ready"
                trend={{ direction: "up", value: "Cél: 8.0h", isGood: true }}
                subtext={`Alvásadósság: ${weeklyReview.sleepDebtHours} óra`}
              />
              <StatTile
                label={isHu ? "Edzésterv Megfelelés" : "Compliance"}
                value={`${weeklyReview.compliancePercent}%`}
                unit=""
                status="ready"
                subtext="6/6 elvégzett edzés"
              />
              <StatTile
                label={isHu ? "Makró Megfelelés" : "Nutrition Adherence"}
                value={`${weeklyReview.nutritionAdherencePercent}%`}
                unit=""
                status="ready"
                subtext="6/7 sikeres nap"
              />
            </div>

            {/* Readiness Distribution Bar Card */}
            <Card variant="surface" radius="20" className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-14 font-bold text-text-primary">
                  {isHu ? "Heti Készenléti Megoszlás (7 nap)" : "Weekly Readiness Distribution"}
                </h4>
                <span className="text-12 font-mono text-text-secondary">
                  {weeklyReview.readinessGreenPercent}% Ready nap
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-border-hairline">
                <div className="bg-status-ready h-full" style={{ width: "71%" }} title="Ready (5 nap)" />
                <div className="bg-status-caution h-full" style={{ width: "29%" }} title="Caution (2 nap)" />
                <div className="bg-status-rest h-full" style={{ width: "0%" }} title="Rest (0 nap)" />
              </div>
              <div className="flex justify-between text-11 text-text-tertiary">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-status-ready" /> 5 nap Kész (71%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-status-caution" /> 2 nap Mérsékelt (29%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-status-rest" /> 0 nap Pihenő (0%)
                </span>
              </div>
            </Card>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECOVERY & SLEEP (Existing In-Depth Biometrics) */}
      {/* ========================================================================= */}
      {activeTab === "recovery" && (
        <div className="space-y-6">
          {/* 14-Day Readiness Historical Curve */}
          <Card variant="surface" radius="20" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-16 font-bold text-text-primary">
                  {isHu ? "14 Napos Készenléti Trend" : "14-Day Readiness Curve"}
                </h3>
                <p className="text-12 text-text-secondary">
                  {isHu ? "Autonóm idegrendszeri regeneráció (HRV + Nyugalmi pulzus)" : "Autonomic nervous system recovery"}
                </p>
              </div>
              <Badge variant="brand" size="sm">
                14 napos mozgóátlag
              </Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={readinessHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3D7BFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3D7BFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="day" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis domain={[40, 100]} stroke={textColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isDark ? "#F5F6F8" : "#0B0C0F"
                    }}
                  />
                  <ReferenceLine y={70} stroke="#34D399" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="#FBBF24" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#3D7BFF"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#readinessGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 7-Day & 30-Day Sleep Duration vs Target */}
          <Card variant="surface" radius="20" className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-16 font-bold text-text-primary">
                  {isHu ? "Alvásmennyiség vs Célvonal" : "Sleep Duration vs Target"}
                </h3>
                <p className="text-12 text-text-secondary">
                  {isHu
                    ? `Kitűzött egyéni cél: ${targetSleepHours} óra / éjszaka`
                    : `Personal target: ${targetSleepHours}h / night`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="11"
                  value={targetSleepHours}
                  onChange={(e) => handleUpdateSleepTarget(parseFloat(e.target.value) || 8)}
                  className="w-16 rounded-8 bg-surface-elevated px-2 py-1 text-12 text-center text-text-primary border border-border-hairline"
                />
                <span className="text-12 text-text-secondary">óra cél</span>
              </div>
            </div>

            <div className="h-60 w-full">
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
                  />
                  <ReferenceLine
                    y={targetSleepHours}
                    stroke="#3D7BFF"
                    strokeDasharray="4 4"
                    label={{ value: `Cél ${targetSleepHours}h`, fill: "#3D7BFF", fontSize: 11 }}
                  />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]} fill="#3D7BFF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recovery Activities & Protocols */}
          <Card variant="surface" radius="20" className="p-6">
            <RecoveryActivitiesView athleteId={athleteId} />
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CORRELATIONS (Sleep vs Readiness, Load vs Soreness) */}
      {/* ========================================================================= */}
      {activeTab === "correlations" && (
        <div className="space-y-6">
          {/* Correlation Chart 1: Sleep Duration vs Next-Day Readiness */}
          <Card variant="surface" radius="20" className="p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-16 font-bold text-text-primary flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-brand" />
                  <span>{isHu ? "Alvásmennyiség vs Másnapi Készenlét" : "Sleep Duration vs Next-Day Readiness"}</span>
                </h3>
                <p className="text-12 text-text-secondary">
                  {isHu
                    ? "Erős pozitív összefüggés (r = 0.78): minden +1 óra minőségi alvás átlagosan +9 ponttal emeli a készenlétet."
                    : "Strong positive correlation (r = 0.78): each +1h sleep increases readiness by +9 points on average."}
                </p>
              </div>
              <Badge variant="ready" size="sm">
                r = 0.78 (Erős)
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    type="number"
                    dataKey="sleepHours"
                    name="Alvásidő"
                    unit="h"
                    domain={[5.5, 9.0]}
                    stroke={textColor}
                    fontSize={11}
                  />
                  <YAxis
                    type="number"
                    dataKey="readiness"
                    name="Készenlét"
                    unit=" pt"
                    domain={[40, 100]}
                    stroke={textColor}
                    fontSize={11}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isDark ? "#F5F6F8" : "#0B0C0F"
                    }}
                  />
                  <Scatter name="Napok" data={sleepVsReadinessData} fill="#3D7BFF" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="p-3 rounded-12 bg-surface-elevated border border-border-hairline text-12 text-text-secondary flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <span>
                {isHu
                  ? "Személyes élettani tanács: 7.5 óra alvás felett a készenléted 100%-ban a zöld Ready zónában tartózkodott. Törekedj a 22:30 előtti lámpaoltásra."
                  : "Physiological insight: Above 7.5h sleep, your readiness stayed in the green Ready zone 100% of the time."}
              </span>
            </div>
          </Card>

          {/* Correlation Chart 2: Daily Load (AU) vs Next-Day Soreness */}
          <Card variant="surface" radius="20" className="p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-16 font-bold text-text-primary flex items-center gap-2">
                  <Flame className="h-5 w-5 text-status-caution" />
                  <span>{isHu ? "Napi Terhelés (AU) vs Izomláz Késleltetés" : "Training Load (AU) vs Delayed Muscle Soreness"}</span>
                </h3>
                <p className="text-12 text-text-secondary">
                  {isHu
                    ? "A kemény laktát-küszöb edzések izomláz-csúcsa 24-48 órás késleltetéssel (DOMS) jelentkezik."
                    : "High threshold volume exhibits classic 24-48h delayed onset muscle soreness (DOMS)."}
                </p>
              </div>
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={loadVsSorenessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="day" stroke={textColor} fontSize={11} />
                  <YAxis yAxisId="left" domain={[0, 1000]} stroke={textColor} fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 5]} stroke={textColor} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isDark ? "#F5F6F8" : "#0B0C0F"
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="load" stroke="#3D7BFF" strokeWidth={2} name="Terhelés (AU)" />
                  <Line yAxisId="right" type="monotone" dataKey="soreness" stroke="#F87171" strokeWidth={2} name="Izomláz (1-5)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TESTS & RECORDS (VO2max, Thresholds, Strength, Body Comp) */}
      {/* ========================================================================= */}
      {activeTab === "tests" && (
        <div className="space-y-6">
          {/* Aerobic & Threshold Records */}
          <Card variant="surface" radius="20" className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand" />
              <h3 className="text-16 font-bold text-text-primary">
                {isHu ? "Aerob & Küszöb Értékek" : "Aerobic & Threshold Records"}
              </h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-1">
                <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">VO2max</span>
                <div className="text-24 font-bold text-text-primary font-mono">62.4</div>
                <span className="text-11 text-text-tertiary">ml/kg/perc • Nemzeti szint</span>
              </div>

              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-1">
                <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">FTP (Kerékpár)</span>
                <div className="text-24 font-bold text-text-primary font-mono">310 W</div>
                <span className="text-11 text-text-tertiary">4.3 W/kg • 2026. okt. teszt</span>
              </div>

              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-1">
                <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">LTHR (Küszöbpulzus)</span>
                <div className="text-24 font-bold text-text-primary font-mono">172 bpm</div>
                <span className="text-11 text-text-tertiary">Max pulzus: 191 bpm</span>
              </div>

              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-1">
                <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">CSS (Úszó Küszöb)</span>
                <div className="text-24 font-bold text-text-primary font-mono">1:22</div>
                <span className="text-11 text-text-tertiary">/100m • 400m/200m teszt</span>
              </div>
            </div>
          </Card>

          {/* Neuromuscular & Strength Tests */}
          <Card variant="surface" radius="20" className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-brand" />
              <h3 className="text-16 font-bold text-text-primary">
                {isHu ? "Erőnléti & Neuromuszkuláris Tesztek" : "Strength & Neuromuscular Benchmarks"}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-1">
                <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">CMJ Felugrás</span>
                <div className="text-24 font-bold text-text-primary font-mono">44.5 cm</div>
                <span className="text-11 text-status-ready font-medium">+2.1 cm fejlődés</span>
              </div>

              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-1">
                <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">Trap Bar Felhúzás 1RM</span>
                <div className="text-24 font-bold text-text-primary font-mono">165 kg</div>
                <span className="text-11 text-text-tertiary">2.28x testsúly</span>
              </div>

              <div className="p-4 rounded-16 bg-surface-elevated border border-border-hairline space-y-1">
                <span className="text-11 text-text-secondary uppercase tracking-wider font-semibold">Guggolás 1RM</span>
                <div className="text-24 font-bold text-text-primary font-mono">135 kg</div>
                <span className="text-11 text-text-tertiary">1.87x testsúly</span>
              </div>
            </div>
          </Card>

          {/* Body Composition Trend Chart */}
          <Card variant="surface" radius="20" className="p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-16 font-bold text-text-primary flex items-center gap-2">
                  <Scale className="h-5 w-5 text-brand" />
                  <span>{isHu ? "Testösszetétel 90 Napos Trendje" : "Body Composition 90-Day Trend"}</span>
                </h3>
                <p className="text-12 text-text-secondary">
                  {isHu
                    ? "Fokozatos testzsírcsökkenés (12.1% → 10.4%) párhuzamos izomtömeg-gyarapodással (+1.0 kg)."
                    : "Lean recomposition: fat dropped to 10.4% with lean muscle gain (+1.0 kg)."}
                </p>
              </div>
              <Badge variant="ready" size="sm">
                Versenyforma
              </Badge>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bodyCompData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" stroke={textColor} fontSize={11} />
                  <YAxis yAxisId="kg" domain={[70, 76]} stroke={textColor} fontSize={11} unit="kg" />
                  <YAxis yAxisId="fat" orientation="right" domain={[8, 14]} stroke={textColor} fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isDark ? "#F5F6F8" : "#0B0C0F"
                    }}
                  />
                  <Line yAxisId="kg" type="monotone" dataKey="weightKg" stroke="#3D7BFF" strokeWidth={2.5} name="Testsúly (kg)" />
                  <Line yAxisId="fat" type="monotone" dataKey="fatPercent" stroke="#FBBF24" strokeWidth={2} name="Testzsír %" />
                  <Line yAxisId="kg" type="monotone" dataKey="muscleKg" stroke="#34D399" strokeWidth={2} strokeDasharray="4 4" name="Izomtömeg (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: A-RACE & GOALS (Countdown & Milestones) */}
      {/* ========================================================================= */}
      {activeTab === "goals" && (
        <div className="space-y-6">
          {/* Target A-Race Banner */}
          {user?.targetCompetition ? (
            <Card
              variant="elevated"
              radius="20"
              className="p-6 sm:p-8 bg-gradient-to-r from-brand/15 via-surface to-surface border border-brand/30 space-y-4"
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {isHu ? "KIEMELT CÉLVERSENY" : "TARGET A-RACE"}
                    </Badge>
                    {user.targetCompetitionDate && (
                      <span className="text-12 text-text-secondary">{user.targetCompetitionDate}</span>
                    )}
                  </div>
                  <h3 className="text-22 sm:text-28 font-bold text-text-primary mt-1">
                    {user.targetCompetition}
                  </h3>
                  {user.goals && (
                    <p className="text-13 text-text-secondary mt-0.5">
                      {user.goals}
                    </p>
                  )}
                </div>

                {user.targetCompetitionDate && (
                  <div className="flex items-center gap-2 sm:gap-3 bg-surface-elevated/90 border border-border-hairline p-3 sm:p-4 rounded-16 shadow-inner">
                    <div className="text-center">
                      <div className="text-28 sm:text-36 font-bold text-brand font-mono leading-none">
                        {Math.max(0, Math.ceil((new Date(user.targetCompetitionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                      </div>
                      <span className="text-10 text-text-tertiary uppercase font-semibold">
                        {isHu ? "Nap" : "Days"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card
              variant="surface"
              radius="20"
              className="p-6 border border-border-hairline flex items-center justify-between gap-4 flex-wrap"
            >
              <div>
                <span className="text-11 uppercase tracking-wider font-semibold text-text-tertiary block">
                  {isHu ? "Célverseny & Periodizáció" : "Target Race & Periodization"}
                </span>
                <h3 className="text-16 font-bold text-text-primary mt-0.5">
                  {isHu ? "Még nincs célversenyed kitűzve" : "No target race set yet"}
                </h3>
                <p className="text-12 text-text-secondary mt-1">
                  {isHu
                    ? "Add meg a fő megmérettetésed a profilodban vagy az edzés naptárban a visszaszámlálóhoz."
                    : "Add your main competition in your profile to track progression."}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/profile")}
              >
                {isHu ? "Célverseny megadása" : "Set target race"}
              </Button>
            </Card>
          )}

          {/* Key Milestones Checklist */}
          <Card variant="surface" radius="20" className="p-6 space-y-3">
            <h4 className="text-14 font-bold text-text-primary flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              <span>{isHu ? "Kiemelt Felkészülési Mérföldkövek" : "Key Preparation Milestones"}</span>
            </h4>

            <div className="divide-y divide-border-hairline">
              <div className="py-3 flex items-center justify-between text-13">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-status-ready" />
                  <div>
                    <span className="font-medium text-text-primary">Laktát-küszöb laboratóriumi kontrollteszt</span>
                    <span className="block text-11 text-text-secondary">Teljesítve: 310W FTP, 172 bpm LTHR</span>
                  </div>
                </div>
                <Badge variant="ready" size="sm">Kész</Badge>
              </div>

              <div className="py-3 flex items-center justify-between text-13">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-brand" />
                  <div>
                    <span className="font-medium text-text-primary">Versenyszimulációs kemény hétvége (B-verseny)</span>
                    <span className="block text-11 text-text-secondary">Ütemezve: 4 hét múlva</span>
                  </div>
                </div>
                <Badge variant="brand" size="sm">Következő</Badge>
              </div>

              <div className="py-3 flex items-center justify-between text-13">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-border-hairline" />
                  <div>
                    <span className="font-medium text-text-primary">Tapering volumen-csökkentés indítása (-40% volumen, int. fenntartva)</span>
                    <span className="block text-11 text-text-secondary">Ütemezve: A-verseny előtt 14 nappal</span>
                  </div>
                </div>
                <Badge variant="outline" size="sm">Tervezett</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
