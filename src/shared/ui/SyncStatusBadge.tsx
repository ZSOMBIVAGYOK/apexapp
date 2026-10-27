import React from "react";
import { useTranslation } from "react-i18next";
import { useSyncState } from "@shared/hooks/useSyncState";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";
import { Check, CloudOff, RefreshCw, AlertCircle } from "lucide-react";

export interface SyncStatusBadgeProps {
  className?: string;
  showText?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  className = "",
  showText = true
}) => {
  const { t } = useTranslation();
  const { status: offlineStatus, pendingCount, triggerSync } = useSyncState();
  const { status: appSaveStatus, lastError, retry } = useSyncStatusStore();

  if (appSaveStatus === "error") {
    return (
      <button
        type="button"
        onClick={() => retry()}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-caution/20 text-status-caution text-11 font-medium hover:bg-status-caution/30 transition-colors cursor-pointer ${className}`}
        title={lastError || "Hiba történt mentés közben. Kattints az újrapróbáláshoz!"}
      >
        <AlertCircle className="h-3 w-3 stroke-[2.5]" />
        {showText && <span>Mentési hiba (Újra)</span>}
      </button>
    );
  }

  if (appSaveStatus === "syncing" || offlineStatus === "syncing") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand/10 text-brand text-11 font-medium animate-pulse ${className}`}
      >
        <RefreshCw className="h-3 w-3 animate-spin" />
        {showText && <span>{t("sync.syncing", "Szinkronizálás...")}</span>}
      </div>
    );
  }

  if (offlineStatus === "pending") {
    return (
      <button
        type="button"
        onClick={() => triggerSync()}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-caution/15 text-status-caution text-11 font-medium hover:bg-status-caution/25 transition-colors cursor-pointer ${className}`}
        title={t("sync.pendingTooltip", "Kattints a kézi szinkronizáláshoz")}
      >
        <RefreshCw className="h-3 w-3" />
        {showText && (
          <span>
            {t("sync.pending", "Szinkronra vár")} ({pendingCount})
          </span>
        )}
      </button>
    );
  }

  // Offline
  if (offlineStatus === "offline") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-border-hairline text-text-tertiary text-11 font-medium ${className}`}
        title={t("sync.offlineTitle", "Offline üzemmód: a módosítások a készüléken tárolódnak")}
      >
        <CloudOff className="h-3 w-3" />
        {showText && (
          <span>
            {t("sync.offline", "Offline mentve")}
            {pendingCount > 0 ? ` (${pendingCount})` : ""}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-ready/10 text-status-ready text-11 font-medium transition-colors ${className}`}
      title={t("sync.syncedTitle", "Minden adat a felhőbe szinkronizálva")}
    >
      <Check className="h-3 w-3 stroke-[2.5]" />
      {showText && <span>{t("sync.synced", "Mentve ✓")}</span>}
    </div>
  );
};
