import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import {
  Activity,
  Dumbbell,
  Droplets,
  Heart,
  Moon,
  Zap,
  ArrowRight,
  CheckCircle2,
  Play
} from "lucide-react";

export const TodayPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [waterLiters, setWaterLiters] = useState(2.25);
  const [workoutStarted, setWorkoutStarted] = useState(false);

  const handleAddWater = () => {
    setWaterLiters((prev) => +(prev + 0.25).toFixed(2));
  };

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <section className="rounded-2xl border border-brand-muted bg-gradient-to-br from-brand-card via-slate-900 to-brand-card p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-apex-500/10 px-2.5 py-0.5 text-xs font-semibold text-apex-400 border border-apex-500/20">
                {user?.sport || "Triatlon"}
              </span>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/20 uppercase">
                {user?.level || "olympic"}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-100 sm:text-3xl">
              {t("today.greeting")}, {user?.displayName || "Sportoló"}!
            </h1>
            <p className="mt-1 text-sm text-slate-400">{t("today.recoveryStatus")}</p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/checkin")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-apex-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-brand-dark shadow-lg shadow-apex-500/20 transition-all hover:bg-apex-400 focus:outline-none focus:ring-2 focus:ring-apex-400"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            {t("today.quickCheckinBtn")}
          </button>
        </div>
      </section>

      {/* Key Biometrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Readiness Score */}
        <div className="rounded-2xl border border-apex-500/30 bg-brand-card p-5 shadow-lg">
          <div className="flex items-center justify-between text-apex-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("today.readinessScore")}
            </span>
            <Zap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-apex-400">92</span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-apex-400 h-1.5 rounded-full" style={{ width: "92%" }}></div>
          </div>
        </div>

        {/* HRV */}
        <div className="rounded-2xl border border-brand-muted bg-brand-card p-5 shadow-lg">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("today.hrvMetric")}
            </span>
            <Heart className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">88</span>
            <span className="text-xs text-slate-400">ms (+12%)</span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-400 font-medium">Paraszimpatikus dominancia</p>
        </div>

        {/* Sleep Duration */}
        <div className="rounded-2xl border border-brand-muted bg-brand-card p-5 shadow-lg">
          <div className="flex items-center justify-between text-indigo-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("today.sleepMetric")}
            </span>
            <Moon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">8.2</span>
            <span className="text-xs text-slate-400">óra (91% minőség)</span>
          </div>
          <p className="mt-2 text-[11px] text-indigo-400 font-medium">1h 45m mélyalvás</p>
        </div>

        {/* Hydration */}
        <div className="rounded-2xl border border-brand-muted bg-brand-card p-5 shadow-lg">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("nutrition.hydration")}
            </span>
            <Droplets className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-100">{waterLiters}</span>
              <span className="text-xs text-slate-400">/ 3.5 l</span>
            </div>
            <button
              type="button"
              onClick={handleAddWater}
              className="rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
            >
              +250ml
            </button>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-400 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (waterLiters / 3.5) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Focus: Today's Workout & Nutrition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planned Workout */}
        <section aria-labelledby="workout-heading" className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-apex-400" aria-hidden="true" />
                <h2 id="workout-heading" className="text-lg font-bold text-slate-100">
                  {t("today.plannedSession")}
                </h2>
              </div>
              <span className="rounded-md bg-brand-muted px-2 py-1 text-xs font-semibold text-slate-300">
                10:00 - 11:30
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-100">5 x 400m Laktát-küszöb sorozat</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Célterhelés: RPE 8.5 | Z4 pulzustartomány (168-175 bpm)
                  </p>
                </div>
                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-300 border border-rose-500/30">
                  RPE 8.5
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                <span>Időtartam: 90 perc</span>
                <span>•</span>
                <span>Tervezett terhelés: 120 TSS</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWorkoutStarted(!workoutStarted)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
                workoutStarted
                  ? "bg-emerald-600 text-white"
                  : "bg-apex-500 text-brand-dark hover:bg-apex-400 shadow-lg shadow-apex-500/20"
              }`}
            >
              {workoutStarted ? (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Edzés folyamatban...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {t("training.startSession")}
                </>
              )}
            </button>
            <Link
              to="/training"
              className="flex items-center gap-1 rounded-xl border border-brand-muted px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              {t("training.title")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Nutrition Plan */}
        <section aria-labelledby="nutrition-heading" className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-amber-400" aria-hidden="true" />
                <h2 id="nutrition-heading" className="text-lg font-bold text-slate-100">
                  {t("nutrition.title")}
                </h2>
              </div>
              <span className="text-xs font-bold text-amber-400">3 450 kcal cél</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>{t("nutrition.protein")}</span>
                  <span className="text-slate-200">140g / 185g (75%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-400 h-2 rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>{t("nutrition.carbs")}</span>
                  <span className="text-slate-200">320g / 450g (71%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-400 h-2 rounded-full" style={{ width: "71%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                  <span>{t("nutrition.fats")}</span>
                  <span className="text-slate-200">55g / 75g (73%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-cyan-400 h-2 rounded-full" style={{ width: "73%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
            <span className="text-xs text-slate-400">Sportdietetikus által jóváhagyott nap</span>
            <Link
              to="/nutrition"
              className="inline-flex items-center gap-1 text-xs font-bold text-apex-400 hover:text-apex-300 transition-colors"
            >
              {t("nutrition.logMeal")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TodayPage;
