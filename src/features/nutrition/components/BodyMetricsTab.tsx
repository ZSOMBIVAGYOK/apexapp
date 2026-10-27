import React, { useState } from "react";
import { Card, Button, BottomSheet, NumberInput, showToast } from "@shared/ui";
import {
  calculateSmoothedBodyMetrics,
  calculateWeeklyWeightChangeRate
} from "@shared/lib/nutrition";
import { BodyMetricEntry } from "@shared/types/nutrition";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { Plus, TrendingDown, TrendingUp, Minus, Info, Scale } from "lucide-react";


const INITIAL_BODY_METRICS: BodyMetricEntry[] = [
  { id: "bm_1", athleteId: "a1", date: "2026-10-12", weightKg: 72.8, bodyFatPct: 12.8, source: "manual" },
  { id: "bm_2", athleteId: "a1", date: "2026-10-13", weightKg: 73.1, bodyFatPct: 12.8, source: "manual" },
  { id: "bm_3", athleteId: "a1", date: "2026-10-14", weightKg: 72.9, bodyFatPct: 12.7, source: "manual" },
  { id: "bm_4", athleteId: "a1", date: "2026-10-15", weightKg: 72.6, bodyFatPct: 12.6, source: "manual" },
  { id: "bm_5", athleteId: "a1", date: "2026-10-16", weightKg: 73.4, bodyFatPct: 12.7, source: "manual" }, // Water/sodium spike
  { id: "bm_6", athleteId: "a1", date: "2026-10-17", weightKg: 72.5, bodyFatPct: 12.5, source: "manual" },
  { id: "bm_7", athleteId: "a1", date: "2026-10-18", weightKg: 72.3, bodyFatPct: 12.5, source: "manual" },
  { id: "bm_8", athleteId: "a1", date: "2026-10-19", weightKg: 72.4, bodyFatPct: 12.4, source: "manual" },
  { id: "bm_9", athleteId: "a1", date: "2026-10-20", weightKg: 72.2, bodyFatPct: 12.4, source: "manual" },
  { id: "bm_10", athleteId: "a1", date: "2026-10-21", weightKg: 72.0, bodyFatPct: 12.3, source: "manual" },
  { id: "bm_11", athleteId: "a1", date: "2026-10-22", weightKg: 72.5, bodyFatPct: 12.3, source: "manual" },
  { id: "bm_12", athleteId: "a1", date: "2026-10-23", weightKg: 71.9, bodyFatPct: 12.2, source: "manual" },
  { id: "bm_13", athleteId: "a1", date: "2026-10-24", weightKg: 71.8, bodyFatPct: 12.1, source: "manual" },
  { id: "bm_14", athleteId: "a1", date: "2026-10-25", weightKg: 71.9, bodyFatPct: 12.1, source: "manual" },
  { id: "bm_15", athleteId: "a1", date: "2026-10-26", weightKg: 71.7, bodyFatPct: 12.0, source: "manual" }
];

