import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("insights.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("insights.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* ACWR Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("insights.acwr")}
            </span>
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">1.12</span>
            <span className="text-xs text-emerald-300 font-bold">Optimális</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">{t("insights.acwrOptimal")}</p>
        </div>

        <div className="rounded-2xl border border-brand-muted bg-brand-card p-5 shadow-lg">
          <div className="flex items-center justify-between text-blue-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("insights.weeklyLoad")}
            </span>
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">805</span>
            <span className="text-xs text-slate-400">TSS (7 nap)</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">+4.5% az előző heti bázishoz képest</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 shadow-lg">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sérüléskockázat
            </span>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300">Alacsony</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Progresszív adaptációs fázis</p>
        </div>
      </div>

      {/* Workload & ACWR Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
            Akut Terhelés vs. Krónikus Bázis (TSS)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121826",
                    borderColor: "#1f293d",
                    color: "#f8fafc",
                    borderRadius: "0.5rem"
                  }}
                />
                <Bar dataKey="acute" fill="#22c55e" radius={[4, 4, 0, 0]} name="Akut terhelés" />
                <Bar dataKey="chronic" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Krónikus bázis" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
            {t("insights.readinessTrend")}
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readinessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121826",
                    borderColor: "#1f293d",
                    color: "#f8fafc",
                    borderRadius: "0.5rem"
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4ade80"
                  strokeWidth={3}
                  dot={{ fill: "#22c55e", r: 4 }}
                  name="Regenerációs pont"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;
