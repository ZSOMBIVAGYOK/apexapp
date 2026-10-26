import React, { useState } from "react";
import {
  BottomSheet,
  Button,
  Input,
  NumberInput,
  Select,
  showToast
} from "@shared/ui";
import {
  DietitianMealPlan,
  NutritionDayType,
  MealType
} from "@shared/types/nutrition";
import { Trash2 } from "lucide-react";

interface DietitianPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePlan: (plan: DietitianMealPlan) => void;
  dietitianName?: string;
}

export const DietitianPlanModal: React.FC<DietitianPlanModalProps> = ({
  isOpen,
  onClose,
  onSavePlan,
  dietitianName = "Dr. Kovács Anna (Sportdietetikus)"
}) => {
  const [title, setTitle] = useState("Versenynapi szénhidráttöltés (Carb-Loading)");
  const [description, setDescription] = useState(
    "Maximális glikogén-elérhetőség alacsony zsírtartalommal és kímélő rosttartalommal a rajthoz."
  );
  const [targetDayType, setTargetDayType] = useState<NutritionDayType>("competition");
  const [targetCalories, setTargetCalories] = useState(3600);
  const [targetProtein, setTargetProtein] = useState(130);
  const [targetCarbs, setTargetCarbs] = useState(650);
  const [targetFat, setTargetFat] = useState(50);

  const [meals, setMeals] = useState<
    Array<{
      mealType: MealType;
      suggestedName: string;
      targetCarbsGrams: number;
      targetProteinGrams: number;
      plateSuggestion?: string;
    }>
  >([
    {
      mealType: "breakfast",
      suggestedName: "Zabkása növényi tejjel, banánnal, mézzel és tejsavó izolátummal",
      targetCarbsGrams: 120,
      targetProteinGrams: 35,
      plateSuggestion: "1/2 szénhidrát, 1/4 fehérje, 1/4 gyümölcs"
    },
    {
      mealType: "during_training",
      suggestedName: "Izotóniás ital + 2 energiagél (maltodextrin:fruktóz 2:1)",
      targetCarbsGrams: 90,
      targetProteinGrams: 0,
      plateSuggestion: "Egyszerű felszívódású verseny-üzemanyag"
    },
    {
      mealType: "lunch",
      suggestedName: "Jázminrizs párolt csirkemellel és cukkínivel (minimális olaj)",
      targetCarbsGrams: 150,
      targetProteinGrams: 40,
      plateSuggestion: "3/4 tányér jázminrizs, 1/4 fehérje"
    },
    {
      mealType: "snack",
      suggestedName: "Fehér kenyér lekvárral vagy banános rizskorongok",
      targetCarbsGrams: 80,
      targetProteinGrams: 10,
      plateSuggestion: "Zsírszegény gyors szénhidrát"
    },
    {
      mealType: "dinner",
      suggestedName: "Durumtészta paradicsomszósszal és sovány pulykával",
      targetCarbsGrams: 140,
      targetProteinGrams: 35,
      plateSuggestion: "2/3 tészta, 1/3 fehérje"
    }
  ]);

  const handleSave = () => {
    if (!title.trim()) return;

    const newPlan: DietitianMealPlan = {
      id: `plan_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      dietitianId: "dietitian-1",
      dietitianName,
      targetDayType,
      targetCalories,
      targetProteinGrams: targetProtein,
      targetCarbsGrams: targetCarbs,
      targetFatGrams: targetFat,
      meals,
      createdAt: new Date().toISOString()
    };

    onSavePlan(newPlan);
    onClose();
    showToast({
      title: "Étrendterv kiadva a sportolónak",
      message: `${newPlan.title} hozzárendelve az étrendhez.`,
      type: "success"
    });
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Dietetikusi Étrendterv Készítése"
      description="Szakértői struktúra és tányérjavaslatok hozzárendelése a sportoló felkészüléséhez."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Mégse
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Étrendterv kiadása
          </Button>
        </>
      }
    >
      <div className="space-y-6 py-2">
        <Input
          label="Terv elnevezése"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="pl. Versenynapi szénhidráttöltés"
          required
        />

        <Input
          label="Szakértői leírás & cél"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="pl. Verseny előtti 24 óra glikogénraktár-maximalizálása"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Cél nap típusa"
            value={targetDayType}
            onChange={(val) => setTargetDayType(val as NutritionDayType)}
            options={[
              { value: "rest", label: "Pihenőnap" },
              { value: "light", label: "Könnyű nap" },
              { value: "moderate", label: "Mérsékelt nap" },
              { value: "hard", label: "Nehéz nap" },
              { value: "competition", label: "Versenynap" }
            ]}
          />
          <NumberInput
            label="Napi összkalória (kcal)"
            value={targetCalories}
            onChange={setTargetCalories}
            min={1500}
            max={7000}
            step={50}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumberInput
            label="Fehérje (g)"
            value={targetProtein}
            onChange={setTargetProtein}
            min={50}
            max={350}
          />
          <NumberInput
            label="Szénhidrát (g)"
            value={targetCarbs}
            onChange={setTargetCarbs}
            min={100}
            max={1000}
          />
          <NumberInput
            label="Zsír (g)"
            value={targetFat}
            onChange={setTargetFat}
            min={20}
            max={200}
          />
        </div>

        {/* Structured Meals Editor */}
        <div className="space-y-3 pt-2 border-t border-border-hairline">
          <div className="flex items-center justify-between">
            <h4 className="text-13 font-semibold text-text-secondary uppercase tracking-wider">
              Tervezett étkezések és tányérjavaslatok ({meals.length})
            </h4>
          </div>

          <div className="space-y-3">
            {meals.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-14 bg-bg-surface border border-border-hairline space-y-2"
              >
                <div className="flex items-center justify-between text-12 font-bold text-text-primary">
                  <span className="text-brand uppercase tracking-wider text-11">
                    {m.mealType === "breakfast"
                      ? "Reggeli"
                      : m.mealType === "lunch"
                      ? "Ebéd"
                      : m.mealType === "dinner"
                      ? "Vacsora"
                      : m.mealType === "snack"
                      ? "Snack"
                      : "Edzés közben"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMeals(meals.filter((_, i) => i !== idx))}
                    className="text-text-tertiary hover:text-status-rest"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Input
                  value={m.suggestedName}
                  onChange={(e) => {
                    const next = [...meals];
                    next[idx]!.suggestedName = e.target.value;
                    setMeals(next);
                  }}
                  placeholder="Ételjavaslat..."
                />
                <div className="grid grid-cols-2 gap-2 text-11">
                  <NumberInput
                    label="Szénhidrát (g)"
                    value={m.targetCarbsGrams}
                    onChange={(val) => {
                      const next = [...meals];
                      next[idx]!.targetCarbsGrams = val;
                      setMeals(next);
                    }}
                    min={0}
                    max={400}
                  />
                  <NumberInput
                    label="Fehérje (g)"
                    value={m.targetProteinGrams}
                    onChange={(val) => {
                      const next = [...meals];
                      next[idx]!.targetProteinGrams = val;
                      setMeals(next);
                    }}
                    min={0}
                    max={100}
                  />
                </div>
                {m.plateSuggestion && (
                  <span className="text-11 text-text-secondary block italic">
                    Tányérmódszer: {m.plateSuggestion}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
