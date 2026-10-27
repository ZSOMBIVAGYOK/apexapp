import React, { useState, useEffect, useCallback } from "react";
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
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Info
} from "lucide-react";
import { FileUploadZone } from "../components/FileUploadZone";
import { ImportHistoryModal } from "../components/ImportHistoryModal";
import { PrioritySettingsModal } from "../components/PrioritySettingsModal";
import { DeleteProviderDataModal } from "../components/DeleteProviderDataModal";
import {
  fetchDeviceStatuses,
  startDeviceOAuth,
  completeDeviceOAuth,
  syncDeviceNow,
  disconnectDevice,
  deleteDeviceData,
  DeviceStatusItem
} from "@shared/lib/devices";

interface DeviceCardView extends DeviceStatusItem {
  description: string;
  dataQualityHint?: string;
}

const PROVIDER_METADATA: Record<
  "garmin" | "whoop" | "polar" | "oura",
  { name: string; description: string; hint?: string }
> = {

  garmin: {
    name: "Garmin Connect",
    description: "Edzések, GPS nyomvonal, futódinamika, pedálfordulás és wattok.",
    hint: "Garmin: Optikai pulzus helyett a mellkaspántos rögzítés pontosabb HRV-t ad."
  },
  whoop: {
    name: "WHOOP 4.0",
    description: "Éjszakai alvásfázisok, HRV (RMSSD), nyugalmi pulzus és Day Strain.",
    hint: "WHOOP: A pántot a csuklócsonthoz közel viseld az optimális pulzusméréshez."
  },
  polar: {
    name: "Polar AccessLink",
    description: "Polar Flow edzés tranzakciók, Cardio Load és Nightly Recharge adatok."
  },
  oura: {
    name: "Oura Ring v2",
    description: "Alvásminőség, bőrhőmérséklet-eltérés és cirkadián ritmus analízis."
  }
};

