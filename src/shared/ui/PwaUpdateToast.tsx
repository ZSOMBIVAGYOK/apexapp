import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, X } from "lucide-react";
import { usePwaUpdate } from "@shared/lib/pwa/usePwaUpdate";

export const PwaUpdateToast: React.FC = () => {
  const { t } = useTranslation();
  const { needRefresh, reload, close } = usePwaUpdate();

  if (!needRefresh) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-apex-500/40 bg-brand-card/95 p-4 shadow-2xl backdrop-blur-md md:bottom-6 md:right-6 md:left-auto md:w-96"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-apex-500/20 p-2 text-apex-400">
          <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-100">{t("pwa.updateAvailable")}</h3>
          <p className="mt-1 text-xs text-slate-400">{t("pwa.updateDesc")}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="flex items-center gap-1.5 rounded-lg bg-apex-500 px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-apex-400 focus:outline-none focus:ring-2 focus:ring-apex-400 focus:ring-offset-2 focus:ring-offset-brand-card"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("pwa.reloadBtn")}
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t("common.cancel")}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
