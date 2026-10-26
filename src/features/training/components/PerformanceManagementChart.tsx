import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend
} from "recharts";
import { Card, Button, BottomSheet } from "@shared/ui";
import { PMCDataPoint, LoadAnalyticsSummary } from "@shared/types/training";
import { PMC_METRIC_EXPLANATIONS } from "@shared/lib/load/loadCalculator";
import {
  TrendingUp,
  Activity,
  Zap,
  Info,
  AlertTriangle
} from "lucide-react";

interface PerformanceManagementChartProps {
  data: PMCDataPoint[];
  summary: LoadAnalyticsSummary;
  todayStr: string;
}

export const PerformanceManagementChart: React.FC<PerformanceManagementChartProps> = ({
  data,
  summary,
  todayStr
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language.startsWith("hu");

  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [filterRange, setFilterRange] = useState<"4w" | "8w" | "all">("8w");

  // Filter data based on selected range
  const filteredData = React.useMemo(() => {
    if (filterRange === "4w") {
      // 14 days past + 14 days future
      const todayIdx = data.findIndex((d) => d.date === todayStr);
      if (todayIdx === -1) return data.slice(-28);
      const start = Math.max(0, todayIdx - 14);
      const end = Math.min(data.length, todayIdx + 15);
      return data.slice(start, end);
    }
    if (filterRange === "8w") {
      // 28 days past + 28 days future
      const todayIdx = data.findIndex((d) => d.date === todayStr);
      if (todayIdx === -1) return data.slice(-56);
      const start = Math.max(0, todayIdx - 28);
      const end = Math.min(data.length, todayIdx + 29);
      return data.slice(start, end);
    }
    return data;
  }, [data, filterRange, todayStr]);

  // TSB freshness status
  const getTsbStatus = (tsb: number) => {
    if (tsb > 15) {
      return {
        label: isHu ? "Nagyon pihent / Friss" : "Very Fresh",
        status: "ready" as const,
        color: "text-emerald-400"
      };
    }
    if (tsb >= -10 && tsb <= 15) {
      return {
        label: isHu ? "Optimális versenyforma" : "Optimal Race Form",
        status: "ready" as const,
        color: "text-emerald-400"
      };
    }
    if (tsb >= -30 && tsb < -10) {
      return {
        label: isHu ? "Produktív edzésfázis" : "Productive Training",
        status: "caution" as const,
        color: "text-amber-400"
      };
    }
    return {
      label: isHu ? "Magas fáradtság / Túlterhelés" : "High Fatigue / Risk",
      status: "rest" as const,
      color: "text-rose-400"
    };
  };

  const tsbStatus = getTsbStatus(summary.todayTsb);

  // ACWR status
  const getAcwrStatus = (acwr: number) => {
    if (acwr >= 0.8 && acwr <= 1.3) {
      return {
        label: isHu ? "Sweet spot (0.8 - 1.3)" : "Sweet spot",
        badgeStatus: "ready" as const,
        safe: true
      };
    }
    if (acwr > 1.5) {
      return {
        label: isHu ? "Veszélyes ugrás (>1.5)" : "High Hazard (>1.5)",
        badgeStatus: "rest" as const,
        safe: false
      };
    }
    return {
      label: isHu ? "Óvatos zóna" : "Caution zone",
      badgeStatus: "caution" as const,
      safe: false
    };
  };

  const acwrStatus = getAcwrStatus(summary.acwr);

  // Custom Recharts Tooltip
  const CustomTooltip = ({
    active,
    payload
  }: {
    active?: boolean;
    payload?: Array<{ payload: PMCDataPoint }>;
  }) => {
    if (active && payload && payload.length && payload[0]) {
      const d: PMCDataPoint = payload[0].payload;
      return (
        <div className="bg-[#1C1F26] border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-semibold text-white">
            <span>{d.date}</span>
            {d.isProjected && (
              <span className="text-[10px] text-brand-400 font-mono uppercase bg-brand-500/10 px-1.5 py-0.5 rounded">
                {isHu ? "Tervezett" : "Planned"}
              </span>
            )}
          </div>
          {d.race && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-1 rounded text-[11px] font-medium">
              🏁 {d.race.title} ({d.race.priority}-verseny)
            </div>
          )}
          {d.phase && (
            <div className="text-[11px] text-text-secondary">
              {isHu ? "Fázis:" : "Phase:"} <span className="text-white font-medium">{d.phase.name}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px]">
            <span className="text-blue-400 font-medium">
              {isHu ? "CTL (Fittség):" : "CTL (Fitness):"}
            </span>
            <span className="text-right font-mono font-bold text-white">{d.ctl}</span>

            <span className="text-rose-400 font-medium">
              {isHu ? "ATL (Fáradtság):" : "ATL (Fatigue):"}
            </span>
            <span className="text-right font-mono font-bold text-white">{d.atl}</span>

            <span className="text-emerald-400 font-medium">
              {isHu ? "TSB (Forma):" : "TSB (Form):"}
            </span>
            <span className="text-right font-mono font-bold text-white">
              {d.tsb > 0 ? `+${d.tsb}` : d.tsb}
            </span>

            <span className="text-text-secondary">
              {isHu ? "Napi terhelés:" : "Daily Load:"}
            </span>
            <span className="text-right font-mono text-white">{d.dayLoad} TSS</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 sm:p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white">
              {isHu ? "Teljesítmény-menedzsment (PMC)" : "Performance Management (PMC)"}
            </h2>
            <button
              onClick={() => setIsExplainerOpen(true)}
              aria-label={isHu ? "Tudnivalók a mutatószámokról" : "Learn about metrics"}
              className="p-1 text-text-secondary hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <Info className="w-4 h-4 text-brand-400" />
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {isHu
              ? "Bannister & Coggan impulzus-válasz terhelési modell: Fittség (42 nap), Fáradtság (7 nap) és Forma."
              : "Bannister & Coggan impulse-response load model: Fitness (42d), Fatigue (7d), and Form."}
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center bg-[#0B0C0F] p-1 rounded-xl border border-white/5 self-start sm:self-auto text-xs">
          <button
            onClick={() => setFilterRange("4w")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterRange === "4w"
                ? "bg-brand-500 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            4 {isHu ? "hét" : "wks"}
          </button>
          <button
            onClick={() => setFilterRange("8w")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterRange === "8w"
                ? "bg-brand-500 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            8 {isHu ? "hét" : "wks"}
          </button>
          <button
            onClick={() => setFilterRange("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterRange === "all"
                ? "bg-brand-500 text-white shadow"
                : "text-text-secondary hover:text-white"
            }`}
          >
            {isHu ? "Teljes szezon" : "Full Season"}
          </button>
        </div>
      </div>

      {/* Metrics Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* CTL / Fitness */}
        <div className="bg-[#0B0C0F] border border-white/5 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>{isHu ? "Fittség (CTL)" : "Fitness (CTL)"}</span>
            <div className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">
            {summary.todayCtl}
          </div>
          <div className="text-[11px] text-text-secondary mt-1">
            42 {isHu ? "napos terhelés" : "day baseline"}
          </div>
        </div>

        {/* ATL / Fatigue */}
        <div className="bg-[#0B0C0F] border border-white/5 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>{isHu ? "Fáradtság (ATL)" : "Fatigue (ATL)"}</span>
            <div className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
            {summary.todayAtl}
          </div>
          <div className="text-[11px] text-text-secondary mt-1">
            7 {isHu ? "napos terhelés" : "day load"}
          </div>
        </div>

        {/* TSB / Form */}
        <div className="bg-[#0B0C0F] border border-white/5 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>{isHu ? "Forma (TSB)" : "Form (TSB)"}</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              summary.todayTsb >= 0 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {summary.todayTsb > 0 ? `+${summary.todayTsb}` : summary.todayTsb}
          </div>
          <div className="text-[10px] truncate font-medium text-text-secondary mt-1">
            {tsbStatus.label}
          </div>
        </div>

        {/* Ramp Rate */}
        <div className="bg-[#0B0C0F] border border-white/5 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>{isHu ? "Heti ugrás" : "Ramp Rate"}</span>
            <Activity className="w-3.5 h-3.5 text-text-secondary" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">
            {summary.weeklyRampRate > 0 ? `+${summary.weeklyRampRate}` : summary.weeklyRampRate}
          </div>
          <div className="text-[11px] text-text-secondary mt-1">
            {summary.weeklyRampRate > 8 ? (
              <span className="text-amber-400">{isHu ? "Gyors emelkedés" : "High ramp"}</span>
            ) : (
              <span className="text-emerald-400">{isHu ? "Biztonságos ütem" : "Optimal rate"}</span>
            )}
          </div>
        </div>

        {/* ACWR */}
        <div className="bg-[#0B0C0F] border border-white/5 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>ACWR</span>
            <Zap className="w-3.5 h-3.5 text-text-secondary" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">
            {summary.acwr}
          </div>
          <div className="text-[10px] truncate font-medium mt-1">
            <span className={acwrStatus.safe ? "text-emerald-400" : "text-amber-400"}>
              {acwrStatus.label}
            </span>
          </div>
        </div>

        {/* Monotony */}
        <div className="bg-[#0B0C0F] border border-white/5 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span>{isHu ? "Monotónia" : "Monotony"}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-text-secondary" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-white">
            {summary.monotony}
          </div>
          <div className="text-[11px] text-text-secondary mt-1">
            {summary.monotony < 2.0 ? (
              <span className="text-emerald-400">{isHu ? "Jó variabilitás" : "Good variance"}</span>
            ) : (
              <span className="text-rose-400">{isHu ? "Monoton terhelés" : "High risk"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="dayLabel"
              stroke="#9AA1AD"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />
            <YAxis
              yAxisId="left"
              stroke="#9AA1AD"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              domain={[0, "dataMax + 20"]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9AA1AD"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[-40, 40]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: "12px", fontSize: "11px" }}
            />

            {/* Zero Form Line */}
            <ReferenceLine yAxisId="right" y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />

            {/* Daily Load Bars */}
            <Bar
              yAxisId="left"
              dataKey="dayLoad"
              name={isHu ? "Napi terhelés" : "Daily Load"}
              fill="#3D7BFF"
              opacity={0.25}
              radius={[3, 3, 0, 0]}
            />

            {/* CTL (Fitness) Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ctl"
              name={isHu ? "Fittség (CTL)" : "Fitness (CTL)"}
              stroke="#3D7BFF"
              strokeWidth={2.5}
              dot={false}
            />

            {/* ATL (Fatigue) Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="atl"
              name={isHu ? "Fáradtság (ATL)" : "Fatigue (ATL)"}
              stroke="#F87171"
              strokeWidth={2}
              dot={false}
            />

            {/* TSB (Form) Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="tsb"
              name={isHu ? "Forma (TSB)" : "Form (TSB)"}
              stroke="#34D399"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explainer BottomSheet */}
      <BottomSheet
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        title={isHu ? "Hogyan működik a terhelés-elemzés?" : "How Load Analytics Works"}
      >
        <div className="space-y-5 text-sm p-2">
          {/* CTL */}
          <div className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h3 className="font-semibold text-white">
                {isHu ? PMC_METRIC_EXPLANATIONS.ctl.titleHu : PMC_METRIC_EXPLANATIONS.ctl.titleEn}
              </h3>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              {isHu ? PMC_METRIC_EXPLANATIONS.ctl.descHu : PMC_METRIC_EXPLANATIONS.ctl.descEn}
            </p>
          </div>

          {/* ATL */}
          <div className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-semibold text-white">
                {isHu ? PMC_METRIC_EXPLANATIONS.atl.titleHu : PMC_METRIC_EXPLANATIONS.atl.titleEn}
              </h3>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              {isHu ? PMC_METRIC_EXPLANATIONS.atl.descHu : PMC_METRIC_EXPLANATIONS.atl.descEn}
            </p>
          </div>

          {/* TSB */}
          <div className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-white">
                {isHu ? PMC_METRIC_EXPLANATIONS.tsb.titleHu : PMC_METRIC_EXPLANATIONS.tsb.titleEn}
              </h3>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              {isHu ? PMC_METRIC_EXPLANATIONS.tsb.descHu : PMC_METRIC_EXPLANATIONS.tsb.descEn}
            </p>
            <div className="mt-2 bg-[#0B0C0F] p-3 rounded-xl border border-white/5 space-y-1 text-xs">
              <div className="text-emerald-400">
                • <strong>+10 és +25 között:</strong> {isHu ? "Csúcsforma versenyre (Peak race freshness)" : "Peak race form"}
              </div>
              <div className="text-amber-400">
                • <strong>-10 és -30 között:</strong> {isHu ? "Optimális edzésadaptációs zóna (Productive training)" : "Productive training zone"}
              </div>
              <div className="text-rose-400">
                • <strong>-30 alatt:</strong> {isHu ? "Túledzettség és sérülés veszélye (Excess fatigue)" : "Overreaching / injury hazard"}
              </div>
            </div>
          </div>

          {/* ACWR */}
          <div className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-white">
                {isHu ? PMC_METRIC_EXPLANATIONS.acwr.titleHu : PMC_METRIC_EXPLANATIONS.acwr.titleEn}
              </h3>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              {isHu ? PMC_METRIC_EXPLANATIONS.acwr.descHu : PMC_METRIC_EXPLANATIONS.acwr.descEn}
            </p>
          </div>

          {/* Monotony */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="font-semibold text-white">
                {isHu ? PMC_METRIC_EXPLANATIONS.monotony.titleHu : PMC_METRIC_EXPLANATIONS.monotony.titleEn}
              </h3>
            </div>
            <p className="text-text-secondary text-xs leading-relaxed">
              {isHu ? PMC_METRIC_EXPLANATIONS.monotony.descHu : PMC_METRIC_EXPLANATIONS.monotony.descEn}
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsExplainerOpen(false)}
            className="w-full mt-4"
          >
            {isHu ? "Értem, bezárás" : "Got it, close"}
          </Button>
        </div>
      </BottomSheet>
    </Card>
  );
};
