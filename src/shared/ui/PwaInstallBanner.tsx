import React from "react";
import { useTranslation } from "react-i18next";
import { Download, X } from "lucide-react";
import { usePwaInstall } from "@shared/lib/pwa/usePwaInstall";
import { Button } from "./Button";

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
      className="relative border-b border-border-hairline bg-bg-surface px-4 py-2.5 text-text-primary"
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-12 bg-brand/10 text-brand">
            <Download className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-12 font-semibold text-text-primary sm:text-14">{t("pwa.installTitle")}</p>
            <p className="text-12 text-text-secondary hidden sm:block">{t("pwa.installDesc")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={promptInstall}
          >
            {t("pwa.installBtn")}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("pwa.dismissBtn")}
            className="rounded-8 p-1 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
};
