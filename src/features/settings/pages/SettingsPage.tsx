import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { Settings, Globe, Shield, User, Cpu } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const isEmulatorActive = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
            <Settings className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("settings.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("settings.subtitle")}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* User Profile Card */}
          <section aria-labelledby="profile-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-apex-500/20 text-apex-400 font-bold">
                  <User className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="profile-heading" className="text-sm font-bold text-slate-100">
                    {user?.displayName || "Sportoló"}
                  </h2>
                  <p className="text-xs text-slate-400">{user?.email || "olimpikon@apex.hu"}</p>
                </div>
              </div>
              <Link
                to="/onboarding"
                className="rounded-lg border border-brand-muted bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Módosítás
              </Link>
            </div>
          </section>

          {/* Language Selection */}
          <section aria-labelledby="language-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Globe className="h-4 w-4 text-apex-400" aria-hidden="true" />
              <h2 id="language-heading" className="text-sm font-bold">
                {t("settings.languagePref")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => changeLanguage("hu")}
                className={`rounded-xl border p-3 text-center text-xs font-bold transition-all ${
                  i18n.language.startsWith("hu")
                    ? "border-apex-500 bg-apex-500/10 text-apex-400"
                    : "border-brand-muted bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("common.hungarian")} (HU)
              </button>
              <button
                type="button"
                onClick={() => changeLanguage("en")}
                className={`rounded-xl border p-3 text-center text-xs font-bold transition-all ${
                  i18n.language.startsWith("en")
                    ? "border-apex-500 bg-apex-500/10 text-apex-400"
                    : "border-brand-muted bg-slate-950 text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("common.english")} (EN)
              </button>
            </div>
          </section>

          {/* System & Firebase Status */}
          <section aria-labelledby="system-heading" className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Cpu className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <h2 id="system-heading" className="text-sm font-bold">
                Rendszer & Architektúra
              </h2>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span>{t("settings.version")}</span>
                <span className="font-mono text-slate-200">v0.1.0-alpha (Phase 1)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800">
                <span>{t("settings.offlineMode")}</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  Service Worker Aktív
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Firebase Emulator csatlakozás</span>
                <span
                  className={`font-semibold ${
                    isEmulatorActive ? "text-amber-400" : "text-slate-400"
                  }`}
                >
                  {isEmulatorActive ? "Emulátor mód" : "Éles Firebase Cloud"}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
