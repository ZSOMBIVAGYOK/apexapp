import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Apple, Droplets, Plus, Check } from "lucide-react";

export const NutritionPage: React.FC = () => {
  const { t } = useTranslation();

  const [waterLiters, setWaterLiters] = useState(2.75);
  const [loggedCalories, setLoggedCalories] = useState(2850);
  const [showLogModal, setShowLogModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState(450);

  const addWater = (amount: number) => {
    setWaterLiters((prev) => +(prev + amount).toFixed(2));
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName) return;
    setLoggedCalories((prev) => prev + mealCalories);
    setMealName("");
    setShowLogModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <Apple className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("nutrition.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("nutrition.subtitle")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLogModal(!showLogModal)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-brand-dark transition-all hover:bg-amber-400 shadow-md shadow-amber-500/20"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("nutrition.logMeal")}
        </button>
      </div>

      {showLogModal && (
        <form
          onSubmit={handleAddMeal}
          className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-xl space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-200">{t("nutrition.logMeal")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="meal-name" className="block text-xs font-semibold text-slate-400 mb-1">
                Étel megnevezése
              </label>
              <input
                id="meal-name"
                type="text"
                required
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="pl. Csirkemell rizzsel és párolt zöldséggel"
                className="w-full rounded-lg border border-brand-muted bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="meal-cal" className="block text-xs font-semibold text-slate-400 mb-1">
                Kalória (kcal)
              </label>
              <input
                id="meal-cal"
                type="number"
                min="50"
                value={mealCalories}
                onChange={(e) => setMealCalories(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-brand-muted bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-brand-dark hover:bg-amber-400"
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      )}

      {/* Calories & Macros Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl space-y-4 lg:col-span-2">
          <div className="flex justify-between items-baseline">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {t("nutrition.targetCalories")}
            </h2>
            <span className="text-2xl font-black text-amber-400">
              {loggedCalories} / 3 450 kcal
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-amber-400 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(100, (loggedCalories / 3450) * 100)}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-center">
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-xs text-rose-400 font-bold block">{t("nutrition.protein")}</span>
              <span className="text-lg font-black text-slate-100 mt-1 block">175g</span>
              <span className="text-[11px] text-slate-500">Cél: 185g</span>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-xs text-amber-400 font-bold block">{t("nutrition.carbs")}</span>
              <span className="text-lg font-black text-slate-100 mt-1 block">340g</span>
              <span className="text-[11px] text-slate-500">Cél: 450g</span>
            </div>
            <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800">
              <span className="text-xs text-cyan-400 font-bold block">{t("nutrition.fats")}</span>
              <span className="text-lg font-black text-slate-100 mt-1 block">62g</span>
              <span className="text-[11px] text-slate-500">Cél: 75g</span>
            </div>
          </div>
        </div>

        {/* Hydration Tracker */}
        <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <Droplets className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                {t("nutrition.hydration")}
              </h2>
            </div>
            <span className="text-xl font-black text-cyan-400">{waterLiters} l</span>
          </div>

          <p className="text-xs text-slate-400">
            Napi ajánlott folyadékszükséglet terhelés alapján: 3.5 liter.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addWater(0.25)}
              className="flex-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 py-2.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              +250 ml
            </button>
            <button
              type="button"
              onClick={() => addWater(0.5)}
              className="flex-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 py-2.5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-colors"
            >
              +500 ml
            </button>
          </div>

          <div className="rounded-xl bg-slate-900/60 p-3 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>Elektrolit pótlással kiegészítve</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionPage;
