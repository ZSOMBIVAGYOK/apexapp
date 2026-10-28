import React from "react";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";
import { CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "./Button";

interface ServerSyncBannerProps {
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
  showSuccessBadge?: boolean;
}

export const ServerSyncBanner: React.FC<ServerSyncBannerProps> = ({
  onRetry,
  isRetrying = false,
  className = "",
  showSuccessBadge = true
}) => {
  const { isCacheFallback, cacheNoticeMessage, isOnline, lastServerReadAt } = useSyncStatusStore();

  const handleRetry = async () => {
    if (onRetry) {
      await onRetry();
    } else {
      await useSyncStatusStore.getState().retry();
    }
  };

  if (isCacheFallback || !isOnline) {
    return (
      <div
        role="alert"
        className={`mb-3 p-3 rounded-12 border border-status-caution/40 bg-status-caution/10 text-status-caution flex items-center justify-between gap-3 text-12 font-medium ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CloudOff className="h-4 w-4 shrink-0 text-status-caution" />
          <span className="truncate">
            {!isOnline
              ? "Nincs internetkapcsolat. Helyi gyorsítótár adatai láthatók."
              : cacheNoticeMessage || "Nem sikerült elérni a szervert, lehet, hogy nem a legfrissebb adatot látod."}
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 h-7 text-11 px-2.5 bg-status-caution/20 hover:bg-status-caution/30 border-status-caution/30 text-text-primary"
          onClick={handleRetry}
          disabled={isRetrying}
          leftIcon={<RefreshCw className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`} />}
        >
          {isRetrying ? "Frissítés..." : "Újra"}
        </Button>
      </div>
    );
  }

  if (showSuccessBadge && lastServerReadAt) {
    return (
      <div className={`mb-2 flex items-center gap-1.5 text-11 text-text-tertiary ${className}`}>
        <CheckCircle2 className="h-3 w-3 text-status-ready" />
        <span>Szerverről szinkronizálva</span>
      </div>
    );
  }

  return null;
};
