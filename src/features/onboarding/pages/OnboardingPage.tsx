import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { AthleteLevel, UserRole } from "@shared/types";
import { Award, CheckCircle2 } from "lucide-react";

export const OnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUserProfile } = useAuthStore();

  const [sport, setSport] = useState(user?.sport || "Triatlon / Úszás");
  const [level, setLevel] = useState<AthleteLevel>(user?.level || "olympic");
  const [role, setRole] = useState<UserRole>(user?.role || "athlete");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      setUserProfile({
        ...user,
        sport,
        level,
        role,
        updatedAt: new Date().toISOString()
      });
    }
    setSaved(true);
    setTimeout(() => {
      navigate("/");
    }, 600);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-apex-500/10 text-apex-400">
            <Award className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("onboarding.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("onboarding.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="sport" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              {t("onboarding.sportLabel")}
            </label>
            <input
              id="sport"
              type="text"
              required
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder={t("onboarding.sportPlaceholder")}
              className="w-full rounded-xl border border-brand-muted bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-apex-500 focus:outline-none focus:ring-1 focus:ring-apex-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              {t("onboarding.levelLabel")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["olympic", "national", "hobby"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    level === lvl
                      ? "border-apex-500 bg-apex-500/10 text-apex-400"
                      : "border-brand-muted bg-slate-900/60 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {lvl === "olympic"
                      ? t("onboarding.levelOlympic")
                      : lvl === "national"
                      ? t("onboarding.levelNational")
                      : t("onboarding.levelHobby")}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              {t("onboarding.roleLabel")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["athlete", "coach", "specialist"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    role === r
                      ? "border-apex-500 bg-apex-500/10 text-apex-400"
                      : "border-brand-muted bg-slate-900/60 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {r === "athlete"
                      ? t("onboarding.roleAthlete")
                      : r === "coach"
                      ? t("onboarding.roleCoach")
                      : t("onboarding.roleSpecialist")}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-apex-500 py-3 text-sm font-bold text-brand-dark shadow-lg shadow-apex-500/20 transition-all hover:bg-apex-400"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("common.confirm")}
              </>
            ) : (
              t("onboarding.completeBtn")
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingPage;
