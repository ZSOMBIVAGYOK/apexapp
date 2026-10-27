import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SportType } from "@shared/types/training";
import {
  soloPlanGenerator,
  PlanGeneratorInput,
  GeneratedSeasonPlan
} from "@shared/lib/planner/soloPlanGenerator";
import { BottomSheet, Button } from "@shared/ui";
import { Sparkles, Check, ArrowRight } from "lucide-react";

interface SoloPlanGeneratorWizardProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  onPlanGenerated: (plan: GeneratedSeasonPlan) => void;
}

export const SoloPlanGeneratorWizard: React.FC<SoloPlanGeneratorWizardProps> = ({
  isOpen,
  onClose,
  athleteId,
  onPlanGenerated
}) => {
  const { i18n } = useTranslation();
  const isHu = i18n.language.startsWith("hu");

  const todayStr = new Date().toISOString().split("T")[0] as string;

  // Default A-race 16 weeks ahead
  const defaultRaceDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 16 * 7);
    return d.toISOString().split("T")[0] as string;
  })();

  const [sport, setSport] = useState<SportType>("running");
  const [goal, setGoal] = useState<string>("");
  const [aRaceDate, setARaceDate] = useState<string>(defaultRaceDate);
  const [level, setLevel] = useState<"hobby" | "competitive" | "national" | "olympic">("competitive");
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [weeklyHours, setWeeklyHours] = useState<number>(8);

  const [previewPlan, setPreviewPlan] = useState<GeneratedSeasonPlan | null>(null);

  const handleGenerate = () => {
    const input: PlanGeneratorInput = {
      athleteId,
      sport,
      level,
      goal,
      aRaceDate,
      trainingDaysPerWeek: daysPerWeek,
      weeklyAvailableHours: weeklyHours
    };
    const plan = soloPlanGenerator.generatePlan(input);
    setPreviewPlan(plan);
  };

  const handleApply = () => {
    if (previewPlan) {
      onPlanGenerated(previewPlan);
      onClose();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isHu ? "Solo Szezon Terv Generátor" : "Solo Season Plan Generator"}
    >
      <div className="space-y-5 text-sm p-1">
        {!previewPlan ? (
          <>
            {/* Intro callout */}
            <div className="bg-brand-500/10 border border-brand-500/20 p-3.5 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white text-xs sm:text-sm">
                  {isHu
                    ? "Tudományos visszamenőleges periodizáció"
                    : "Scientific Backwards Periodization"}
                </h4>
                <p className="text-text-secondary text-xs mt-1 leading-relaxed">
                  {isHu
                    ? "A rendszer a célverseny napjából visszafelé számolva automatikusan felépíti a Formaidőzítés (Taper), Csúcsforma (Peak), Építés (Build) és Alapozás (Base) fázisokat és a heti strukturált edzéseket."
                    : "Calculates backwards from your race date to auto-generate Taper, Peak, Build and Base phases with structured workouts."}
                </p>
              </div>
            </div>

            {/* Sport & Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  {isHu ? "Fő sportág" : "Main Sport"}
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value as SportType)}
                  className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-brand-500 focus:outline-none"
                >
                  <option value="running">🏃 {isHu ? "Futás (Running)" : "Running"}</option>
                  <option value="cycling">🚴 {isHu ? "Kerékpár (Cycling)" : "Cycling"}</option>
                  <option value="swimming">🏊 {isHu ? "Úszás (Swimming)" : "Swimming"}</option>
                  <option value="triathlon">🏅 {isHu ? "Triatlon (Triathlon)" : "Triathlon"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                  {isHu ? "Célverseny dátuma (A-verseny)" : "Target Race Date"}
                </label>
                <input
                  type="date"
                  value={aRaceDate}
                  min={todayStr}
                  onChange={(e) => setARaceDate(e.target.value)}
                  className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Goal description */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                {isHu ? "Verseny / Szezonális cél" : "Goal Description"}
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder={isHu ? "pl. Első félmaraton 1:45 alatt" : "e.g. Sub 1:45 Half Marathon"}
                className="w-full bg-[#0B0C0F] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Level Selector */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                {isHu ? "Felkészültségi szint" : "Athlete Level"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "hobby", labelHu: "Hobbi", labelEn: "Hobby" },
                  { id: "competitive", labelHu: "Versenyző", labelEn: "Competitive" },
                  { id: "national", labelHu: "Országos", labelEn: "National" },
                  { id: "olympic", labelHu: "Olimpiai", labelEn: "Olympic" }
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() =>
                      setLevel(lvl.id as "hobby" | "competitive" | "national" | "olympic")
                    }
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      level === lvl.id
                        ? "bg-brand-500/20 border-brand-500 text-brand-300"
                        : "bg-[#0B0C0F] border-white/5 text-text-secondary hover:text-white"
                    }`}
                  >
                    {isHu ? lvl.labelHu : lvl.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency and Volume sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Days per week */}
              <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-secondary">
                    {isHu ? "Heti edzésnapok" : "Days per week"}
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {daysPerWeek} {isHu ? "nap/hét" : "days/wk"}
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="6"
                  step="1"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Weekly hours */}
              <div className="bg-[#0B0C0F] p-3 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-secondary">
                    {isHu ? "Elérhető heti időtartam" : "Weekly available time"}
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {weeklyHours} {isHu ? "óra/hét" : "hrs/wk"}
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="18"
                  step="1"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isHu ? "Periodizált terv legenerálása" : "Generate Periodized Plan"}</span>
              </Button>
            </div>
          </>
        ) : (
          /* PREVIEW GENERATED PLAN */
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white text-xs sm:text-sm">
                  {isHu ? "Terv sikeresen elkészült!" : "Plan Generated Successfully!"}
                </h4>
                <p className="text-text-secondary text-xs mt-0.5">
                  {isHu
                    ? `6 szezonális fázis és ${previewPlan.totalWorkoutsCount} strukturált edzés készült el.`
                    : `6 seasonal phases and ${previewPlan.totalWorkoutsCount} structured workouts created.`}
                </p>
              </div>
            </div>

            {/* Phases Summary List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                {isHu ? "Legenerált fázisok" : "Generated Phases"}
              </span>
              {previewPlan.phases.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-[#0B0C0F] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">{p.name}</span>
                    <div className="text-[11px] text-text-secondary font-mono mt-0.5">
                      {p.startDate} – {p.endDate}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-white font-bold">
                      {Math.round(p.targetWeeklyVolumeMinutes / 60)}h / {isHu ? "hét" : "wk"}
                    </span>
                    <div className="text-[10px] text-amber-400">
                      ~{p.targetWeeklyLoad} TSS
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons: Back or Apply */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setPreviewPlan(null)}
                className="flex-1"
              >
                {isHu ? "Vissza a beállításokhoz" : "Back"}
              </Button>
              <Button
                variant="primary"
                onClick={handleApply}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <span>{isHu ? "Terv alkalmazása" : "Apply to Calendar"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
