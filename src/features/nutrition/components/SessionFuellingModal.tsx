import React from "react";
import { BottomSheet, Button, Badge } from "@shared/ui";
import { WorkoutFuellingPlan } from "@shared/types/nutrition";
import { Zap, Clock, Droplets, CheckCircle2 } from "lucide-react";


interface SessionFuellingModalProps {
  isOpen: boolean;
  onClose: () => void;
  fuellingPlan: WorkoutFuellingPlan | null;
}

export const SessionFuellingModal: React.FC<SessionFuellingModalProps> = ({
  isOpen,
  onClose,
  fuellingPlan
}) => {
  if (!fuellingPlan) return null;

  const {
    title,
    sport,
    durationMinutes,
    intensityRpe,
    preSession,
    duringSession,
    postSession
  } = fuellingPlan;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Edzés körüli táplálkozási stratégia"
      description={`${title} (${sport}) • ${durationMinutes} perc • RPE ${intensityRpe}/10`}
      footer={
        <Button variant="primary" fullWidth onClick={onClose}>
          Értettem, alkalmazom
        </Button>
      }
    >
      <div className="space-y-6 py-2">
        {/* Quick Fuelling Summary Card */}
        <div className="rounded-16 bg-brand/10 p-4 border border-brand/30 flex items-center justify-between">
          <div>
            <span className="text-11 uppercase tracking-wider font-semibold text-brand block">
              Edzés alatti fő irányelv
            </span>
            <span className="text-18 font-bold text-text-primary tabular-nums">
              {duringSession.carbsPerHourGrams} g szénhidrát / óra
            </span>
            <span className="text-11 text-text-secondary block mt-0.5">
              Folyadék: ~{duringSession.fluidPerHourMl} ml/óra
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shrink-0 shadow-md">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        {/* 1. PRE-SESSION FUELLING */}
        <div className="rounded-16 bg-bg-surface p-4 border border-border-hairline space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-status-caution" />
              <h4 className="text-13 font-bold uppercase tracking-wider text-text-primary">
                1. {preSession.timingText}
              </h4>
            </div>
            <Badge variant="caution" size="sm">
              Feltöltés
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-12">
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Szénhidrát</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                ~{preSession.carbsGrams}g
              </span>
            </div>
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Folyadék</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                ~{preSession.fluidMl} ml
              </span>
            </div>
          </div>

          <ul className="space-y-1.5 pt-1 text-12 text-text-secondary">
            {preSession.guidelines.map((g, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. DURING-SESSION FUELLING */}
        <div className="rounded-16 bg-bg-surface p-4 border border-border-hairline space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              <h4 className="text-13 font-bold uppercase tracking-wider text-text-primary">
                2. {duringSession.timingText}
              </h4>
            </div>
            <Badge variant="brand" size="sm">
              Teljesítmény
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-12">
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Szénhidrát/óra</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                {duringSession.carbsPerHourGrams}g
              </span>
              <span className="text-10 text-text-tertiary">
                (össz: {duringSession.totalCarbsGrams}g)
              </span>
            </div>
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Folyadék/óra</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                ~{duringSession.fluidPerHourMl}ml
              </span>
              <span className="text-10 text-text-tertiary">
                (össz: {duringSession.totalFluidMl}ml)
              </span>
            </div>
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Nátrium/óra</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                ~{duringSession.sodiumPerHourMg}mg
              </span>
              <span className="text-10 text-text-tertiary">
                (össz: {duringSession.totalSodiumMg}mg)
              </span>
            </div>
          </div>

          <ul className="space-y-1.5 pt-1 text-12 text-text-secondary">
            {duringSession.guidelines.map((g, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. POST-SESSION RECOVERY */}
        <div className="rounded-16 bg-bg-surface p-4 border border-border-hairline space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-status-ready" />
              <h4 className="text-13 font-bold uppercase tracking-wider text-text-primary">
                3. {postSession.timingText}
              </h4>
            </div>
            <Badge variant="ready" size="sm">
              Regeneráció
            </Badge>

          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-12">
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Fehérje</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                ~{postSession.proteinGrams}g
              </span>
              <span className="text-10 text-text-tertiary">(2.5g leucin)</span>
            </div>
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Szénhidrát</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                ~{postSession.carbsGrams}g
              </span>
              <span className="text-10 text-text-tertiary">(visszatöltés)</span>
            </div>
            <div className="p-2.5 rounded-10 bg-bg-elevated border border-border-hairline">
              <span className="text-11 text-text-secondary block">Rehidráció</span>
              <span className="text-15 font-bold text-text-primary tabular-nums">
                ~{postSession.fluidMl}ml
              </span>
              <span className="text-10 text-text-tertiary">(víz / sók)</span>
            </div>
          </div>

          <ul className="space-y-1.5 pt-1 text-12 text-text-secondary">
            {postSession.guidelines.map((g, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </BottomSheet>
  );
};
