import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  Button,
  SectionHeader,
  BottomSheet,
  Input,
  NumberInput,
  showToast
} from "@shared/ui";
import { Droplets, Plus, Check } from "lucide-react";

export const NutritionPage: React.FC = () => {
  const { t } = useTranslation();

  const [waterLiters, setWaterLiters] = useState(2.75);
  const [loggedCalories, setLoggedCalories] = useState(2850);
  const [showLogModal, setShowLogModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState(450);

  const addWater = (amount: number) => {
    const next = +(waterLiters + amount).toFixed(2);
    setWaterLiters(next);
    showToast({
      title: "Folyadékbevitel hozzáadva",
      message: `Összesen ma: ${next} liter`,
      type: "success"
    });
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    setLoggedCalories((prev) => prev + mealCalories);
    setMealName("");
    setShowLogModal(false);
    showToast({
      title: "Étkezés rögzítve",
      message: `${mealCalories} kcal hozzáadva a napi naplóhoz`,
      type: "success"
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title={t("nutrition.title")}
        description={t("nutrition.subtitle")}
        action={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowLogModal(true)}
          >
            {t("nutrition.logMeal")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calories & Macronutrients */}
        <Card variant="surface" radius="20" className="p-6 space-y-6 lg:col-span-2">
          <div className="flex justify-between items-baseline">
            <h3 className="text-12 font-bold uppercase tracking-wider text-text-secondary">
              {t("nutrition.targetCalories")}
            </h3>
            <span className="text-28 font-bold text-text-primary tabular-nums">
              {loggedCalories} / 3 450 kcal
            </span>
          </div>

          <div className="w-full bg-border-hairline rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-brand h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (loggedCalories / 3450) * 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border-hairline text-center">
            <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline">
              <span className="text-12 text-text-secondary font-medium block">
                {t("nutrition.protein")}
              </span>
              <span className="text-20 font-bold text-text-primary mt-1 block tabular-nums">
                175g
              </span>
              <span className="text-[11px] text-text-tertiary">Cél: 185g</span>
            </div>
            <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline">
              <span className="text-12 text-text-secondary font-medium block">
                {t("nutrition.carbs")}
              </span>
              <span className="text-20 font-bold text-text-primary mt-1 block tabular-nums">
                340g
              </span>
              <span className="text-[11px] text-text-tertiary">Cél: 450g</span>
            </div>
            <div className="rounded-16 bg-bg-elevated p-4 border border-border-hairline">
              <span className="text-12 text-text-secondary font-medium block">
                {t("nutrition.fats")}
              </span>
              <span className="text-20 font-bold text-text-primary mt-1 block tabular-nums">
                62g
              </span>
              <span className="text-[11px] text-text-tertiary">Cél: 75g</span>
            </div>
          </div>
        </Card>

        {/* Hydration Tracker */}
        <Card variant="surface" radius="20" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand">
              <Droplets className="h-5 w-5" aria-hidden="true" />
              <h3 className="text-14 font-bold uppercase tracking-wider text-text-primary">
                {t("nutrition.hydration")}
              </h3>
            </div>
            <span className="text-20 font-bold text-text-primary tabular-nums">
              {waterLiters} l
            </span>
          </div>

          <p className="text-12 text-text-secondary">
            Napi ajánlott folyadékszükséglet a mai megnövekedett laktát terhelés alapján: 3.5 liter.
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => addWater(0.25)}
            >
              +250 ml
            </Button>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => addWater(0.5)}
            >
              +500 ml
            </Button>
          </div>

          <div className="rounded-12 bg-bg-elevated p-3 border border-border-hairline flex items-center gap-2 text-12 text-text-secondary">
            <Check className="h-4 w-4 text-status-ready shrink-0" aria-hidden="true" />
            <span>Nátrium- és magnéziumpótlás rögzítve</span>
          </div>
        </Card>
      </div>

      {/* Log Meal BottomSheet / Modal */}
      <BottomSheet
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title={t("nutrition.logMeal")}
        description="Rögzítsd a bevitelt, makrókat vagy az edzés körüli táplálkozást."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={handleAddMeal}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddMeal} className="space-y-4 py-2">
          <Input
            label="Étel megnevezése"
            required
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="pl. Csirkemell jázminrizzsel és avokádóval"
          />

          <NumberInput
            label="Kalória (kcal)"
            value={mealCalories}
            onChange={setMealCalories}
            min={50}
            max={3000}
            step={25}
            unit="kcal"
          />
        </form>
      </BottomSheet>
    </div>
  );
};

export default NutritionPage;
