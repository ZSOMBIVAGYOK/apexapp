import React, { useState } from "react";
import { BottomSheet, Badge } from "@shared/ui";
import { Info, Bed } from "lucide-react";
import { AthleteSleepScore } from "@shared/lib/scores";

export interface SleepDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sleep: AthleteSleepScore;
  onUpdateTargetWakeTime?: (wakeTime: string) => void;
  historicalTrend?: Array<{ date: string; durationMinutes: number; score?: number }>;
}

export const SleepDetailSheet: React.FC<SleepDetailSheetProps> = ({
  isOpen,
  onClose,
  sleep,
  onUpdateTargetWakeTime,
  historicalTrend = []
}) => {
  const [wakeTime, setWakeTime] = useState(
    sleep.bedtimeRecommendation.targetWakeTime || "07:00"
  );

  const durationHours = (sleep.durationMinutes / 60).toFixed(1);
  const needHours = (sleep.needMinutes / 60).toFixed(1);
  const debtHours = (sleep.debtMinutes / 60).toFixed(1);

  const handleWakeTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWakeTime(val);
    onUpdateTargetWakeTime?.(val);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Alvás Részletei"
      maxWidth="lg"
    >
      <div className="space-y-6 pb-6">
        {/* HERO SLEEP BANNER */}
        <div className="p-5 rounded-24 bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
          <div>
            <span className="text-11 font-semibold uppercase tracking-wider text-text-tertiary">
              Alvási Pontszám (Sleep Score)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-40 font-mono font-bold tracking-tight text-text-primary tabular-nums">
                {sleep.score}
              </span>
              <span className="text-16 font-semibold text-text-secondary">/ 100</span>
              <Badge variant="brand" size="md" className="ml-2 bg-indigo-500/20 text-indigo-400">
                {sleep.statusLabelHu}
              </Badge>
            </div>
            <p className="text-12 text-text-secondary mt-1">
              Aludt idő: <span className="font-semibold text-text-primary">{durationHours} óra</span> / Szükséges:{" "}
              <span className="font-semibold text-text-primary">{needHours} óra</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-11 text-text-tertiary font-mono block">7 napos adósság</span>
            <span
              className={`text-18 font-mono font-bold ${
                sleep.debtMinutes > 60 ? "text-status-caution" : "text-text-primary"
              }`}
            >
              {debtHours} óra
            </span>
            <span className="text-[10px] text-text-secondary block mt-0.5">
              Konzisztencia: {sleep.consistency}%
            </span>
          </div>
        </div>

        {/* ALVÁSIGÉNY BONTÁS (NEED BREAKDOWN) */}
        <div className="space-y-3">
          <h4 className="text-13 font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
            Személyre Szabott Alvásigény Összetevői
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-16 bg-surface-elevated border border-border-hairline">
              <span className="text-[11px] text-text-tertiary block">Személyes bázis</span>
              <span className="text-16 font-mono font-bold text-text-primary mt-1 block">
                {(sleep.breakdown.baselineMinutes / 60).toFixed(1)} óra
              </span>
              <span className="text-[10px] text-text-secondary">Alap szükséglet</span>
            </div>

            <div className="p-3 rounded-16 bg-surface-elevated border border-border-hairline">
              <span className="text-[11px] text-text-tertiary block">Terhelési többlet</span>
              <span className="text-16 font-mono font-bold text-brand mt-1 block">
                +{sleep.breakdown.strainExtraMinutes} perc
              </span>
              <span className="text-[10px] text-text-secondary">Tegnapi edzések miatt</span>
            </div>

            <div className="p-3 rounded-16 bg-surface-elevated border border-border-hairline">
              <span className="text-[11px] text-text-tertiary block">Adósság törlesztés</span>
              <span className="text-16 font-mono font-bold text-caution mt-1 block">
                +{sleep.breakdown.debtRepaymentMinutes} perc
              </span>
              <span className="text-[10px] text-text-secondary">Napi 25% felosztásban</span>
            </div>

            <div className="p-3 rounded-16 bg-surface-elevated border border-border-hairline">
              <span className="text-[11px] text-text-tertiary block">Nappali szundi</span>
              <span className="text-16 font-mono font-bold text-ready mt-1 block">
                -{sleep.breakdown.napDeductionMinutes} perc
              </span>
              <span className="text-[10px] text-text-secondary">Levonva az igényből</span>
            </div>
          </div>
        </div>

        {/* ESTI LEFEKVÉSI AJÁNLÁS & ÉBREDÉSI CÉL */}
        <div className="p-4 rounded-20 bg-surface-elevated border border-border-hairline space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-indigo-400" />
              <span className="text-13 font-bold text-text-primary">Esti Lefekvési Ajánlás</span>
            </div>
            <span className="text-11 text-text-tertiary font-mono">15 perc elalvási idővel</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-16 bg-surface/80 border border-border-hairline">
            <div>
              <span className="text-11 text-text-secondary block">Javasolt lefekvés ma este:</span>
              <span className="text-24 font-mono font-bold text-indigo-400">
                {sleep.bedtimeRecommendation.recommendedBedtime}
              </span>
            </div>

            <div className="text-right">
              <label className="text-11 text-text-secondary block mb-1">
                Tervezett ébredés:
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={handleWakeTimeChange}
                className="rounded-8 bg-surface-elevated border border-border px-2 py-1 font-mono text-xs text-text-primary focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* 14-DAY SLEEP DURATION TREND */}
        {historicalTrend.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-13 font-bold text-text-primary uppercase tracking-wider text-text-tertiary">
              14 Napos Alvásmennyiség
            </h4>
            <div className="p-4 rounded-20 bg-surface-elevated/50 border border-border-hairline">
              <div className="flex items-end gap-1.5 h-24 pt-4">
                {historicalTrend.slice(-14).map((item, idx) => {
                  const hours = item.durationMinutes / 60;
                  const heightPct = Math.min(100, Math.max(10, (hours / 10) * 100));
                  const isEnough = hours >= 7.0;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-sm transition-all ${
                          isEnough ? "bg-indigo-500/80" : "bg-caution/80"
                        } group-hover:opacity-100`}
                      />
                      <span className="text-[9px] text-text-tertiary font-mono">
                        {item.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* HOGYAN SZÁMOLJUK INFO */}
        <div className="p-4 rounded-16 bg-surface-elevated/40 border border-border-hairline text-xs text-text-tertiary space-y-2">
          <div className="flex items-center gap-2 font-semibold text-text-secondary">
            <Info className="h-4 w-4 text-brand" />
            <span>Hogyan számoljuk az Alvást és az Alvásigényt?</span>
          </div>
          <p className="leading-relaxed">
            Az alvási pontszám nem csupán az alvás óráit méri, hanem a személyre szabott napi alvásigényhez viszonyítja.
            Az igény automatikusan növekszik az előző nap terhelésének (Strain) és az elmúlt napok alvásadósságának
            függvényében, biztosítva a szuperkompenzációt és a túlterhelés elkerülését.
          </p>
        </div>
      </div>
    </BottomSheet>
  );
};
