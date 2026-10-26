import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Activity, CheckCircle2, Sparkles } from "lucide-react";

export const CheckinPage: React.FC = () => {
  const { t } = useTranslation();

  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState(8);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress] = useState(2);
  const [energy, setEnergy] = useState(9);
  const [restingHr, setRestingHr] = useState(48);
  const [hrv, setHrv] = useState(85);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [readinessScore, setReadinessScore] = useState<number | null>(null);

  const calculateReadiness = () => {
    // Formula weighting sleep, soreness, stress and energy
    const score = Math.round(
      (sleepQuality * 3.5) +
      ((11 - soreness) * 2.5) +
      ((11 - stress) * 2.0) +
      (energy * 2.0)
    );
    return Math.min(100, Math.max(10, score));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const score = calculateReadiness();
    setReadinessScore(score);
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-apex-500/10 text-apex-400">
            <Activity className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("checkin.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("checkin.subtitle")}</p>
          </div>
        </div>

        {submitted && readinessScore !== null && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-xl border border-apex-500/40 bg-apex-500/10 p-4 text-slate-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-apex-400 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-apex-300">{t("checkin.submittedSuccess")}</p>
                <p className="text-xs text-slate-400">
                  {t("today.readinessScore")}: <span className="font-bold text-apex-400">{readinessScore} / 100</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-apex-500 px-3 py-1.5 text-xs font-bold text-brand-dark">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Optimal
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sleep Hours */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="sleep-hours" className="text-xs font-semibold text-slate-300">
                  {t("checkin.sleepHours")}
                </label>
                <span className="text-sm font-bold text-apex-400">{sleepHours} h</span>
              </div>
              <input
                id="sleep-hours"
                type="range"
                min="4"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full accent-apex-500"
              />
            </div>

            {/* Sleep Quality */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="sleep-quality" className="text-xs font-semibold text-slate-300">
                  {t("checkin.sleepQuality")}
                </label>
                <span className="text-sm font-bold text-apex-400">{sleepQuality} / 10</span>
              </div>
              <input
                id="sleep-quality"
                type="range"
                min="1"
                max="10"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(parseInt(e.target.value))}
                className="w-full accent-apex-500"
              />
            </div>

            {/* Muscle Soreness */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="soreness" className="text-xs font-semibold text-slate-300">
                  {t("checkin.soreness")}
                </label>
                <span className="text-sm font-bold text-amber-400">{soreness} / 10</span>
              </div>
              <input
                id="soreness"
                type="range"
                min="1"
                max="10"
                value={soreness}
                onChange={(e) => setSoreness(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Mental Stress */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="stress" className="text-xs font-semibold text-slate-300">
                  {t("checkin.stress")}
                </label>
                <span className="text-sm font-bold text-cyan-400">{stress} / 10</span>
              </div>
              <input
                id="stress"
                type="range"
                min="1"
                max="10"
                value={stress}
                onChange={(e) => setStress(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Energy */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="energy" className="text-xs font-semibold text-slate-300">
                  {t("checkin.energy")}
                </label>
                <span className="text-sm font-bold text-apex-400">{energy} / 10</span>
              </div>
              <input
                id="energy"
                type="range"
                min="1"
                max="10"
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="w-full accent-apex-500"
              />
            </div>

            {/* Resting HR & HRV */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex gap-4">
              <div className="flex-1">
                <label htmlFor="resting-hr" className="block text-xs font-semibold text-slate-300 mb-1">
                  {t("checkin.restingHeartRate")}
                </label>
                <input
                  id="resting-hr"
                  type="number"
                  value={restingHr}
                  onChange={(e) => setRestingHr(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-brand-muted bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-apex-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="hrv" className="block text-xs font-semibold text-slate-300 mb-1">
                  {t("checkin.hrv")}
                </label>
                <input
                  id="hrv"
                  type="number"
                  value={hrv}
                  onChange={(e) => setHrv(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-brand-muted bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-apex-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              {t("checkin.notes")}
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("checkin.notesPlaceholder")}
              className="w-full rounded-xl border border-brand-muted bg-slate-900/80 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-apex-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-apex-500 py-3.5 text-sm font-bold text-brand-dark shadow-lg shadow-apex-500/20 transition-all hover:bg-apex-400"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t("checkin.submitBtn")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckinPage;
