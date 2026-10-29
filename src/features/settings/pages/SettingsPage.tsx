import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { useAppearanceStore } from "@shared/lib/appearance/appearanceStore";
import { callDeleteUserData } from "@features/auth/authService";
import { DataMode, SupportMode, UnitSystem } from "@shared/types";
import { useNotificationStore } from "@shared/lib/notifications/notificationStore";
import { flushOfflineQueue } from "@shared/lib/offline/offlineStorage";
import { LogoutConfirmationModal } from "@features/auth/components/LogoutConfirmationModal";
import { DiagnosticsSyncCard } from "../components/DiagnosticsSyncCard";
import {
  getTrashItems,
  restoreTrashItem,
  permanentDeleteTrashItem,
  TrashItem,
  getSessions,
  getPlannedWorkouts,
  getAllDayCheckins,
  getAllNutritionDays,
  getCompetitions
} from "@shared/lib/repositories";
import { getEquipmentList } from "@shared/lib/equipment";
import { getExercises } from "@shared/lib/exercises";
import { getRecords } from "@shared/lib/records";
import { differenceInDays, parseISO } from "date-fns";
import {
  Card,
  Button,
  SegmentedControl,
  Avatar,
  Badge,
  SectionHeader,
  Toggle,
  BottomSheet,
  showToast
} from "@shared/ui";
import {
  Globe,
  Palette,
  Watch,
  Users,
  Ruler,
  Bell,
  Download,
  Trash2,
  LogOut,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  CheckCircle
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, updateProfile, isDemoUser } = useAuthStore();
  const {
    theme,
    setTheme,
    glass,
    setGlass,
    reducedMotion,
    setReducedMotion,
    textSize,
    setTextSize
  } = useAppearanceStore();
  const navigate = useNavigate();

  const athleteId = user?.uid || "demo-athlete-001";

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Trash state
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  // Backup reminder state
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    return localStorage.getItem(`apex_last_backup_${athleteId}`);
  });

  // Logout safety modal state
  const [pendingLogoutCount, setPendingLogoutCount] = useState<number | null>(null);
  const [isSyncingLogout, setIsSyncingLogout] = useState(false);

  // Notifications from store
  const { settings: notifSettings, updateSettings: updateNotifSettings } = useNotificationStore();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    if (user) {
      updateProfile({ locale: lang as "hu" | "en" });
    }
    showToast({
      title: t("common.language"),
      message: lang === "hu" ? "Magyar nyelv aktív" : "English language set",
      type: "info"
    });
  };

  const handleThemeChange = (newTheme: "dark" | "light" | "auto" | "system") => {
    setTheme(newTheme === "system" ? "auto" : newTheme);
  };

  const handleUnitsChange = async (units: UnitSystem) => {
    await updateProfile({ units });
    showToast({
      title: t("settings.unitsTitle"),
      message: units === "metric" ? t("common.metric") : t("common.imperial"),
      type: "info"
    });
  };

  const handleDataModeChange = async (dataMode: DataMode) => {
    await updateProfile({ dataMode });
    showToast({
      title: t("settings.dataModeTitle"),
      message:
        dataMode === "device"
          ? t("settings.dataModeDevice")
          : dataMode === "manual"
            ? t("settings.dataModeManual")
            : t("settings.dataModeHybrid"),
      type: "success"
    });
  };

  const toggleSupportMode = async (mode: SupportMode) => {
    const current = user?.supportMode || ["solo"];
    const updated = current.includes(mode)
      ? current.length > 1
        ? current.filter((m) => m !== mode)
        : current
      : [...current, mode];
    await updateProfile({ supportMode: updated });
  };

  // Load Trash Items
  const loadTrash = useCallback(async () => {
    if (!athleteId) return;
    setIsLoadingTrash(true);
    try {
      const items = await getTrashItems(athleteId);
      setTrashItems(items);
    } catch (err) {
      console.warn("Failed loading trash:", err);
    } finally {
      setIsLoadingTrash(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestoreTrash = async (item: TrashItem) => {
    try {
      await restoreTrashItem(item);
      showToast({
        title: "Elem visszaállítva",
        message: `${item.title} sikeresen visszaállítva a kukából.`,
        type: "success"
      });
      loadTrash();
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült visszaállítani az elemet.",
        type: "error"
      });
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    const confirmed = window.confirm(
      `Biztosan véglegesen törölni szeretnéd a(z) "${item.title}" elemet? Ez a művelet nem vonható vissza!`
    );
    if (!confirmed) return;

    try {
      await permanentDeleteTrashItem(item);
      showToast({
        title: "Véglegesen törölve",
        message: `${item.title} véglegesen törölve a kukából.`,
        type: "info"
      });
      loadTrash();
    } catch {
      showToast({
        title: "Hiba",
        message: "Nem sikerült véglegesen törölni az elemet.",
        type: "error"
      });
    }
  };

  // Safe Sign Out Handler
  const handleSignOutClick = async (force = false) => {
    const res = await signOut(force);
    if (res?.blocked) {
      setPendingLogoutCount(res.pendingCount || 1);
      return;
    }
    setPendingLogoutCount(null);
    navigate("/auth");
  };

  const handleSyncAndSignOut = async () => {
    setIsSyncingLogout(true);
    try {
      await flushOfflineQueue();
      await handleSignOutClick(true);
    } finally {
      setIsSyncingLogout(false);
    }
  };

  // Full User Data Export (GDPR Art. 20 + Safety Backup)
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const [
        sessions,
        plannedWorkouts,
        checkins,
        nutrition,
        equipment,
        exercises,
        records,
        competitions
      ] = await Promise.all([
        getSessions(athleteId, { includeDeleted: true }),
        getPlannedWorkouts(athleteId, { includeDeleted: true }),
        getAllDayCheckins(athleteId),
        getAllNutritionDays(athleteId),
        getEquipmentList(athleteId),
        getExercises(athleteId),
        getRecords(athleteId),
        getCompetitions(athleteId, { includeDeleted: true })
      ]);

      const now = new Date().toISOString();
      const exportPayload = {
        exportedAt: now,
        version: "2.0.0",
        app: "Apex Athletic Platform",
        athleteId,
        compliance: "GDPR Article 20 - Right to Data Portability",
        profile: user,
        sessions,
        plannedWorkouts,
        checkins,
        nutrition,
        equipment,
        exercises,
        records,
        competitions,
        system: {
          userAgent: navigator.userAgent,
          language: i18n.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `apex-teljes-mentes-${athleteId}-${now.split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.setItem(`apex_last_backup_${athleteId}`, now);
      setLastBackupDate(now);

      showToast({
        title: "Adataim letöltve",
        message: "A teljes JSON biztonsági mentés sikeresen letöltődött a gépedre.",
        type: "success"
      });
    } catch (err) {
      console.error("Export error:", err);
      showToast({
        title: t("common.error"),
        message: "Nem sikerült exportálni az adatokat.",
        type: "error"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Permanent Account Deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (!isDemoUser) {
        await callDeleteUserData();
      }
      await signOut();
      showToast({
        title: "Fiók törölve",
        message: "A profilod és minden kapcsolódó adatod véglegesen törlésre került.",
        type: "info"
      });
      navigate("/auth");
    } catch (err: unknown) {
      showToast({
        title: t("common.error"),
        message: "Nem sikerült a törlés. Kérjük próbáld újra később.",
        type: "error"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16 px-4 sm:px-6">
      {/* Header */}
      <SectionHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/privacy">
              <Button
                variant="tertiary"
                size="sm"
                leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-status-ready" />}
              >
                {t("nav.privacy")}
              </Button>
            </Link>
            <Button
              variant="tertiary"
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={() => navigate("/design")}
            >
              Styleguide
            </Button>
          </div>
        }
      />

      {/* User Profile Card */}
      <Card variant="surface" radius="20" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={user?.displayName || "Sportoló"}
              size="lg"
              status="ready"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-16 font-bold text-text-primary">
                  {user?.displayName || "Kovács Zsombor"}
                </h3>
                {user?.roles?.map((r) => (
                  <Badge key={r} variant="brand" size="sm">
                    {r === "coach" ? "Edző" : r === "specialist" ? "Szakember" : "Sportoló"}
                  </Badge>
                ))}
              </div>
              <p className="text-12 text-text-secondary mt-0.5">
                {user?.email || "olimpikon@apex.hu"} • {user?.sport || "Triatlon"}
              </p>
              {user?.level && (
                <span className="inline-block mt-1 text-11 text-text-tertiary uppercase tracking-wider font-mono">
                  Szint: {user.level}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/profile">
              <Button variant="secondary" size="sm">
                {t("settings.editProfile")}
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={() => handleSignOutClick()}
            >
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sharing & Staff Access: "Ki mit lát?" */}
      <Card variant="surface" radius="20" className="p-6 border border-brand/20 bg-brand/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-12 bg-brand text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-16 font-bold text-text-primary">
                  {t("sharing.title")}
                </h3>
                <Badge variant="brand" size="sm">
                  Zero-Trust
                </Badge>
              </div>
              <p className="text-12 text-text-secondary mt-1 max-w-xl">
                {t("sharing.subtitle")}
              </p>
            </div>
          </div>

          <Link to="/settings/sharing" className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Kezelés & Szabályozás
            </Button>
          </Link>
        </div>
      </Card>

      {/* Preferences Section: Theme, Glass, Text Size, Motion, Language, Units */}
      <div className="space-y-4">
        <h3 className="text-12 font-semibold uppercase tracking-wider text-text-secondary">
          Megjelenés & Nyelv
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Theme Selector */}
          <Card variant="surface" radius="28" className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Palette className="h-4 w-4 text-brand" aria-hidden="true" />
              <h4 className="text-14 font-bold">{t("settings.themePref")}</h4>
            </div>
            <SegmentedControl
              options={[
                { value: "dark", label: "Sötét" },
                { value: "light", label: "Világos" },
                { value: "auto", label: "Automatikus" }
              ]}
              value={theme}
              onChange={(val) => handleThemeChange(val as "dark" | "light" | "auto")}
              fullWidth
            />
          </Card>

          {/* Liquid Glass Effect */}
          <Card variant="surface" radius="28" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-text-primary">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-brand" aria-hidden="true" />
                <h4 className="text-14 font-bold">Folyékony üveg (Glass)</h4>
              </div>
              <Badge variant="brand" size="sm" className="text-[10px]">
                Apple Design
              </Badge>
            </div>
            <SegmentedControl
              options={[
                { value: "full", label: "Teljes" },
                { value: "reduced", label: "Csökkentett" },
                { value: "none", label: "Ki" }
              ]}
              value={glass}
              onChange={(val) => setGlass(val as "full" | "reduced" | "none")}
              fullWidth
            />
            <p className="text-[11px] text-text-secondary leading-normal">
              Valós idejű elmosás és fénytörés. Gyengébb hardveren a Csökkentett vagy Ki mód ajánlott.
            </p>
          </Card>

          {/* Text Size Scaling */}
          <Card variant="surface" radius="28" className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <h4 className="text-14 font-bold">Szövegméret</h4>
            </div>
            <SegmentedControl
              options={[
                { value: "small", label: "Kisebb" },
                { value: "default", label: "Alap" },
                { value: "large", label: "Nagyobb" }
              ]}
              value={textSize}
              onChange={(val) => setTextSize(val as "small" | "default" | "large")}
              fullWidth
            />
          </Card>

          {/* Reduced Motion Toggle */}
          <Card variant="surface" radius="28" className="p-5 flex items-center justify-between">
            <div>
              <h4 className="text-14 font-bold text-text-primary">Mozgáscsökkentés</h4>
              <p className="text-12 text-text-secondary mt-0.5">
                Gyors áttűnések rugózás és elmozdulások nélkül.
              </p>
            </div>
            <Toggle
              checked={reducedMotion}
              onChange={setReducedMotion}
              aria-label="Mozgáscsökkentés"
            />
          </Card>

          {/* Language Selector */}
          <Card variant="surface" radius="28" className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Globe className="h-4 w-4 text-brand" aria-hidden="true" />
              <h4 className="text-14 font-bold">{t("settings.languagePref")}</h4>
            </div>
            <SegmentedControl
              options={[
                { value: "hu", label: "Magyar (HU)" },
                { value: "en", label: "English (EN)" }
              ]}
              value={i18n.language.startsWith("hu") ? "hu" : "en"}
              onChange={handleLanguageChange}
              fullWidth
            />
          </Card>

          {/* Unit System */}
          <Card variant="surface" radius="28" className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Ruler className="h-4 w-4 text-brand" aria-hidden="true" />
              <h4 className="text-14 font-bold">{t("settings.unitsTitle")}</h4>
            </div>
            <SegmentedControl
              options={[
                { value: "metric", label: t("common.metric") },
                { value: "imperial", label: t("common.imperial") }
              ]}
              value={user?.units || "metric"}
              onChange={(val) => handleUnitsChange(val as UnitSystem)}
              fullWidth
            />
          </Card>
        </div>
      </div>

      {/* Adaptive DataMode & SupportMode */}
      <div className="space-y-4">
        <h3 className="text-12 font-semibold uppercase tracking-wider text-text-secondary">
          Adaptív Módok (Data & Support Modes)
        </h3>

        {/* Data Mode */}
        <Card variant="surface" radius="20" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-primary">
              <Watch className="h-4 w-4 text-brand" aria-hidden="true" />
              <h4 className="text-14 font-bold">{t("settings.dataModeTitle")}</h4>
            </div>
            <Badge variant="outline" size="sm">
              {user?.dataMode?.toUpperCase() || "HYBRID"}
            </Badge>
          </div>
          <p className="text-12 text-text-secondary">
            Befolyásolja az edzésnapló és a check-in megjelenítését (manuális űrlapok vs okoseszköz szinkron).
          </p>
          <SegmentedControl
            options={[
              { value: "device", label: t("settings.dataModeDevice") },
              { value: "manual", label: t("settings.dataModeManual") },
              { value: "hybrid", label: t("settings.dataModeHybrid") }
            ]}
            value={user?.dataMode || "hybrid"}
            onChange={(val) => handleDataModeChange(val as DataMode)}
            fullWidth
          />
        </Card>

        {/* Support Mode */}
        <Card variant="surface" radius="20" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-primary">
              <Users className="h-4 w-4 text-brand" aria-hidden="true" />
              <h4 className="text-14 font-bold">{t("settings.supportModeTitle")}</h4>
            </div>
          </div>
          <p className="text-12 text-text-secondary">
            Válaszd ki a veled dolgozó stáb típusait.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                ["solo", t("settings.supportSolo")],
                ["coach", t("settings.supportCoach")],
                ["specialist", t("settings.supportSpecialist")]
              ] as const
            ).map(([mode, label]) => {
              const active = user?.supportMode?.includes(mode);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleSupportMode(mode)}
                  className={`p-3 rounded-14 border text-left transition-all ${
                    active
                      ? "border-brand bg-brand/10 text-brand font-semibold"
                      : "border-border-hairline bg-bg-elevated text-text-secondary hover:border-brand/30"
                  }`}
                >
                  <span className="text-13 block">{label}</span>
                  <span className="text-11 opacity-70">
                    {active ? "Bekapcsolva" : "Kikapcsolva"}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Consent Version Update Banner (if version is outdated or missing) */}
      {user?.consent?.healthData?.version !== "1.1" && (
        <Card variant="elevated" radius="20" className="p-4 border-brand/40 bg-brand/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-brand shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-13 font-bold text-text-primary">
                  GDPR Egészségügyi Adatkezelési Szabályzat v1.1
                </span>
                <Badge variant="brand" size="sm">Frissítés</Badge>
              </div>
              <p className="text-12 text-text-secondary">
                A legújabb adatvédelmi szabványok szerinti sportélettani biometrikus integráció.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              await updateProfile({
                consent: {
                  healthData: {
                    accepted: true,
                    version: "1.1",
                    timestamp: new Date().toISOString()
                  }
                }
              });
              showToast({
                title: "Hozzájárulás frissítve",
                message: "A GDPR v1.1 szabályzat elfogadva.",
                type: "success"
              });
            }}
          >
            Elfogadás (v1.1)
          </Button>
        </Card>
      )}

      {/* Notifications Preferences */}
      <Card variant="surface" radius="20" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary">
            <Bell className="h-4 w-4 text-brand" aria-hidden="true" />
            <h4 className="text-14 font-bold">{t("settings.notificationsTitle", "Értesítési Beállítások")}</h4>
          </div>
          <Badge variant="outline" size="sm">FCM Cloud Messaging</Badge>
        </div>

        <div className="divide-y divide-border-hairline">
          {/* Checkin Reminder with custom time */}
          <div className="flex items-center justify-between py-3 gap-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                {t("settings.notifMorning", "Reggeli Check-in emlékeztető")}
              </span>
              <span className="text-11 text-text-secondary">
                Napi felugró értesítés a megadott időpontban
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={notifSettings.checkinReminderTime}
                onChange={(e) => updateNotifSettings({ checkinReminderTime: e.target.value })}
                className="rounded-8 bg-surface-elevated px-2 py-1 text-12 font-mono text-text-primary border border-border-hairline"
              />
              <Toggle
                checked={notifSettings.checkinReminderEnabled}
                onChange={() => updateNotifSettings({ checkinReminderEnabled: !notifSettings.checkinReminderEnabled })}
                label="Reggeli emlékeztető"
              />
            </div>
          </div>

          {/* Workout reminder */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                {t("settings.notifWorkout", "Közelgő edzés emlékeztető")}
              </span>
              <span className="text-11 text-text-secondary">
                45 perccel a tervezett edzésblokk előtt
              </span>
            </div>
            <Toggle
              checked={notifSettings.workoutReminderEnabled}
              onChange={() => updateNotifSettings({ workoutReminderEnabled: !notifSettings.workoutReminderEnabled })}
              label="Edzés emlékeztető"
            />
          </div>

          {/* Coach message */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                {t("settings.notifCoach", "Edzői üzenetek & stáb visszajelzés")}
              </span>
              <span className="text-11 text-text-secondary">
                Azonnali értesítés új edzői utasítás vagy stáb megjegyzés érkezésekor
              </span>
            </div>
            <Toggle
              checked={notifSettings.coachMessageEnabled}
              onChange={() => updateNotifSettings({ coachMessageEnabled: !notifSettings.coachMessageEnabled })}
              label="Edzői üzenetek"
            />
          </div>

          {/* Staff alerts */}
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                Stáb riasztások és élettani figyelmeztetések
              </span>
              <span className="text-11 text-text-secondary">
                ACWR kiugrás, alváshiány vagy sérülés kockázat észlelésekor
              </span>
            </div>
            <Toggle
              checked={notifSettings.staffAlertsEnabled}
              onChange={() => updateNotifSettings({ staffAlertsEnabled: !notifSettings.staffAlertsEnabled })}
              label="Stáb riasztások"
            />
          </div>

          {/* Quiet Hours */}
          <div className="py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-13 font-medium text-text-primary block">
                  Csendes órák (Quiet Hours)
                </span>
                <span className="text-11 text-text-secondary">
                  Ebben az idősávban az app némítja a nem kritikus értesítéseket
                </span>
              </div>
              <Toggle
                checked={notifSettings.quietHoursEnabled}
                onChange={() => updateNotifSettings({ quietHoursEnabled: !notifSettings.quietHoursEnabled })}
                label="Csendes órák"
              />
            </div>

            {notifSettings.quietHoursEnabled && (
              <div className="flex items-center gap-2 pl-2 text-12 text-text-secondary">
                <span>Kezdet:</span>
                <input
                  type="time"
                  value={notifSettings.quietHoursStart}
                  onChange={(e) => updateNotifSettings({ quietHoursStart: e.target.value })}
                  className="rounded-8 bg-surface-elevated px-2 py-1 text-12 font-mono text-text-primary border border-border-hairline"
                />
                <span>Vége:</span>
                <input
                  type="time"
                  value={notifSettings.quietHoursEnd}
                  onChange={(e) => updateNotifSettings({ quietHoursEnd: e.target.value })}
                  className="rounded-8 bg-surface-elevated px-2 py-1 text-12 font-mono text-text-primary border border-border-hairline"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Cloud Sync & Storage Diagnostics */}
      <DiagnosticsSyncCard />

      {/* Backup & Data Portability with 30-day reminder */}
      <Card variant="surface" radius="20" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary">
            <Download className="h-4 w-4 text-brand" aria-hidden="true" />
            <h4 className="text-14 font-bold">Biztonsági mentés & Adataim letöltése</h4>
          </div>
          <Badge variant="brand" size="sm">
            GDPR Art. 20
          </Badge>
        </div>

        <p className="text-12 text-text-secondary">
          Töltsd le az összes edzésedet, tervezett edzéseidet, napi check-in adataidat, étrendedet, felszereléseidet és rekordjaidat egyetlen szabványos JSON archívumban.
        </p>

        {/* 30-day Backup Reminder Banner */}
        {(() => {
          const isOverdue = !lastBackupDate || differenceInDays(new Date(), parseISO(lastBackupDate)) >= 30;
          const daysAgo = lastBackupDate ? differenceInDays(new Date(), parseISO(lastBackupDate)) : null;
          return (
            <div className={`p-3 rounded-12 border flex items-center justify-between gap-3 text-12 ${
              isOverdue
                ? "bg-status-caution/10 border-status-caution/30 text-status-caution"
                : "bg-surface-elevated border-border-hairline text-text-secondary"
            }`}>
              <div className="flex items-center gap-2">
                {isOverdue ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0 text-status-ready" />}
                <span>
                  {daysAgo === null
                    ? "Még nem készítettél biztonsági mentést. Javasolt havi biztonsági mentést letölteni."
                    : isOverdue
                      ? `Utolsó mentés: ${daysAgo} napja. Javasolt friss havi biztonsági mentést készíteni!`
                      : `Biztonsági mentés naprakész (Utoljára letöltve: ${daysAgo} napja).`}
                </span>
              </div>
            </div>
          );
        })()}

        <div>
          <Button
            variant="secondary"
            size="sm"
            isLoading={isExporting}
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={handleExportData}
          >
            {isExporting ? "Archívum összeállítása..." : "Teljes adatmentés letöltése (JSON)"}
          </Button>
        </div>
      </Card>

      {/* Trash & Soft-Delete Archive */}
      <Card variant="surface" radius="20" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary">
            <Trash2 className="h-4 w-4 text-purple-400" aria-hidden="true" />
            <h4 className="text-14 font-bold">Kuka (Lomtár)</h4>
          </div>
          <Badge variant="neutral" size="sm">
            30 napos megőrzés
          </Badge>
        </div>

        <p className="text-12 text-text-secondary">
          A törölt edzések, tervek és felszerelések nem törlődnek azonnal, hanem ide kerülnek 30 napra. Bármikor visszaállíthatod őket egyetlen kattintással.
        </p>

        {isLoadingTrash ? (
          <div className="py-4 text-center text-12 text-text-tertiary flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-brand" />
            <span>Lomtár betöltése...</span>
          </div>
        ) : trashItems.length === 0 ? (
          <div className="p-4 rounded-12 bg-surface-elevated/50 border border-border-hairline text-center text-12 text-text-tertiary">
            A kuka üres. Nincs törölt elem az elmúlt 30 napból.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {trashItems.map((item) => (
              <div
                key={`${item.type}_${item.id}`}
                className="p-3 rounded-12 bg-surface-elevated border border-border-hairline flex items-center justify-between gap-3 text-12"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {item.type === "session" ? "Edzés" : item.type === "workout" ? "Edzésterv" : item.type === "equipment" ? "Eszköz" : item.type === "exercise" ? "Gyakorlat" : "Rekord"}
                    </Badge>
                    <span className="font-semibold text-text-primary truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-11 text-text-tertiary">
                    <span>{item.subtitle}</span>
                    <span>•</span>
                    <span className="text-status-caution font-medium">Még {item.daysRemaining} napig visszaállítható</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RotateCcw className="h-3 w-3 text-status-ready" />}
                    onClick={() => handleRestoreTrash(item)}
                    title="Visszaállítás"
                  >
                    Visszaállítás
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-status-rest hover:bg-status-rest/10"
                    onClick={() => handlePermanentDelete(item)}
                    title="Végleges törlés"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Danger Zone: Account Deletion */}
      <Card variant="surface" radius="20" className="p-6 border border-status-rest/30 bg-status-rest/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-status-rest">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <h4 className="text-14 font-bold">{t("settings.dangerZoneTitle")}</h4>
          </div>
          <Badge variant="rest" size="sm">
            GDPR Art. 17
          </Badge>
        </div>

        <p className="text-12 text-text-secondary">
          {t("settings.deleteAccountDesc")}
        </p>

        <div>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => setShowDeleteModal(true)}
          >
            {t("settings.deleteAccountBtn")}
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <BottomSheet
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t("settings.deleteConfirmTitle")}
      >
        <div className="space-y-4 p-4">
          <div className="flex items-start gap-3 p-3 rounded-12 bg-status-rest/10 border border-status-rest/30 text-status-rest text-12">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{t("settings.deleteConfirmDesc")}</span>
          </div>

          <p className="text-13 text-text-secondary">
            A törlés azonnal meghívja a szerveroldali Cloud Function-t, amely eltávolítja a teljes felhasználói dokumentumot, biometrikus mérési előzményeket, edzésnaplókat és a hitelesítési rekordot.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              variant="tertiary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              isLoading={isDeleting}
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={handleDeleteAccount}
            >
              {t("settings.deleteConfirmButton")}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Logout Safety Confirmation */}
      <LogoutConfirmationModal
        isOpen={pendingLogoutCount !== null}
        pendingCount={pendingLogoutCount || 0}
        isSyncing={isSyncingLogout}
        onClose={() => setPendingLogoutCount(null)}
        onSync={handleSyncAndSignOut}
        onForceLogout={() => handleSignOutClick(true)}
      />

      {/* Diagnostics */}
      <div className="text-center text-11 text-text-tertiary space-y-1">
        <div className="flex items-center justify-center gap-1">
          <Flame className="h-3.5 w-3.5 text-brand" />
          <span>Apex Pro Cockpit Platform v1.2.1 (build 20261028-sync)</span>
        </div>
        <p>GDPR Art. 9 & 17 Compliant • Encrypted Biometric Store</p>
      </div>
    </div>
  );
};

export default SettingsPage;
