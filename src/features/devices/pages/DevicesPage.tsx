import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DeviceProvider,
  MetricPriorityConfig,
  DEFAULT_METRIC_PRIORITIES,
  FileImportItem,
  FileImportBatchResult,
  NormalizedActivity
} from "@shared/types/devices";
import { useAppMode } from "@shared/hooks/useAppMode";
import {
  Card,
  Button,
  Badge,
  SectionHeader,
  SourceBadge,
  showToast
} from "@shared/ui";
import {
  RefreshCw,
  Sliders,
  History,
  Trash2,
  AlertTriangle,
  Send,
  Smartphone,
  Layers,
  Sparkles
} from "lucide-react";
import { FileUploadZone } from "../components/FileUploadZone";
import { ImportHistoryModal } from "../components/ImportHistoryModal";
import { PrioritySettingsModal } from "../components/PrioritySettingsModal";
import { DeleteProviderDataModal } from "../components/DeleteProviderDataModal";
import { getDeviceAdapter } from "@shared/lib/devices";

interface DeviceCardState {
  provider: DeviceProvider;
  name: string;
  connected: boolean;
  lastSyncAt: string | null;
  status: "connected" | "disconnected" | "syncing" | "error";
  dataQualityHint?: string;
  description: string;
  isMockActive?: boolean;
}