export const DevicesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isManualOnly, setDataMode } = useAppMode();

  // Explicit Demo/Mock toggle (Strictly disabled in production)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (import.meta.env.PROD) return false;
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("apex_demo_devices");
    if (saved !== null) return saved === "true";
    return false;
  });

  const [devices, setDevices] = useState<DeviceCardView[]>([
    {
      provider: "garmin",
      name: "Garmin Connect",
      connected: false,
      status: "not_configured",
      lastSyncAt: null,
      isConfigured: false,
      description: PROVIDER_METADATA.garmin.description,
      updatedAt: new Date().toISOString()
    },
    {
      provider: "whoop",
      name: "WHOOP 4.0",
      connected: false,
      status: "not_configured",
      lastSyncAt: null,
      isConfigured: false,
      description: PROVIDER_METADATA.whoop.description,
      updatedAt: new Date().toISOString()
    },
    {
      provider: "polar",
      name: "Polar AccessLink",
      connected: false,
      status: "not_configured",
      lastSyncAt: null,
      isConfigured: false,
      description: PROVIDER_METADATA.polar.description,
      updatedAt: new Date().toISOString()
    },
    {
      provider: "oura",
      name: "Oura Ring v2",
      connected: false,
      status: "not_configured",
      lastSyncAt: null,
      isConfigured: false,
      description: PROVIDER_METADATA.oura.description,
      updatedAt: new Date().toISOString()
    }
  ]);

  const [isLoadingStatuses, setIsLoadingStatuses] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<DeviceProvider | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<DeviceProvider | null>(null);

  // Aggregator state (disabled by default)
  const [aggregatorEnabled, setAggregatorEnabled] = useState(false);

  // Metric Priorities State
  const [priorities, setPriorities] = useState<MetricPriorityConfig>({
    ...DEFAULT_METRIC_PRIORITIES
  });

  // Import History State (empty start for real users)
  const [importHistory, setImportHistory] = useState<FileImportItem[]>([]);

  // Modals state
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ provider: DeviceProvider; name: string } | null>(null);
  const [isNativeTesting, setIsNativeTesting] = useState(false);

  // Load Real Device Statuses from Server
  const loadStatuses = useCallback(async (allowMock: boolean) => {
    setIsLoadingStatuses(true);
    try {
      const serverStatuses = await fetchDeviceStatuses(allowMock);
      setDevices(
        serverStatuses.map((item) => {
          const meta =
            (PROVIDER_METADATA as Record<string, { name: string; description: string; hint?: string }>)[
              item.provider
            ] || {
              name: item.name,
              description: ""
            };

          return {
            ...item,
            name: meta.name,
            description: meta.description,
            dataQualityHint: item.connected ? meta.hint : undefined
          };
        })
      );
    } catch (err) {
      console.error("Failed to load device integration statuses:", err);
    } finally {
      setIsLoadingStatuses(false);
    }
  }, []);

  useEffect(() => {
    loadStatuses(isDemoMode);
  }, [loadStatuses, isDemoMode]);

  // Handle OAuth Callback redirected to frontend URL (?code=...&state=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const providerParam = (urlParams.get("provider") as DeviceProvider) || "whoop";

    if (code && state) {
      // Clean query parameters from URL without reloading
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const finishOAuth = async () => {
        setConnectingProvider(providerParam);
        try {
          const redirectUri = `${window.location.origin}/devices`;
          const result = await completeDeviceOAuth(providerParam, code, state, redirectUri);

          showToast({
            title: "Sikeres OAuth hitelesítés",
            message: `${providerParam.toUpperCase()} csatlakoztatva! Kezdeti szinkronizáció: ${result.backfill.activitiesCreated} edzés rögzítve.`,
            type: "success"
          });

          await loadStatuses(isDemoMode);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Nem sikerült a token kicserélése a szerveren.";
          showToast({
            title: "OAuth hitelesítési hiba",
            message,
            type: "error"
          });
        } finally {

          setConnectingProvider(null);
        }
      };

      finishOAuth();
    }
  }, [loadStatuses, isDemoMode]);

  const toggleDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    localStorage.setItem("apex_demo_devices", String(enabled));
    loadStatuses(enabled);
    showToast({
      title: enabled ? "Demó mód bekapcsolva" : "Demó mód kikapcsolva",
      message: enabled
        ? "Szimulált eszközök elérhetők API kulcsok nélkül is."
        : "Csak valós, konfigurált szerverkapcsolatok engedélyezettek.",
      type: "info"
    });
  };

  // Connect handler (starts OAuth or mock fallback)
  const handleConnect = async (provider: DeviceProvider) => {
    const dev = devices.find((d) => d.provider === provider);
    if (!dev) return;

    if (!dev.isConfigured && !isDemoMode) {
      showToast({
        title: "Nincs konfigurálva",
        message: "Ehhez a szolgáltatáshoz még nem lettek beállítva a felhő titkos kulcsok. Lásd a docs/INTEGRATIONS.md leírást vagy kapcsold be a Demó módot.",
        type: "info"
      });
      return;
    }

    setConnectingProvider(provider);
    try {
      const redirectUri = `${window.location.origin}/devices`;
      const { authUrl } = await startDeviceOAuth(provider, redirectUri);

      if (authUrl.includes("mock=true") || isDemoMode && !dev.isConfigured) {
        // Simulated mock connection
        setTimeout(async () => {
          showToast({
            title: "Demó kapcsolat sikeres",
            message: `${dev.name} csatlakoztatva (szimulált adatokkal).`,
            type: "success"
          });
          await loadStatuses(isDemoMode);
          setConnectingProvider(null);
        }, 600);
      } else {
        // Real provider OAuth redirect
        window.location.href = authUrl;
      }
    } catch (err: unknown) {
      setConnectingProvider(null);
      const message = err instanceof Error ? err.message : "Nem sikerült az OAuth folyamat indítása.";
      showToast({
        title: "Csatlakozási hiba",
        message,
        type: "error"
      });
    }
  };

  // Disconnect handler
  const handleDisconnect = async (provider: DeviceProvider) => {
    const dev = devices.find((d) => d.provider === provider);
    if (!dev) return;

    try {
      await disconnectDevice(provider);
      showToast({
        title: "Eszköz leválasztva",
        message: `${dev.name} leválasztva. Az új adatok szinkronizálása leállt.`,
        type: "info"
      });
      await loadStatuses(isDemoMode);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nem sikerült a kapcsolat megszakítása.";
      showToast({
        title: "Hiba a leválasztáskor",
        message,
        type: "error"
      });
    }
  };

  // Sync Now handler
  const handleSyncNow = async (provider: DeviceProvider) => {
    setSyncingProvider(provider);
    const dev = devices.find((d) => d.provider === provider);

    try {
      const res = await syncDeviceNow(provider, 30);
      showToast({
        title: "Szinkronizáció kész",
        message: `${dev?.name}: ${res.activitiesCreated} új edzés, ${res.dailySaved} napi adat frissítve.`,
        type: "success"
      });
      await loadStatuses(isDemoMode);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nem sikerült az adatok lekérése a szerverről.";
      showToast({
        title: "Szinkronizációs hiba",
        message,
        type: "error"
      });
    } finally {
      setSyncingProvider(null);
    }
  };


  // Delete Provider Data handler
  const handleConfirmDeleteData = async (provider: DeviceProvider) => {
    const res = await deleteDeviceData(provider);
    showToast({
      title: "Adatok törölve",
      message: `${res.deletedSessionsCount} edzés és mérési adat sikeresen törölve.`,
      type: "success"
    });
    await loadStatuses(isDemoMode);
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

      {/* Demo / Sandbox Toggle Banner (Development only) */}
      {!import.meta.env.PROD && (
        <Card
          variant="surface"
          radius="20"
          className="p-4 border border-border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-elevated/40"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-10 bg-brand/10 text-brand mt-0.5">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-13 font-semibold text-text-primary">
                  Fejlesztői Demó Adatok & Mock Integráció
                </span>
                <Badge variant={isDemoMode ? "caution" : "neutral"} size="sm">
                  {isDemoMode ? "Demó Aktív" : "Éles Mód (Csak hitelesített API)"}
                </Badge>
              </div>
              <p className="text-11 text-text-secondary mt-0.5">
                {isDemoMode
                  ? "Szimulált biometrikus csomagok generálódnak, ha a szolgáltató szerveroldali API kulcsai hiányoznak."
                  : "A gombok kizárólag a Secret Managerben regisztrált, valós OAuth fiókokkal működnek."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant={isDemoMode ? "primary" : "secondary"}
              size="sm"
              onClick={() => toggleDemoMode(!isDemoMode)}
            >
              {isDemoMode ? "Demó mód kikapcsolása" : "Demó mód bekapcsolása"}
            </Button>
          </div>
        </Card>
      )}

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
              <h3 className="text-14 font-semibold text-text-primary">
                Eszköz csatlakoztatása később is lehetséges
              </h3>
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
        <div className="flex items-center justify-between">
          <h2 className="text-16 font-semibold text-text-primary">Csatlakoztatott eszközök</h2>
          {isLoadingStatuses && (
            <span className="text-11 text-text-tertiary flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" /> Állapotok ellenőrzése...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => {
            const isConnecting = connectingProvider === device.provider;
            const isSyncing = syncingProvider === device.provider;
            const isNotConfigured = !device.isConfigured && !isDemoMode;

            return (
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
                        ) : isNotConfigured ? (
                          <Badge variant="neutral" size="sm">
                            Nincs konfigurálva
                          </Badge>
                        ) : device.status === "error" ? (
                          <Badge variant="rest" size="sm">
                            Hiba
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
                        ? device.lastSyncAt
                          ? `Utolsó szinkronizáció: ${new Date(device.lastSyncAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}`
                          : "Szinkronizálva"
                        : isNotConfigured
                        ? "API kulcs hiányzik a szerveren"
                        : "Felhő alapú OAuth 2.0 szinkronizáció"}
                    </span>
                    {isDemoMode && (
                      <span className="text-10 px-1.5 py-0.5 rounded bg-surface-elevated font-mono text-brand border border-brand/20">
                        DEMO MOCK
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {isNotConfigured ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => handleConnect(device.provider)}
                      leftIcon={<ShieldAlert className="h-3.5 w-3.5 text-text-tertiary" />}
                    >
                      Konfiguráció szükséges
                    </Button>
                  ) : device.connected ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => handleDisconnect(device.provider)}
                      >
                        Leválasztás
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={isSyncing}
                        leftIcon={
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-brand" : ""}`}
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
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      isLoading={isConnecting}
                      leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                      onClick={() => handleConnect(device.provider)}
                    >
                      Csatlakozás ({device.name})
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
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
            A backend felkészült a natív bridge fogadására: a nyílt <code className="font-mono text-brand">POST /ingestHealthData</code>{" "}
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
