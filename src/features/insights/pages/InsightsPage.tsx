import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StatTile,
  ChartFrame,
  SectionHeader,
  Badge
} from "@shared/ui";
import { useThemeStore } from "@shared/lib/theme/themeStore";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";

const workloadData = [
  { day: "Hét", acute: 110, chronic: 105, acwr: 1.05 },
  { day: "Kedd", acute: 130, chronic: 110, acwr: 1.18 },
  { day: "Szer", acute: 85, chronic: 108, acwr: 0.79 },
  { day: "Csüt", acute: 140, chronic: 112, acwr: 1.25 },
  { day: "Pén", acute: 125, chronic: 114, acwr: 1.10 },
  { day: "Szom", acute: 155, chronic: 118, acwr: 1.31 },
  { day: "Vas", acute: 60, chronic: 115, acwr: 0.52 }
];

const readinessData = [
  { day: "Hét", score: 88 },
  { day: "Kedd", score: 82 },
  { day: "Szer", score: 94 },
  { day: "Csüt", score: 79 },
  { day: "Pén", score: 85 },
  { day: "Szom", score: 76 },
  { day: "Vas", score: 92 }
];

export const InsightsPage: React.FC = () => {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const [timeRange, setTimeRange] = useState("7D");

  const isDark = resolvedTheme === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const textColor = isDark ? "#9AA1AD" : "#5B6270";
  const tooltipBg = isDark ? "#14161B" : "#FFFFFF";
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title={t("insights.title")}
        description={t("insights.subtitle")}
        badge={<Badge variant="ready" dot>ACWR: 1.12 (Optimális)</Badge>}
      />

      {/* 3 Cockpit Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTile
          label={t("insights.acwr")}
          value="1.12"
          status="ready"
          trend={{ direction: "up", value: "0.8 - 1.3 között", isGood: true }}
          subtext="Optimális adaptációs zóna"
        />

        <StatTile
          label={t("insights.weeklyLoad")}
          value="805"
          unit="TSS"
          status="neutral"
          trend={{ direction: "up", value: "+4.5%", isGood: true }}
          subtext="Előző hét: 770 TSS"
        />

        <StatTile
          label="Sérüléskockázat"
          value="Alacsony"
          status="ready"
          trend={{ direction: "neutral", value: "Biztonságos" }}
          subtext="Progresszív heti terhelésnövekedés"
        />
      </div>

      {/* Recharts Workload & Readiness Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartFrame
          title="Akut Terhelés vs. Krónikus Bázis (TSS)"
          subtitle="7 napos fáradtság összevetése a 28 napos fitnesz bázissal"
          timeRanges={["7D", "14D", "28D", "YTD"]}
          selectedRange={timeRange}
          onRangeChange={setTimeRange}
          legend={
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-status-ready" /> Akut
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-brand" /> Krónikus
              </span>
            </div>
          }
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" stroke={textColor} fontSize={12} />
                <YAxis stroke={textColor} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: isDark ? "#F5F6F8" : "#0B0C0F",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 20px -2px rgba(0,0,0,0.15)"
                  }}
                />
                <Bar dataKey="acute" fill="#34D399" radius={[6, 6, 0, 0]} name="Akut terhelés" />
                <Bar dataKey="chronic" fill="#3D7BFF" radius={[6, 6, 0, 0]} name="Krónikus bázis" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title={t("insights.readinessTrend")}
          subtitle="Napi regenerációs index ingadozása a hét során"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readinessData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" stroke={textColor} fontSize={12} />
                <YAxis domain={[50, 100]} stroke={textColor} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: isDark ? "#F5F6F8" : "#0B0C0F",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 20px -2px rgba(0,0,0,0.15)"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  dot={{ fill: "#34D399", r: 4 }}
                  name="Regenerációs pont"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>
    </div>
  );
};

export default InsightsPage;
