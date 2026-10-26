import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConnectedDevice } from "@shared/types";
import { Smartphone, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";

export const DevicesPage: React.FC = () => {
  const { t } = useTranslation();

  const [devices, setDevices] = useState<ConnectedDevice[]>([
    {
      id: "garmin",
      provider: "garmin",
      name: t("devices.garmin"),
      connected: true,
      lastSyncAt: "2026-10-26 15:45"
    },
    {
      id: "whoop",
      provider: "whoop",
      name: t("devices.whoop"),
      connected: true,
      lastSyncAt: "2026-10-26 16:10"
    },
    {
      id: "apple_health",
      provider: "apple_health",
      name: t("devices.appleHealth"),
      connected: false,
      lastSyncAt: null
    },
    {
      id: "polar",
      provider: "polar",
      name: t("devices.polar"),
      connected: false,
      lastSyncAt: null
    }
  ]);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              connected: !d.connected,
              lastSyncAt: !d.connected ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.lastSyncAt
            }
          : d
      )
    );
  };

  const handleSync = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                lastSyncAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            : d
        )
      );
      setSyncingId(null);
      setSyncFeedback(t("devices.syncSuccess"));
      setTimeout(() => setSyncFeedback(null), 3000);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-muted bg-brand-card p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Smartphone className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">{t("devices.title")}</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{t("devices.subtitle")}</p>
          </div>
        </div>
      </div>

      {syncFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => (
          <div
            key={device.id}
            className="rounded-2xl border border-brand-muted bg-brand-card p-5 shadow-lg flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">{device.name}</h2>
                  {device.connected && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      {t("devices.statusConnected")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {device.connected
                    ? `${t("devices.lastSync")}: ${device.lastSyncAt}`
                    : t("devices.statusDisconnected")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => toggleConnection(device.id)}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  device.connected
                    ? "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    : "bg-apex-500 text-brand-dark hover:bg-apex-400 shadow-md shadow-apex-500/20"
                }`}
              >
                {device.connected ? t("devices.disconnect") : t("devices.connect")}
              </button>

              {device.connected && (
                <button
                  type="button"
                  onClick={() => handleSync(device.id)}
                  disabled={syncingId === device.id}
                  className="rounded-xl border border-brand-muted bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${syncingId === device.id ? "animate-spin text-apex-400" : ""}`}
                    aria-hidden="true"
                  />
                  {t("devices.syncNow")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DevicesPage;
