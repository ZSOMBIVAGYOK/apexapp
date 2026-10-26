import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, X } from "lucide-react";
import { usePwaUpdate } from "@shared/lib/pwa/usePwaUpdate";
import { Button } from "./Button";

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
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-20 border border-brand/30 bg-bg-surface/95 p-4 shadow-elevated backdrop-blur-md md:bottom-6 md:right-6 md:left-auto md:w-96"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-12 bg-brand/10 p-2 text-brand">
          <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-14 font-semibold text-text-primary">{t("pwa.updateAvailable")}</h3>
          <p className="mt-1 text-12 text-text-secondary leading-normal">{t("pwa.updateDesc")}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={reload}
            >
              {t("pwa.reloadBtn")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={close}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t("common.cancel")}
          className="rounded-8 p-1 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