export const DevicesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isManualOnly, setDataMode } = useAppMode();

  // Device Connections State
  const [devices, setDevices] = useState<DeviceCardState[]>([
    {
      provider: "garmin",
      name: "Garmin Connect",
      connected: true,
      lastSyncAt: "Ma, 15:45",
      status: "connected",
      dataQualityHint: "Garmin: 2 edzés mellkaspánt nélkül rögzítve (optikai pulzus)",
      description: "Edzések, GPS nyomvonal, futódinamika, pedálfordulás és wattok.",
      isMockActive: true
    },
    {
      provider: "whoop",
      name: "WHOOP 4.0",
      connected: true,
      lastSyncAt: "Ma, 16:10",
      status: "connected",
      dataQualityHint: "WHOOP: Nincs HRV adat az elmúlt 2 éjszakán - viseld a pántot közelebb a csuklócsonthoz",
      description: "Éjszakai alvásfázisok, HRV (RMSSD), nyugalmi pulzus és Day Strain.",
      isMockActive: true
    },
    {
      provider: "polar",
      name: "Polar AccessLink",
      connected: false,
      lastSyncAt: null,
      status: "disconnected",
      description: "Polar Flow edzés tranzakciók, Cardio Load és Nightly Recharge adatok.",
      isMockActive: true
    },
    {
      provider: "oura",
      name: "Oura Ring v2",
      connected: false,
      lastSyncAt: null,
      status: "disconnected",
      description: "Alvásminőség, bőrhőmérséklet-eltérés és cirkadián ritmus analízis.",
      isMockActive: true
    }
  ]);

  // Aggregator state (disabled by default)
  const [aggregatorEnabled, setAggregatorEnabled] = useState(false);

  // Metric Priorities State
  const [priorities, setPriorities] = useState<MetricPriorityConfig>({
    ...DEFAULT_METRIC_PRIORITIES
  });

  // Import History State
  const [importHistory, setImportHistory] = useState<FileImportItem[]>([
    {
      id: "hist_sample_1",
      fileName: "2026-10-25_Morning_Run.fit",
      fileType: "fit",
      fileSizeBytes: 42300,
      status: "created",
      activity: {
        id: "act_fit_1",
        userId: "self",
        provider: "file",
        providerRecordId: "fit_sample_1",
        sport: "running",
        title: "Reggeli futás",
        startTime: "2026-10-25T07:15:00.000Z",
        durationSeconds: 3600,
        distanceMeters: 10500,
        trainingLoad: 72,
        sourceConfidence: 0.99,
        createdAt: "2026-10-25T08:20:00.000Z"
      },
      uploadedAt: "2026-10-25T08:20:00.000Z"
    }
  ]);

  // Modals state
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ provider: DeviceProvider; name: string } | null>(null);

  // Sync state
  const [syncingProvider, setSyncingProvider] = useState<DeviceProvider | null>(null);
  const [isNativeTesting, setIsNativeTesting] = useState(false);

  // Connect / Disconnect handler
  const handleToggleConnect = async (provider: DeviceProvider) => {
    const dev = devices.find((d) => d.provider === provider);
    if (!dev) return;

    if (dev.connected) {
      // Disconnect
      setDevices((prev) =>
        prev.map((d) => (d.provider === provider ? { ...d, connected: false, status: "disconnected" } : d))
      );
      showToast({
        title: "Eszköz leválasztva",
        message: `${dev.name} leválasztva. Az új adatok szinkronizálása leállt.`,
        type: "info"
      });
    } else {
      // Connect
      const adapter = getDeviceAdapter(provider, true);
      await adapter.connect("current-user", "https://app.apex/devices/callback");

      setDevices((prev) =>
        prev.map((d) =>
          d.provider === provider
            ? {
                ...d,
                connected: true,
                status: "connected",
                lastSyncAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            : d
        )
      );

      showToast({
        title: "Eszköz sikeresen csatlakoztatva",
        message: `${dev.name} összekapcsolva (Demo MOCK mód aktív).`,
        type: "success"
      });
    }
  };

  // Sync Now handler
  const handleSyncNow = async (provider: DeviceProvider) => {
    setSyncingProvider(provider);
    const dev = devices.find((d) => d.provider === provider);

    try {
      const adapter = getDeviceAdapter(provider, true);
      const backfill = await adapter.backfill("current-user", new Date());

      setTimeout(() => {
        setDevices((prev) =>
          prev.map((d) =>
            d.provider === provider
              ? {
                  ...d,
                  lastSyncAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                }
              : d
          )
        );
        setSyncingProvider(null);

        showToast({
          title: "Szinkronizáció kész",
          message: `${dev?.name}: ${backfill.activities.length} edzés és biometriai adatok frissítve.`,
          type: "success"
        });
      }, 700);
    } catch {
      setSyncingProvider(null);
      showToast({
        title: "Szinkronizációs hiba",
        message: "Nem sikerült az adatok lekérése.",
        type: "error"
      });
    }
  };

  // Delete Provider Data handler
  const handleConfirmDeleteData = (provider: DeviceProvider) => {
    // Clear data quality hint and update sync time
    setDevices((prev) =>
      prev.map((d) => (d.provider === provider ? { ...d, dataQualityHint: undefined } : d))
    );
  };

  // File Import handler
  const handleFileImportComplete = (result: FileImportBatchResult) => {
    setImportHistory((prev) => [...result.items, ...prev]);
  };

  // Native Ingestion Test Simulator
  const handleSimulateNativeHealth = () => {
    setIsNativeTesting(true);

    setTimeout(() => {
      setIsNativeTesting(false);
      showToast({
        title: "Native HealthKit Ingestion Sikeres",
        message: "Tesztcsomag (1 futás, 1 alvásciklus, HRV) elküldve a POST /ingest/health végpontra.",
        type: "success"
      });
    }, 900);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader
          title={t("devices.title", "Eszközintegráció és Érzékelők")}
          description={t(
            "devices.subtitle",
            "Egyesített biometrikus adatfolyam: Garmin, WHOOP, Polar, Oura, fájlimport és natív wrapper."
          )}
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPriorityModalOpen(true)}
            leftIcon={<Sliders className="h-4 w-4" />}
          >
            Prioritások
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsHistoryModalOpen(true)}
            leftIcon={<History className="h-4 w-4" />}
          >
            Előzmények
          </Button>
        </div>
      </div>

      {/* Manual Mode Banner */}
      {isManualOnly && (
        <Card
          variant="surface"
          radius="20"
          className="p-5 border border-brand/20 bg-brand/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-12 bg-brand/10 text-brand shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-14 font-semibold text-text-primary">Eszköz csatlakoztatása később is lehetséges</h3>
              <p className="text-12 text-text-secondary mt-1 leading-relaxed">
                Jelenleg kézi naplózó módban vagy. Egy okosóra vagy pulzuspánt csatlakoztatásakor az alvási
                fázisok, az éjszakai HRV és az edzésterhelés automatikusan bekerül a readiness motorba, így
                jóval kevesebb gépeléssel kapsz mélyebb edzéskészültségi elemzést.
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDataMode("hybrid")} className="shrink-0">
            Váltás Hibrid módra
          </Button>
        </Card>
      )}

      {/* Active Data Quality Diagnostic Hints */}
      {devices.some((d) => d.connected && d.dataQualityHint) && (
        <div className="space-y-2">
          {devices
            .filter((d) => d.connected && d.dataQualityHint)
            .map((dev) => (
              <div
                key={dev.provider}
                className="flex items-center justify-between p-3.5 rounded-14 bg-caution/10 border border-caution/20 text-12 text-text-primary"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-caution shrink-0" />
                  <span className="truncate">{dev.dataQualityHint}</span>
                </div>
                <SourceBadge source={dev.provider} size="sm" />
              </div>
            ))}
        </div>
      )}

      {/* Section 1: Connected Devices Grid */}
      <div className="space-y-3">
        <h2 className="text-16 font-semibold text-text-primary">Csatlakoztatott eszközök</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => (
            <Card
              key={device.provider}
              variant="surface"
              radius="20"
              className="p-5 flex flex-col justify-between space-y-4 border border-border-hairline"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-16 font-bold text-text-primary">{device.name}</h3>
                      {device.connected ? (
                        <Badge variant="ready" dot size="sm">
                          Csatlakoztatva
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Nincs kapcsolat
                        </Badge>
                      )}
                    </div>
                    <p className="text-12 text-text-secondary">{device.description}</p>
                  </div>

                  <SourceBadge source={device.provider} />
                </div>

                <div className="mt-3 pt-3 border-t border-border-hairline flex items-center justify-between text-11 text-text-tertiary">
                  <span>
                    {device.connected
                      ? `Utolsó szinkronizáció: ${device.lastSyncAt}`
                      : "Felhő alapú OAuth 2.0 szinkronizáció"}
                  </span>
                  {device.isMockActive && (
                    <span className="text-10 px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-brand border border-brand/20">
                      MOCK ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant={device.connected ? "secondary" : "primary"}
                  size="sm"
                  fullWidth
                  onClick={() => handleToggleConnect(device.provider)}
                >
                  {device.connected ? "Leválasztás" : "Csatlakozás"}
                </Button>

                {device.connected && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={syncingProvider === device.provider}
                      leftIcon={
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            syncingProvider === device.provider ? "animate-spin text-brand" : ""
                          }`}
                        />
                      }
                      onClick={() => handleSyncNow(device.provider)}
                    >
                      Szinkronizálás
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      title="Adatok törlése erről az eszközről"
                      onClick={() => setDeleteTarget({ provider: device.provider, name: device.name })}
                      className="text-text-tertiary hover:text-rest px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Section 2: File Import (Level 1 Fully Built) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-16 font-semibold text-text-primary">Fájl importálás (FIT / TCX / GPX / CSV)</h2>
            <p className="text-12 text-text-secondary">
              Töltsd fel közvetlenül a készülékedről exportált edzésfájlokat felhő- vagy internetkapcsolat nélkül.
            </p>
          </div>
          <SourceBadge source="file" />
        </div>

        <FileUploadZone
          onImportComplete={handleFileImportComplete}
          existingActivities={
            importHistory
              .map((h) => h.activity)
              .filter((a): a is NormalizedActivity => Boolean(a))
          }
        />
      </div>

      {/* Section 3: Aggregator Abstraction & Native Wrapper Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Native Wrapper Card */}
        <Card variant="surface" radius="20" className="p-5 space-y-4 border border-border-hairline">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-12 bg-surface-elevated text-text-primary border border-border-hairline">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-15 font-semibold text-text-primary">Apple Health / Health Connect</h3>
                  <Badge variant="caution" size="sm">
                    Hamarosan
                  </Badge>
                </div>
                <p className="text-11 text-text-secondary mt-0.5">Natív Capacitor / iOS & Android wrapper</p>
              </div>
            </div>
          </div>

          <p className="text-12 text-text-secondary leading-relaxed">
            A backend felkészült a natív bridge fogadására: a nyílt <code className="font-mono text-brand">POST /ingest/health</code>{" "}
            végpont közvetlenül táplálja be a HealthKit és Health Connect biometriai csomagokat a meglévő
            adatfeldolgozó motorba szervermódosítás nélkül.
          </p>

          <Button
            variant="secondary"
            size="sm"
            fullWidth
            isLoading={isNativeTesting}
            leftIcon={<Send className="h-3.5 w-3.5" />}
            onClick={handleSimulateNativeHealth}
          >
            Minta tesztcsomag beküldése
          </Button>
        </Card>

        {/* Aggregator Adapter Card (Terra / Junction) */}
        <Card variant="surface" radius="20" className="p-5 space-y-4 border border-border-hairline">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-12 bg-surface-elevated text-brand border border-border-hairline">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-15 font-semibold text-text-primary">Aggregator (Terra / Junction)</h3>
                  <Badge variant={aggregatorEnabled ? "ready" : "neutral"} size="sm">
                    {aggregatorEnabled ? "Engedélyezve" : "Alapértelmezetten tiltva"}
                  </Badge>
                </div>
                <p className="text-11 text-text-secondary mt-0.5">Egységes multi-provider aggregátor híd</p>
              </div>
            </div>
          </div>

          <p className="text-12 text-text-secondary leading-relaxed">
            Opcionális felhőaggregátor réteg, amely több mint 200 fitness eszközt (pl. Coros, Suunto, Wahoo) képes
            egyetlen integrációs végpont mögé vonni.
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant={aggregatorEnabled ? "secondary" : "primary"}
              size="sm"
              fullWidth
              onClick={() => {
                const next = !aggregatorEnabled;
                setAggregatorEnabled(next);
                showToast({
                  title: next ? "Aggregátor engedélyezve" : "Aggregátor letiltva",
                  message: next ? "A Terra / Junction adapter aktív." : "Az adapter inaktív állapotba került.",
                  type: next ? "success" : "info"
                });
              }}
            >
              {aggregatorEnabled ? "Aggregátor kikapcsolása" : "Aggregátor bekapcsolása"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <PrioritySettingsModal
        isOpen={isPriorityModalOpen}
        onClose={() => setIsPriorityModalOpen(false)}
        currentPriorities={priorities}
        onSave={(updated) => setPriorities(updated)}
      />

      <ImportHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={importHistory}
        onClearHistory={() => setImportHistory([])}
      />

      <DeleteProviderDataModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        provider={deleteTarget?.provider || null}
        providerName={deleteTarget?.name || ""}
        onConfirmDelete={handleConfirmDeleteData}
      />
    </div>
  );
};

export default DevicesPage;
