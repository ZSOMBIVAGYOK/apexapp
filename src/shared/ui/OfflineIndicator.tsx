import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";

export const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-status-caution/15 border-b border-status-caution/30 px-3 py-1.5 text-center text-12 font-medium text-status-caution flex items-center justify-center gap-2"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{t("pwa.offlineBanner")}</span>
    </div>
  );
};
