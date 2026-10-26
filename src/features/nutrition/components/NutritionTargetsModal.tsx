import React, { useState, useEffect } from "react";
import {
  BottomSheet,
  Button,
  NumberInput,
  Slider,
  SegmentedControl,
  Badge,
  showToast
} from "@shared/ui";
import {
  calculateDailyNutritionTarget,
  calculateBMR,
  MACRO_RULES_BY_DAY_TYPE,
  GOAL_CONFIGS
} from "@shared/lib/nutrition";
import {
  DailyNutritionTarget,
  NutritionDayType,
  NutritionGoal
} from "@shared/types/nutrition";
import { Calculator, UserCheck, ShieldCheck, Flame, Droplets } from "lucide-react";


interface NutritionTargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTarget: DailyNutritionTarget;
  onSaveTarget: (target: DailyNutritionTarget) => void;
  isDietitian?: boolean;
  dietitianName?: string;
  athleteWeightKg?: number;
  athleteHeightCm?: number;
  athleteAgeYears?: number;
  athleteSex?: "male" | "female" | "other" | "prefer_not_to_say";
  athleteBodyFatPct?: number;
}

export const NutritionTargetsModal: React.FC<NutritionTargetsModalProps> = ({
  isOpen,
  onClose,
  currentTarget,
  onSaveTarget,
  isDietitian = false,
  dietitianName = "Dr. Kovács Anna",
  athleteWeightKg = 72,
  athleteHeightCm = 180,
  athleteAgeYears = 26,
  athleteSex = "male",
  athleteBodyFatPct = 12
}) => {
  const [dayType, setDayType] = useState<NutritionDayType>(currentTarget.dayType);
  const [goal, setGoal] = useState<NutritionGoal>(currentTarget.goal);
  const [weightKg, setWeightKg] = useState(athleteWeightKg);
  const [bodyFatPct, setBodyFatPct] = useState<number | undefined>(athleteBodyFatPct);

  // Custom macro sliders
  const [carbsPerKg, setCarbsPerKg] = useState<number>(

    currentTarget.targetCarbsGrams / (athleteWeightKg || 70)
  );
  const [proteinPerKg, setProteinPerKg] = useState<number>(
    currentTarget.targetProteinGrams / (athleteWeightKg || 70)
  );

  // Re-sync when currentTarget or dayType changes
  useEffect(() => {
    const rule = MACRO_RULES_BY_DAY_TYPE[dayType];
    setCarbsPerKg(rule.carbsGramsPerKg.target);
    setProteinPerKg(rule.proteinGramsPerKg.target);
  }, [dayType]);

  // Recalculate live preview
  const previewTarget = calculateDailyNutritionTarget({
    date: currentTarget.date,
    weightKg,
    heightCm: athleteHeightCm,
    ageYears: athleteAgeYears,
    sex: athleteSex,
    bodyFatPct,
    dayType,
    goal,
    customCarbsPerKg: carbsPerKg,
    customProteinPerKg: proteinPerKg,
    setBy: isDietitian
      ? {
          userId: "dietitian-1",
          userName: dietitianName,
          role: "dietitian",
          title: "Vezető Sportdietetikus",
          updatedAt: new Date().toISOString()
        }
      : {
          userId: "athlete-self",
          userName: "Sportoló (Saját cél)",
          role: "athlete",
          updatedAt: new Date().toISOString()
        },
    isCustomOverride: true
  });

  const bmrInfo = calculateBMR({
    weightKg,
    heightCm: athleteHeightCm,
    ageYears: athleteAgeYears,
    sex: athleteSex,
    bodyFatPct
  });

  const handleSave = () => {
    onSaveTarget(previewTarget);
    onClose();
    showToast({
      title: "Táplálkozási célok mentve",
      message: `${previewTarget.targetCalories} kcal (Sz: ${previewTarget.targetCarbsGrams}g, F: ${previewTarget.targetProteinGrams}g, Zs: ${previewTarget.targetFatGrams}g)`,
      type: "success"
    });
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Táplálkozási célok & Periodizáció"
      description="Tudományos alapú BMR, TDEE és periodizált makrotápanyag beállítások nap típus szerint."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Mégse
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Célok alkalmazása
          </Button>
        </>
      }
    >
      <div className="space-y-6 py-2">
        {/* Target Provenance Badge */}
        <div className="rounded-16 bg-bg-surface p-4 border border-border-hairline flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              {currentTarget.setBy?.role === "dietitian" ? (
                <UserCheck className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-11 text-text-secondary uppercase tracking-wider block font-medium">
                Jelenlegi célérték forrása
              </span>
              <span className="text-14 font-semibold text-text-primary">
                {currentTarget.setBy?.userName || "Sportoló (Saját cél)"}
              </span>
              {currentTarget.setBy?.title && (
                <span className="text-11 text-text-tertiary block">
                  {currentTarget.setBy.title}
                </span>
              )}
            </div>
          </div>
          <Badge
            variant={currentTarget.setBy?.role === "dietitian" ? "brand" : "neutral"}
            size="sm"
          >
            {currentTarget.setBy?.role === "dietitian"
              ? "Szakértői beállítás"
              : "Személyes"}
          </Badge>
        </div>

        {/* Day Type Selector */}
        <div className="space-y-2">
          <label className="text-12 font-medium text-text-secondary block">
            Nap típusa (Periodizáció)
          </label>
          <div className="grid grid-cols-5 gap-1 p-1 bg-bg-surface rounded-12 border border-border-hairline text-11">
            {(["rest", "light", "moderate", "hard", "competition"] as NutritionDayType[]).map(
              (dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setDayType(dt)}
                  className={`py-2 px-1 rounded-8 font-medium transition-all text-center truncate ${
                    dayType === dt
                      ? "bg-brand text-white shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {dt === "rest"
                    ? "Pihenő"
                    : dt === "light"
                    ? "Könnyű"
                    : dt === "moderate"
                    ? "Mérsékelt"
                    : dt === "hard"
                    ? "Nehéz"
                    : "Verseny"}
                </button>
              )
            )}
          </div>
          <p className="text-11 text-text-secondary">
            {MACRO_RULES_BY_DAY_TYPE[dayType].descriptionHu}
          </p>
        </div>

        {/* Goal Modifier */}
        <div className="space-y-2">
          <label className="text-12 font-medium text-text-secondary block">
            Elsődleges célkitűzés
          </label>
          <SegmentedControl
            value={goal}
            onChange={(val) => setGoal(val as NutritionGoal)}
            options={[
              { value: "maintain", label: "Fenntartás" },
              { value: "lose", label: "Szálkásítás" },
              { value: "gain", label: "Tömegelés" },
              { value: "performance", label: "Teljesítmény" }
            ]}
            fullWidth
          />
          <p className="text-11 text-text-tertiary">
            {GOAL_CONFIGS[goal].descriptionHu}
          </p>
        </div>

        {/* Live Energy & Macro Overview Box */}
        <div className="rounded-16 bg-bg-elevated p-4 border border-brand/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand">
              <Flame className="w-5 h-5" />
              <span className="text-12 font-bold uppercase tracking-wider">
                Számított napi energiaszükséglet
              </span>
            </div>
            <span className="text-22 font-bold text-text-primary tabular-nums">
              {previewTarget.targetCalories} kcal
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline">
              <span className="text-11 text-text-secondary block font-medium">Fehérje</span>
              <span className="text-16 font-bold text-text-primary tabular-nums mt-0.5 block">
                {previewTarget.targetProteinGrams}g
              </span>
              <span className="text-10 text-text-tertiary">
                {(previewTarget.targetProteinGrams / weightKg).toFixed(1)} g/kg
              </span>
            </div>
            <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline">
              <span className="text-11 text-text-secondary block font-medium">Szénhidrát</span>
              <span className="text-16 font-bold text-text-primary tabular-nums mt-0.5 block">
                {previewTarget.targetCarbsGrams}g
              </span>
              <span className="text-10 text-text-tertiary">
                {(previewTarget.targetCarbsGrams / weightKg).toFixed(1)} g/kg
              </span>
            </div>
            <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline">
              <span className="text-11 text-text-secondary block font-medium">Zsír</span>
              <span className="text-16 font-bold text-text-primary tabular-nums mt-0.5 block">
                {previewTarget.targetFatGrams}g
              </span>
              <span className="text-10 text-text-tertiary">
                {(previewTarget.targetFatGrams / weightKg).toFixed(1)} g/kg
              </span>
            </div>
          </div>

          {/* Hydration & Electrolytes */}
          <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline flex items-center justify-between text-12">
            <div className="flex items-center gap-2 text-brand">
              <Droplets className="w-4 h-4" />
              <span className="font-semibold">Napi folyadékcél:</span>
            </div>
            <span className="font-bold text-text-primary tabular-nums">
              {previewTarget.targetHydrationLiters} liter{" "}
              <span className="text-10 text-text-tertiary">
                (~{previewTarget.targetSodiumMg}mg nátrium)
              </span>
            </span>
          </div>
        </div>

        {/* Macro Sliders (g/kg) */}
        <div className="space-y-4 pt-2 border-t border-border-hairline">
          <h4 className="text-13 font-semibold text-text-secondary uppercase tracking-wider">
            Finomhangolás (g / testtömeg-kg)
          </h4>

          {/* Carbs Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-12 font-medium">
              <span className="text-text-primary">Szénhidrát (CHO)</span>
              <span className="text-brand tabular-nums font-bold">
                {carbsPerKg.toFixed(1)} g/kg ({Math.round(carbsPerKg * weightKg)}g)
              </span>
            </div>
            <Slider
              value={carbsPerKg}
              onChange={setCarbsPerKg}
              min={1.5}
              max={12.0}
              step={0.5}
            />
            <div className="flex justify-between text-10 text-text-tertiary">
              <span>Alacsony (2g/kg)</span>
              <span>Közepes (6g/kg)</span>
              <span>Versenytöltés (10-12g/kg)</span>
            </div>
          </div>

          {/* Protein Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-12 font-medium">
              <span className="text-text-primary">Fehérje (PRO)</span>
              <span className="text-brand tabular-nums font-bold">
                {proteinPerKg.toFixed(1)} g/kg ({Math.round(proteinPerKg * weightKg)}g)
              </span>
            </div>
            <Slider
              value={proteinPerKg}
              onChange={setProteinPerKg}
              min={1.2}
              max={2.6}
              step={0.1}
            />
            <div className="flex justify-between text-10 text-text-tertiary">
              <span>Egészségügyi alap (1.2g)</span>
              <span>Sportoló optimális (1.8-2.0g)</span>
              <span>Szálkásítás / Izomvédelem (2.4g)</span>
            </div>
          </div>
        </div>

        {/* Physiological Baseline & Formulas */}
        <div className="space-y-3 pt-2 border-t border-border-hairline">
          <div className="flex items-center gap-2 text-text-secondary">
            <Calculator className="w-4 h-4" />
            <h4 className="text-12 font-semibold uppercase tracking-wider">
              Élettani paraméterek & Képlet
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput
              label="Testtömeg (kg)"
              value={weightKg}
              onChange={setWeightKg}
              min={30}
              max={250}
              step={0.5}
              unit="kg"
            />
            <NumberInput
              label="Testzsír % (opcionális)"
              value={bodyFatPct ?? 12}
              onChange={(val) => setBodyFatPct(val)}
              min={3}
              max={50}
              step={0.5}
              unit="%"
            />
          </div>

          <div className="p-3 rounded-12 bg-bg-surface border border-border-hairline text-11 text-text-secondary">
            <span className="font-semibold text-text-primary block mb-0.5">
              Alkalmazott BMR képlet: {bmrInfo.formula === "cunningham" ? "Cunningham (1980, LBM alapján)" : "Mifflin-St Jeor (1990)"}
            </span>
            <span>
              Alapanyagcsere (BMR): <strong className="text-text-primary">{bmrInfo.bmr} kcal</strong>.{" "}
              {bmrInfo.leanBodyMassKg && `Zsírmentes izomtömeg (LBM): ${bmrInfo.leanBodyMassKg} kg.`}
            </span>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
