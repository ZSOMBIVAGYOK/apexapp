import React, { useState } from "react";
import { useAuthStore } from "@features/auth/authStore";
import { useSyncStatusStore } from "@shared/lib/sync/syncStatusStore";
import { useSyncState } from "@shared/hooks/useSyncState";
import { appCheckStatus, auth, db } from "@shared/lib/firebase";
import { doc, setDoc, getDocFromServer, deleteDoc } from "firebase/firestore";
import {
  getSessions,
  getPlannedWorkouts,
  getAllDayCheckins,
  getCompetitions
} from "@shared/lib/repositories";
import { Card, Button, Badge, showToast } from "@shared/ui";
import {
  Cloud,
  Server,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
  RotateCw
} from "lucide-react";
import { format, parseISO } from "date-fns";

const APP_VERSION = "v1.2.1 (build 20261028-sync)";

export const DiagnosticsSyncCard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    lastServerWriteAt,
    lastServerReadAt,
    isOnline,
    isCacheFallback,
    cacheNoticeMessage
  } = useSyncStatusStore();
  const { pendingCount: outboxCount } = useSyncState();

  const athleteId = user?.uid || "";
  const shortUid = athleteId ? `${athleteId.slice(0, 6)}...${athleteId.slice(-4)}` : "Nincs";

  // Provider names
  const providers = auth.currentUser?.providerData
    ?.map((p) => (p.providerId === "password" ? "E-mail és jelszó" : p.providerId === "google.com" ? "Google" : p.providerId))
    .join(", ") || "Nincs adat";

  // Server test state
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testLogs, setTestLogs] = useState<Array<{ text: string; success: boolean; ms?: number }>>([]);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Full refresh state
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Run Server Test
  const handleServerTest = async () => {
    if (!athleteId) {
      showToast({ title: "Hiba", message: "Nincs bejelentkezett felhasználó.", type: "error" });
      return;
    }

    setIsRunningTest(true);
    setTestLogs([]);
    setTestResult(null);

    const logs: Array<{ text: string; success: boolean; ms?: number }> = [];

    try {
      const pingDocRef = doc(db, "athletes", athleteId, "_diagnostics", "ping");
      const testPayload = {
        testId: `ping_${Date.now()}`,
        timestamp: new Date().toISOString(),
        client: "apex-web"
      };

      // 1. Write step
      const t0 = performance.now();
      await setDoc(pingDocRef, testPayload);
      const writeMs = Math.round(performance.now() - t0);
      logs.push({ text: "1. Írás a Firestore szerverre: Sikerült ✓", success: true, ms: writeMs });
      setTestLogs([...logs]);

      // 2. Direct server read step (bypassing local cache)
      const t1 = performance.now();
      const snap = await getDocFromServer(pingDocRef);
      const readMs = Math.round(performance.now() - t1);

      if (!snap.exists()) {
        throw new Error("A tesztdokumentum nem található a szerveren.");
      }
      logs.push({ text: "2. Olvasás közvetlenül a szerverről (cache kihagyásával): Sikerült ✓", success: true, ms: readMs });
      setTestLogs([...logs]);

      // 3. Verification step
      const data = snap.data();
      if (data?.testId !== testPayload.testId) {
        throw new Error("Az olvasott tesztadat tartalma nem egyezik a mentettel.");
      }
      logs.push({ text: "3. Adatintegritás és egyezés ellenőrzése: Hibátlan ✓", success: true });
      setTestLogs([...logs]);

      // 4. Cleanup step
      await deleteDoc(pingDocRef);
      logs.push({ text: "4. Tesztadat törlése a szerverről: Sikerült ✓", success: true });
      setTestLogs([...logs]);

      setTestResult("success");
      useSyncStatusStore.getState().recordServerWrite();
      useSyncStatusStore.getState().recordServerRead();

      showToast({
        title: "Szerver teszt sikeres",
        message: "A közvetlen felhőkapcsolat, írás és olvasás hibátlanul működik.",
        type: "success"
      });
    } catch (err: any) {
      console.error("Server test failure:", err);
      logs.push({
        text: `Hiba a szerver teszt során: ${err?.message || "Ismeretlen hiba"}`,
        success: false
      });
      setTestLogs([...logs]);
      setTestResult("error");

      showToast({
        title: "Szerver teszt hiba",
        message: err?.message || "Nem sikerült a kapcsolat.",
        type: "error"
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  // Full Refresh from Server
  const handleFullServerReload = async () => {
    if (outboxCount > 0) {
      showToast({
        title: "Feltöltés szükséges",
        message: `${outboxCount} elem még feltöltésre vár. Kérjük, először nyomj a 'Szinkronizálás most' gombra!`,
        type: "warning"
      });
      return;
    }

    if (!athleteId) return;

    setIsRefreshingAll(true);
    try {
      // Discard local user caches
      try {
        localStorage.removeItem(`apex_sessions_${athleteId}`);
        localStorage.removeItem(`apex_planned_workouts_${athleteId}`);
        localStorage.removeItem(`apex_daily_${athleteId}`);
        localStorage.removeItem(`apex_competitions_${athleteId}`);
      } catch {
        // storage fallback
      }

      // Re-fetch all collections directly from server
      await Promise.all([
        getSessions(athleteId, { forceServer: true }),
        getPlannedWorkouts(athleteId, { forceServer: true }),
        getAllDayCheckins(athleteId, { forceServer: true }),
        getCompetitions(athleteId, { forceServer: true })
      ]);

      useSyncStatusStore.getState().recordServerRead();

      showToast({
        title: "Sikeres frissítés",
        message: "Minden edzés és adat frissen betöltve a felhőből.",
        type: "success"
      });
    } catch (err: any) {
      showToast({
        title: "Hiba az újratöltéskor",
        message: err?.message || "Nem sikerült a szerverről betölteni az adatokat.",
        type: "error"
      });
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Copy Diagnostics Report to Clipboard
  const handleCopyReport = () => {
    const report = [
      "=== APEX DIAGNOSZTIKAI JELENTÉS ===",
      `Időpont: ${new Date().toLocaleString("hu-HU")}`,
      `App verzió: ${APP_VERSION}`,
      `Firebase Projekt ID: ${import.meta.env.VITE_FIREBASE_PROJECT_ID || "zsombor-etrend"}`,
      `Bejelentkezett fiók: ${user?.email || "Nincs"}`,
      `Azonosítási szolgáltató: ${providers}`,
      `Felhasználói ID (UID): ${athleteId}`,
      `Hálózati állapot: ${isOnline ? "Online" : "Offline"}`,
      `App Check állapot: ${appCheckStatus.configured ? (appCheckStatus.active ? "Aktív" : appCheckStatus.error || "Konfigurált, de nem aktív") : "Inaktív (nem korlátozó)"}`,
      `Függőben lévő feltöltések száma: ${outboxCount}`,
      `Utolsó szerver írás: ${lastServerWriteAt ? format(parseISO(lastServerWriteAt), "yyyy.MM.dd. HH:mm:ss") : "Még nem történt"}`,
      `Utolsó szerver olvasás: ${lastServerReadAt ? format(parseISO(lastServerReadAt), "yyyy.MM.dd. HH:mm:ss") : "Még nem történt"}`,
      `Gyorsítótár kényszerített használata: ${isCacheFallback ? `Igen (${cacheNoticeMessage})` : "Nem (friss szerver kapcsolat)"}`,
      `Böngésző környezet: ${typeof navigator !== "undefined" ? navigator.userAgent : "Ismeretlen"}`,
      "=================================="
    ].join("\n");

    navigator.clipboard.writeText(report).then(() => {
      setIsCopied(true);
      showToast({
        title: "Kimásolva!",
        message: "A diagnosztikai jelentés a vágólapra került.",
        type: "info"
      });
      setTimeout(() => setIsCopied(false), 2500);
    }).catch(() => {
      showToast({ title: "Hiba", message: "Nem sikerült másolni a vágólapra.", type: "error" });
    });
  };

  return (
    <Card variant="surface" radius="20" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-text-primary">
          <Server className="h-5 w-5 text-brand" aria-hidden="true" />
          <div>
            <h4 className="text-14 font-bold">Felhő Szinkronizálás & Diagnosztika</h4>
            <p className="text-11 text-text-tertiary">Eszközök közötti adatátvitel és állapotellenőrzés</p>
          </div>
        </div>
        <Badge
          variant={isOnline && !isCacheFallback ? "ready" : "caution"}
          size="sm"
        >
          {isOnline && !isCacheFallback ? "Szerver kapcsolat aktív ✓" : "Helyi gyorsítótár"}
        </Badge>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-12">
        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">Firebase Projekt</span>
          <span className="font-mono text-11 text-text-primary truncate block font-medium mt-0.5">
            {import.meta.env.VITE_FIREBASE_PROJECT_ID || "zsombor-etrend"}
          </span>
        </div>

        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">Alkalmazás verzió</span>
          <span className="font-mono text-11 text-text-primary truncate block font-medium mt-0.5">
            {APP_VERSION}
          </span>
        </div>

        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">Fiók & Bejelentkezés</span>
          <span className="text-11 text-text-primary truncate block font-medium mt-0.5" title={user?.email || ""}>
            {user?.email || "Nincs bejelentkezve"} ({providers})
          </span>
        </div>

        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">Felhasználói Azonosító (UID)</span>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="font-mono text-11 text-text-primary truncate" title={athleteId}>
              {shortUid}
            </span>
            {athleteId && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(athleteId);
                  showToast({ title: "UID Másolva", message: athleteId, type: "info" });
                }}
                className="text-text-tertiary hover:text-text-primary p-0.5 rounded"
                title="Teljes UID másolása"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">App Check Állapot</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className={`h-3.5 w-3.5 ${appCheckStatus.active ? "text-status-ready" : "text-text-tertiary"}`} />
            <span className="text-11 text-text-primary font-medium">
              {appCheckStatus.configured ? (appCheckStatus.active ? "Aktív (Enterprise)" : "Konfigurált") : "Inaktív (nem korlátozó)"}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">Függőben lévő írások</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${outboxCount > 0 ? "bg-status-caution" : "bg-status-ready"}`} />
            <span className="text-11 text-text-primary font-medium">
              {outboxCount > 0 ? `${outboxCount} elem feltöltésre vár` : "0 (Minden a szerveren van)"}
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">Utolsó szerver mentés</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-11 text-text-primary font-medium">
            <Clock className="h-3 w-3 text-text-tertiary" />
            <span>{lastServerWriteAt ? format(parseISO(lastServerWriteAt), "HH:mm:ss (MM.dd)") : "Még nincs adat"}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-12 bg-surface-elevated border border-border-hairline">
          <span className="text-10 uppercase tracking-wider text-text-tertiary block font-semibold">Utolsó szerver olvasás</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-11 text-text-primary font-medium">
            <Cloud className="h-3 w-3 text-status-ready" />
            <span>{lastServerReadAt ? format(parseISO(lastServerReadAt), "HH:mm:ss (MM.dd)") : "Még nincs adat"}</span>
          </div>
        </div>
      </div>

      {/* Cache notice banner if active */}
      {isCacheFallback && (
        <div className="p-3 rounded-12 border border-status-caution/30 bg-status-caution/10 text-status-caution flex items-center gap-2.5 text-12">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{cacheNoticeMessage || "A szerver jelenleg nem elérhető közvetlenül, a helyi gyorsítótár adatai láthatók."}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button
          variant="secondary"
          size="sm"
          isLoading={isRunningTest}
          leftIcon={<Server className="h-3.5 w-3.5 text-brand" />}
          onClick={handleServerTest}
        >
          {isRunningTest ? "Szerver teszt fut..." : "Szerver teszt"}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          isLoading={isRefreshingAll}
          disabled={outboxCount > 0}
          leftIcon={<RotateCw className={`h-3.5 w-3.5 ${isRefreshingAll ? "animate-spin" : ""}`} />}
          onClick={handleFullServerReload}
        >
          {isRefreshingAll ? "Újratöltés..." : "Teljes frissítés a szerverről"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          leftIcon={isCopied ? <Check className="h-3.5 w-3.5 text-status-ready" /> : <Copy className="h-3.5 w-3.5" />}
          onClick={handleCopyReport}
        >
          {isCopied ? "Kimásolva!" : "Hibajelentés másolása"}
        </Button>
      </div>

      {/* Server Test Live Log Output */}
      {testLogs.length > 0 && (
        <div className="p-3 rounded-12 bg-bg-surface/80 border border-border-hairline space-y-1.5 font-mono text-11 animate-fade-in">
          <div className="flex items-center justify-between pb-1 border-b border-border-hairline text-text-tertiary">
            <span>Szerver kapcsolat teszt eredménye:</span>
            {testResult === "success" && (
              <span className="text-status-ready flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Sikeres teszt
              </span>
            )}
            {testResult === "error" && (
              <span className="text-status-rest flex items-center gap-1 font-semibold">
                <XCircle className="h-3 w-3" /> Teszt sikertelen
              </span>
            )}
          </div>
          {testLogs.map((log, index) => (
            <div
              key={index}
              className={`flex items-center justify-between ${log.success ? "text-text-primary" : "text-status-rest font-semibold"}`}
            >
              <span>{log.text}</span>
              {log.ms !== undefined && <span className="text-text-tertiary text-10">{log.ms}ms</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
