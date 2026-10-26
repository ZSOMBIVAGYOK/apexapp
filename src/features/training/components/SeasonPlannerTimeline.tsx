import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SeasonPhase,
  Competition
} from "@shared/types/training";
import {
  calculateRaceCountdown,
  calculateTaperSchedule,
  getPrimaryARace
} from "@shared/lib/periodization/periodizationEngine";
import { Card, Button, BottomSheet } from "@shared/ui";
import {
  Trophy,
  Sparkles,
  Calendar,
  ShieldCheck,
  Plus
} from "lucide-react";

interface SeasonPlannerTimelineProps {
  phases: SeasonPhase[];
  competitions: Competition[];
  onOpenSoloGenerator?: () => void;
  onAddCompetition?: () => void;
}

export const SeasonPlannerTimeline: React.FC<SeasonPlannerTimelineProps> = ({
  phases,
  competitions,
  onOpenSoloGenerator,
  onAddCompetition
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language.startsWith("hu");

  const todayStr = new Date().toISOString().split("T")[0] as string;
  const primaryARace = getPrimaryARace(competitions);
  const countdown = primaryARace
    ? calculateRaceCountdown(primaryARace.date, todayStr)
    : null;

  // Active current phase
  const currentPhase = phases.find(
    (p) => todayStr >= p.startDate && todayStr <= p.endDate
  );

  const [isTaperHelperOpen, setIsTaperHelperOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<SeasonPhase | null>(null);

  // Compute 14-day taper schedule
  const taperSchedule = React.useMemo(() => {
    const taperPhase = phases.find((p) => p.type === "taper");
    const peakPhase = phases.find((p) => p.type === "peak");
    const peakHours = peakPhase
      ? +(peakPhase.targetWeeklyVolumeMinutes / 60).toFixed(1)
      : 10;
    const startDate = taperPhase ? taperPhase.startDate : todayStr;
    return calculateTaperSchedule(peakHours, startDate, 14);
  }, [phases, todayStr]);

  const getPhaseColor = (type: SeasonPhase["type"]) => {
    switch (type) {
      case "transition":
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
      case "base":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "build":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "peak":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "taper":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "race":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      default:
        return "bg-white/10 text-white border-white/10";
    }
  };

  const getPhaseBarColor = (type: SeasonPhase["type"]) => {
    switch (type) {
      case "transition":
        return "bg-slate-500";
      case "base":
        return "bg-blue-500";
      case "build":
        return "bg-indigo-500";
      case "peak":
        return "bg-emerald-500";
      case "taper":
        return "bg-amber-500";
      case "race":
        return "bg-rose-500";
      default:
        return "bg-brand-500";
    }
  };

  return (
    <Card className="p-4 sm:p-6 mb-6">
      {/* Top Bar: A-Race Countdown & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          {primaryARace && countdown ? (
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    {isHu ? "Célverseny (A-Prioritás)" : "Target Race (A-Priority)"}
                  </span>
                  <span className="text-xs text-text-secondary">•</span>
                  <span className="text-xs text-text-secondary font-mono">
                    {primaryARace.date}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {primaryARace.title}{" "}
                  {primaryARace.distance && (
                    <span className="text-sm font-normal text-text-secondary">
                      ({primaryARace.distance})
                    </span>
                  )}
                </h3>
                <div className="text-xs font-medium text-emerald-400 mt-0.5">
                  ⏳ {countdown.formattedHu}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {isHu ? "Szezonális periodizáció" : "Seasonal Periodization"}
                </h3>
                <p className="text-xs text-text-secondary">
                  {isHu
                    ? "Állíts be egy A-versenyt a visszaszámláláshoz és fázistervezéshez."
                    : "Set an A-race for countdown and backwards periodization."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsTaperHelperOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{isHu ? "Tapering segéd" : "Taper Helper"}</span>
          </Button>

          {onOpenSoloGenerator && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenSoloGenerator}
              className="flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isHu ? "Solo Terv generátor" : "Plan Generator"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Visual Periodization Timeline Bar */}
      {phases.length > 0 && (
        <div className="pt-5">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
            <span className="font-medium text-white">
              {isHu ? "Szezonális fázisok (Idővonal)" : "Season Phases (Timeline)"}
            </span>
            {currentPhase && (
              <span className="text-brand-400 font-medium">
                {isHu ? "Aktív: " : "Current: "}
                <strong>{currentPhase.name}</strong>
              </span>
            )}
          </div>

          {/* Segmented Phase Bar */}
          <div className="flex items-center gap-1 h-3 rounded-full bg-[#0B0C0F] p-0.5 border border-white/5 overflow-hidden">
            {phases.map((phase) => {
              const isActive =
                todayStr >= phase.startDate && todayStr <= phase.endDate;
              return (
                <div
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase)}
                  title={`${phase.name} (${phase.startDate} - ${phase.endDate})`}
                  className={`h-full flex-1 rounded-full cursor-pointer transition-all hover:opacity-100 ${getPhaseBarColor(
                    phase.type
                  )} ${isActive ? "opacity-100 ring-2 ring-white/50" : "opacity-60"}`}
                />
              );
            })}
          </div>

          {/* Phase Labels Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
            {phases.map((phase) => {
              const isActive =
                todayStr >= phase.startDate && todayStr <= phase.endDate;
              return (
                <button
                  key={phase.id}
                  onClick={() => setSelectedPhase(phase)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${getPhaseColor(
                    phase.type
                  )} ${
                    isActive
                      ? "ring-1 ring-white/40 shadow-lg"
                      : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {phase.type}
                    </span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white truncate">
                    {phase.name.split(" ")[0]}
                  </div>
                  <div className="text-[10px] text-text-secondary truncate mt-0.5">
                    {phase.startDate.slice(5)} - {phase.endDate.slice(5)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Competitions Chips Strip */}
      <div className="mt-5 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary font-medium">
            {isHu ? "Szezon versenyei (A/B/C prioritás)" : "Season Competitions (A/B/C)"}
          </span>
          {onAddCompetition && (
            <button
              onClick={onAddCompetition}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isHu ? "Új verseny" : "Add race"}</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {competitions.map((comp) => {
            const priorityBadge =
              comp.priority === "A"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                : comp.priority === "B"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                : "bg-slate-500/20 text-slate-300 border-slate-500/30";

            return (
              <div
                key={comp.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0C0F] border border-white/10 text-xs"
              >
                <span
                  className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border ${priorityBadge}`}
                >
                  {comp.priority}
                </span>
                <span className="font-medium text-white">{comp.title}</span>
                <span className="text-text-secondary font-mono text-[11px]">
                  {comp.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tapering Helper Modal */}
      <BottomSheet
        isOpen={isTaperHelperOpen}
        onClose={() => setIsTaperHelperOpen(false)}
        title={isHu ? "Formaidőzítő (Tapering) Segéd" : "Tapering Helper"}
      >
        <div className="space-y-5 text-sm p-2">
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white text-xs sm:text-sm">
                {isHu
                  ? "Mujika & Padilla tudományos formaidőzítési modell"
                  : "Mujika & Padilla Scientific Taper Model"}
              </h4>
              <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                {isHu
                  ? "A cél a felhalmozódott fáradtság leépítése (pozitív TSB), miközben a maximális aerob kapacitás és a versenytempó neuromuszkuláris mintázata megmarad."
                  : "The goal is to dissipate accumulated fatigue (positive TSB) while maintaining VO2max and race-pace motor recruitment."}
              </p>
            </div>
          </div>

          {/* Principles */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-2">
              {isHu ? "A sikeres tapering 4 alapelve" : "4 Core Principles"}
            </h4>
            <div className="space-y-2">
              {(isHu ? taperSchedule.principlesHu : taperSchedule.principlesEn).map(
                (p, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 bg-[#0B0C0F] p-2.5 rounded-xl border border-white/5 text-xs text-text-secondary"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 14-Day Schedule Table */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-2">
              {isHu ? "14 napos exponenciális volumen-görbe" : "14-Day Volume Curve"}
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {taperSchedule.days.map((day) => (
                <div
                  key={day.dayIndex}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#0B0C0F] border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-text-secondary text-[11px] w-6">
                      D-{day.daysUntilRace}
                    </span>
                    <span className="text-white font-medium">
                      {isHu ? `${day.dayIndex}. nap` : `Day ${day.dayIndex}`}
                    </span>
                    <span className="text-text-secondary text-[11px] font-mono">
                      ({day.date})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-amber-400 font-bold">
                      {day.volumePercent}% ({day.recommendedMinutes}p)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsTaperHelperOpen(false)}
            className="w-full mt-2"
          >
            {isHu ? "Bezárás" : "Close"}
          </Button>
        </div>
      </BottomSheet>

      {/* Phase Details BottomSheet */}
      <BottomSheet
        isOpen={Boolean(selectedPhase)}
        onClose={() => setSelectedPhase(null)}
        title={selectedPhase?.name || ""}
      >
        {selectedPhase && (
          <div className="space-y-4 text-sm p-2">
            <div className="bg-[#0B0C0F] p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="text-xs text-text-secondary">
                {isHu ? "Időtartam:" : "Duration:"}{" "}
                <strong className="text-white">
                  {selectedPhase.startDate} – {selectedPhase.endDate}
                </strong>
              </div>
              <div className="text-xs text-text-secondary">
                {isHu ? "Cél heti volumen:" : "Target Weekly Volume:"}{" "}
                <strong className="text-white">
                  {Math.round(selectedPhase.targetWeeklyVolumeMinutes / 60)} {isHu ? "óra" : "hrs"} (
                  {selectedPhase.targetWeeklyVolumeMinutes} {isHu ? "perc" : "min"})
                </strong>
              </div>
              <div className="text-xs text-text-secondary">
                {isHu ? "Tervezett heti terhelés:" : "Target Weekly Load:"}{" "}
                <strong className="text-amber-400 font-mono">
                  {selectedPhase.targetWeeklyLoad} TSS / AU
                </strong>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-1.5">
                {isHu ? "Fázis fókusza és fiziológiai célja" : "Phase Focus & Physiology"}
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed bg-[#0B0C0F] p-3 rounded-xl border border-white/5">
                {selectedPhase.description}
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() => setSelectedPhase(null)}
              className="w-full mt-2"
            >
              {isHu ? "Bezárás" : "Close"}
            </Button>
          </div>
        )}
      </BottomSheet>
    </Card>
  );
};