export const BodyMetricsTab: React.FC = () => {
  const [entries, setEntries] = useState<BodyMetricEntry[]>(() => {
    if (import.meta.env.PROD) return [];
    return INITIAL_BODY_METRICS;
  });
  const [showLogModal, setShowLogModal] = useState(false);

  // Form state
  const [newWeight, setNewWeight] = useState(70);
  const [newBodyFat, setNewBodyFat] = useState<number | undefined>(undefined);
  const [newWaist, setNewWaist] = useState<number | undefined>(undefined);

  const smoothedPoints = calculateSmoothedBodyMetrics(entries);
  const changeRate = calculateWeeklyWeightChangeRate(smoothedPoints);
  const latest = smoothedPoints[smoothedPoints.length - 1];

  const handleLogMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;

    const todayStr = new Date().toISOString().split("T")[0]!;
    const newEntry: BodyMetricEntry = {
      id: `bm_${Date.now()}`,
      athleteId: "a1",
      date: todayStr,
      weightKg: newWeight,
      bodyFatPct: newBodyFat,
      waistCm: newWaist,
      source: "manual"
    };

    setEntries([...entries, newEntry]);
    setShowLogModal(false);
    showToast({
      title: "Mérés rögzítve",
      message: `${newWeight} kg (7 napos átlag frissítve)`,
      type: "success"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-16 font-bold text-text-primary">
            Testösszetétel & 7 napos simított trend
          </h3>
          <p className="text-12 text-text-secondary">
            A napi súlyingadozást (glikogén és folyadék) kisimítva a valós szöveti változást mutatja.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowLogModal(true)}
        >
          Új mérés
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="surface" radius="20" className="p-5">
          <span className="text-11 text-text-secondary font-medium uppercase tracking-wider block">
            Jelenlegi simított testtömeg
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-28 font-bold text-text-primary tabular-nums">
              {latest ? (latest.smoothedWeightKg ?? latest.weightKg) : "—"}
            </span>
            {latest && <span className="text-14 text-text-secondary font-medium">kg</span>}
          </div>
          <span className="text-11 text-text-tertiary block mt-1">
            {latest ? `Legutóbbi nyers mérés: ${latest.weightKg} kg` : "Még nincs rögzített mérés"}
          </span>
        </Card>

        <Card variant="surface" radius="20" className="p-5">
          <span className="text-11 text-text-secondary font-medium uppercase tracking-wider block">
            Heti változás üteme
          </span>
          <div className="flex items-center gap-2 mt-1">
            {entries.length >= 2 ? (
              <>
                {changeRate.trend === "losing" ? (
                  <TrendingDown className="w-6 h-6 text-brand" />
                ) : changeRate.trend === "gaining" ? (
                  <TrendingUp className="w-6 h-6 text-status-caution" />
                ) : (
                  <Minus className="w-6 h-6 text-text-tertiary" />
                )}
                <span className="text-28 font-bold text-text-primary tabular-nums">
                  {changeRate.weeklyRateKg > 0 ? `+${changeRate.weeklyRateKg}` : changeRate.weeklyRateKg}
                </span>
                <span className="text-14 text-text-secondary font-medium">kg / hét</span>
              </>
            ) : (
              <span className="text-20 font-bold text-text-tertiary tabular-nums">—</span>
            )}
          </div>
          <span className="text-11 text-text-tertiary block mt-1">
            {entries.length >= 2 ? `Elemzett időszak: ${changeRate.daysAnalyzed} nap` : "Legalább 2 mérés szükséges a trendhez"}
          </span>
        </Card>

        <Card variant="surface" radius="20" className="p-5">
          <span className="text-11 text-text-secondary font-medium uppercase tracking-wider block">
            Becsült testzsír %
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-28 font-bold text-text-primary tabular-nums">
              {latest?.smoothedBodyFatPct ?? latest?.bodyFatPct ?? "—"}
            </span>
            {(latest?.smoothedBodyFatPct || latest?.bodyFatPct) && (
              <span className="text-14 text-text-secondary font-medium">%</span>
            )}
          </div>
          <span className="text-11 text-text-tertiary block mt-1">
            {latest ? "Sportolói kategória: kondíció követve" : "Nincs adat"}
          </span>
        </Card>
      </div>

      {/* 7-Day Smoothed Weight Chart */}
      {entries.length === 0 ? (
        <Card variant="surface" radius="20" className="p-8 text-center space-y-3">
          <Scale className="w-8 h-8 text-text-tertiary mx-auto" />
          <h4 className="text-15 font-bold text-text-primary">Még nincs rögzített testsúlymérés</h4>
          <p className="text-12 text-text-secondary max-w-md mx-auto">
            A napi reggeli testsúlymérés rögzítésével az Apex kisimítja a vízháztartás kilengéseit, és megmutatja a valós testtömeg trendet.
          </p>
          <Button variant="primary" size="sm" onClick={() => setShowLogModal(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Első mérés rögzítése
          </Button>
        </Card>
      ) : (
        <Card variant="surface" radius="20" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-14 font-bold text-text-primary">
              Testtömeg alakulása (Nyers mérés vs. 7 napos mozgóátlag)
            </h4>
            <p className="text-11 text-text-secondary">
              A kék vonal szűri ki a só- és glikogénhidratációs kilengéseket.
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={smoothedPoints}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255, 255, 255, 0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="rgba(255, 255, 255, 0.3)"
                fontSize={11}
                tickFormatter={(val) => val.slice(5)}
              />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                stroke="rgba(255, 255, 255, 0.3)"
                fontSize={11}
                tickCount={6}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-12 bg-bg-surface p-3 border border-border-hairline shadow-lg text-12 space-y-1">
                        <div className="font-semibold text-text-primary">{label}</div>
                        <div className="text-text-secondary flex justify-between gap-4">
                          <span>Nyers mérlegelés:</span>
                          <span className="font-bold text-text-primary tabular-nums">
                            {payload[0]?.value} kg
                          </span>
                        </div>
                        <div className="text-brand flex justify-between gap-4">
                          <span>7 napos simított:</span>
                          <span className="font-bold tabular-nums">
                            {payload[1]?.value} kg
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="weightKg"
                name="Napi mérés"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "rgba(255, 255, 255, 0.4)" }}
              />
              <Line
                type="monotone"
                dataKey="smoothedWeightKg"
                name="7 napos simított átlag"
                stroke="#3D7BFF"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-12 bg-bg-elevated p-3 border border-border-hairline flex items-center gap-2 text-11 text-text-secondary">
          <Info className="w-4 h-4 text-brand shrink-0" />
          <span>
            1 gramm izomglikogén raktározása körülbelül 3-4 gramm vizet köt meg. Egy szénhidráttöltés vagy magas sóbevitel önmagában 1-2 kg testsúly-ugrást eredményezhet zsírlerakódás nélkül.
          </span>
        </div>
      </Card>
      )}

      {/* Log Measurement Modal */}
      <BottomSheet
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Új mérés rögzítése"
        description="Javasolt reggel, ébredés és mosdóhasználat után, étkezés előtt mérni."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogModal(false)}>
              Mégse
            </Button>
            <Button variant="primary" onClick={handleLogMeasurement}>
              Mérés mentése
            </Button>
          </>
        }
      >
        <form onSubmit={handleLogMeasurement} className="space-y-4 py-2">
          <NumberInput
            label="Testtömeg (kg) *"
            value={newWeight}
            onChange={setNewWeight}
            min={30}
            max={250}
            step={0.1}
            unit="kg"
          />


          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Testzsír % (opcionális)"
              value={newBodyFat ?? 12}
              onChange={setNewBodyFat}
              min={3}
              max={50}
              step={0.1}
              unit="%"
            />
            <NumberInput
              label="Derékbőség (cm, opcionális)"
              value={newWaist ?? 80}
              onChange={setNewWaist}
              min={40}
              max={160}
              step={0.5}
              unit="cm"
            />
          </div>
        </form>
      </BottomSheet>
    </div>
  );
};
