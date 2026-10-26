import React from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@shared/lib/pwa/usePwaInstall";

export const PwaInstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isInstallable, promptInstall, dismiss } = usePwaInstall();

  if (!isInstallable) {
    return null;
  }

  return (
    <aside
      role="banner"
      aria-label={t("pwa.installTitle")}
      className="relative border-b border-brand-muted bg-gradient-to-r from-brand-card via-slate-900 to-brand-card px-4 py-3 text-slate-200"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-apex-500/10 text-apex-400">
            <Download className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-100 sm:text-sm">{t("pwa.installTitle")}</p>
            <p className="text-xs text-slate-400 hidden sm:block">{t("pwa.installDesc")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={promptInstall}
            className="rounded-lg bg-apex-500 px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-apex-400 focus:outline-none focus:ring-2 focus:ring-apex-400"
          >
            {t("pwa.installBtn")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("pwa.dismissBtn")}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
};
