import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TrainingSession } from "@shared/types";
import { Dumbbell, Plus, CheckCircle2, Clock, Zap } from "lucide-react";

export const TrainingPage: React.FC = () => {
  const { t } = useTranslation();

  const [sessions, setSessions] = useState<TrainingSession[]>([
    {
      id: "train-1",
      athleteId: "demo-athlete-001",
      date: "2026-10-26",
      title: "5 x 400m Laktát-küszöb sorozat (Úszás)",
      type: "threshold",
      durationMinutes: 90,
      targetIntensityRpe: 8.5,
      actualRpe: 8,
      completed: true,
      notes: "Egyenletes 1:08-as 100 méteres részidők."
    },
    {
      id: "train-2",
      athleteId: "demo-athlete-001",
      date: "2026-10-26",
      title: "Délutáni Aerob Bázis Futás (Z2)",
      type: "endurance",
      durationMinutes: 60,
      targetIntensityRpe: 6,
      completed: false
    },
    {
      id: "train-3",
      athleteId: "demo-athlete-001",
      date: "2026-10-27",
      title: "Erőfejlesztés & Posterior Chain Stabilitás",
      type: "strength",
      durationMinutes: 75,
      targetIntensityRpe: 7.5,
      completed: false
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(45);
  const [newRpe, setNewRpe] = useState(7);

  const toggleComplete = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newSession: TrainingSession = {
      id: `train-${Date.now()}`,
      athleteId: "demo-athlete-001",
      date: new Date().toISOString().split("T")[0] || "2026-10-26",
      title: newTitle.trim(),
      type: "endurance",
      durationMinutes: newDuration,
      targetIntensityRpe: newRpe,
      completed: false
    };

    setSessions([newSession, ...sessions]);
    setNewTitle("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-apex-500/10 text-apex-400">
            <Dumbbell className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("training.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("training.subtitle")}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-apex-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-brand-dark transition-all hover:bg-apex-400 shadow-md shadow-apex-500/20"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("training.logSession")}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddSession}
          className="rounded-2xl border border-apex-500/30 bg-slate-900/90 p-5 shadow-xl space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-200">{t("training.logSession")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="session-title" className="block text-xs font-semibold text-slate-400 mb-1">
                Megnevezés
              </label>
              <input
                id="session-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="pl. 10x100m gyorsúszás felkészülés"
                className="w-full rounded-lg border border-brand-muted bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-apex-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="session-duration" className="block text-xs font-semibold text-slate-400 mb-1">
                {t("training.duration")}
              </label>
              <input
                id="session-duration"
                type="number"
                min="10"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-brand-muted bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-apex-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="session-rpe" className="block text-xs font-semibold text-slate-400 mb-1">
                RPE (1-10)
              </label>
              <input
                id="session-rpe"
                type="number"
                min="1"
                max="10"
                value={newRpe}
                onChange={(e) => setNewRpe(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-brand-muted bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-apex-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-apex-500 px-4 py-1.5 text-xs font-bold text-brand-dark hover:bg-apex-400"
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`rounded-2xl border p-5 transition-all shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              session.completed
                ? "border-emerald-500/20 bg-emerald-950/10 text-slate-300"
                : "border-brand-muted bg-brand-card hover:border-slate-700"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                    session.completed
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-apex-500/10 text-apex-400"
                  }`}
                >
                  {session.type}
                </span>
                <span className="text-xs text-slate-400">{session.date}</span>
              </div>
              <h2 className="text-base font-bold text-slate-100">{session.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {session.durationMinutes} perc
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  RPE {session.targetIntensityRpe} / 10
                </span>
                {session.notes && <span className="italic text-slate-500">{session.notes}</span>}
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleComplete(session.id)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                session.completed
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-200 hover:bg-apex-500 hover:text-brand-dark"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {session.completed ? t("training.completed") : t("training.startSession")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainingPage;
