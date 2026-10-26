import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConnectedDevice } from "@shared/types";
import {
  Card,
  Button,
  Badge,
  SectionHeader,
  SourceBadge,
  showToast
} from "@shared/ui";
import { RefreshCw } from "lucide-react";

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

  const toggleConnection = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const next = !d.connected;
          showToast({
            title: next ? "Eszköz sikeresen csatlakoztatva" : "Eszköz leválasztva",
            message: d.name,
            type: next ? "success" : "info"
          });
          return {
            ...d,
            connected: next,
            lastSyncAt: next ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.lastSyncAt
          };
        }
        return d;
      })
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
      showToast({
        title: "Szinkronizáció kész",
        message: `${id === "garmin" ? "Garmin Connect" : "WHOOP 4.0"} adatok sikeresen frissítve`,
        type: "success"
      });
    }, 800);
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title={t("devices.title")}
        description={t("devices.subtitle")}
      />

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => (
          <Card
            key={device.id}
            variant="surface"
            radius="20"
            className="p-6 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-16 font-bold text-text-primary">{device.name}</h3>
                  {device.connected ? (
                    <Badge variant="ready" dot size="sm">
                      {t("devices.statusConnected")}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      {t("devices.statusDisconnected")}
                    </Badge>
                  )}
                </div>

                <SourceBadge
                  source={
                    device.provider === "garmin"
                      ? "Garmin"
                      : device.provider === "whoop"
                      ? "WHOOP"
                      : "Manual"
                  }
                />
              </div>

              <p className="text-12 text-text-secondary mt-1">
                {device.connected
                  ? `${t("devices.lastSync")}: ${device.lastSyncAt}`
                  : "Kapcsolódj a felhőn keresztüli közvetlen adatszinkronhoz"}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border-hairline">
              <Button
                variant={device.connected ? "danger" : "primary"}
                size="sm"
                fullWidth
                onClick={() => toggleConnection(device.id)}
              >
                {device.connected ? t("devices.disconnect") : t("devices.connect")}
              </Button>

              {device.connected && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${syncingId === device.id ? "animate-spin text-brand" : ""}`}
                      aria-hidden="true"
                    />
                  }
                  isLoading={syncingId === device.id}
                  onClick={() => handleSync(device.id)}
                >
                  {t("devices.syncNow")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DevicesPage;
