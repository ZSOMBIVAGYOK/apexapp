import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { useThemeStore } from "@shared/lib/theme/themeStore";
import { callDeleteUserData } from "@features/auth/authService";
import { DataMode, SupportMode, UnitSystem } from "@shared/types";
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
  ChevronRight
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, updateProfile, isDemoUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Notification state
  const notifications = user?.notifications || {
    morningReminder: true,
    workoutReminder: true,
    coachFeedback: true,
    weeklyReport: false
  };

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

  const handleThemeChange = (newTheme: "dark" | "light" | "system") => {
    setTheme(newTheme);
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

  const handleToggleNotification = async (key: keyof typeof notifications) => {
    const updated = {
      ...notifications,
      [key]: !notifications[key]
    };
    await updateProfile({ notifications: updated });
  };

  // Export User Data as JSON
  const handleExportData = () => {
    setIsExporting(true);
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
        app: "Apex Athletic Platform",
        profile: user,
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
      link.download = `apex-athlete-data-${user?.uid || "export"}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast({
        title: t("settings.exportDataTitle"),
        message: "A JSON adatexport sikeresen letöltődött a gépedre.",
        type: "success"
      });
    } catch {
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
          <div className="flex items-center gap-2">
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
            <Link to="/onboarding">
              <Button variant="secondary" size="sm">
                {t("settings.editProfile")}
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
              onClick={async () => {
                await signOut();
                navigate("/auth");
              }}
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

      {/* Preferences Section: Theme, Language, Units */}
      <div className="space-y-4">
        <h3 className="text-12 font-semibold uppercase tracking-wider text-text-secondary">
          Megjelenés & Nyelv
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Theme Selector */}
          <Card variant="surface" radius="20" className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Palette className="h-4 w-4 text-brand" aria-hidden="true" />
              <h4 className="text-14 font-bold">{t("settings.themePref")}</h4>
            </div>
            <SegmentedControl
              options={[
                { value: "dark", label: t("common.dark") },
                { value: "light", label: t("common.light") },
                { value: "system", label: t("common.system") }
              ]}
              value={theme}
              onChange={(val) => handleThemeChange(val as "dark" | "light" | "system")}
              fullWidth
            />
          </Card>

          {/* Language Selector */}
          <Card variant="surface" radius="20" className="p-5 space-y-3">
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
          <Card variant="surface" radius="20" className="p-5 space-y-3 md:col-span-2">
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

      {/* Notifications Preferences */}
      <Card variant="surface" radius="20" className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Bell className="h-4 w-4 text-brand" aria-hidden="true" />
          <h4 className="text-14 font-bold">{t("settings.notificationsTitle")}</h4>
        </div>

        <div className="divide-y divide-border-hairline">
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                {t("settings.notifMorning")}
              </span>
              <span className="text-11 text-text-secondary">
                Ébredés utáni automatikus értesítés 07:00-kor
              </span>
            </div>
            <Toggle
              checked={notifications.morningReminder}
              onChange={() => handleToggleNotification("morningReminder")}
              label={t("settings.notifMorning")}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                {t("settings.notifWorkout")}
              </span>
              <span className="text-11 text-text-secondary">
                1 órával a tervezett edzésblokk előtt
              </span>
            </div>
            <Toggle
              checked={notifications.workoutReminder}
              onChange={() => handleToggleNotification("workoutReminder")}
              label={t("settings.notifWorkout")}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                {t("settings.notifCoach")}
              </span>
              <span className="text-11 text-text-secondary">
                Amikor az edződ módosítja a tervet vagy visszajelzést ír
              </span>
            </div>
            <Toggle
              checked={notifications.coachFeedback}
              onChange={() => handleToggleNotification("coachFeedback")}
              label={t("settings.notifCoach")}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-13 font-medium text-text-primary block">
                {t("settings.notifWeekly")}
              </span>
              <span className="text-11 text-text-secondary">
                Vasárnap este készülő ACWR és terhelési összegző
              </span>
            </div>
            <Toggle
              checked={notifications.weeklyReport}
              onChange={() => handleToggleNotification("weeklyReport")}
              label={t("settings.notifWeekly")}
            />
          </div>
        </div>
      </Card>

      {/* GDPR Data Portability & Export */}
      <Card variant="surface" radius="20" className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-primary">
            <Download className="h-4 w-4 text-brand" aria-hidden="true" />
            <h4 className="text-14 font-bold">{t("settings.exportDataTitle")}</h4>
          </div>
          <Badge variant="brand" size="sm">
            GDPR Art. 20
          </Badge>
        </div>
        <p className="text-12 text-text-secondary">
          {t("settings.exportDataDesc")}
        </p>
        <div>
          <Button
            variant="secondary"
            size="sm"
            isLoading={isExporting}
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={handleExportData}
          >
            {t("settings.exportDataBtn")}
          </Button>
        </div>
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

      {/* Diagnostics */}
      <div className="text-center text-11 text-text-tertiary space-y-1">
        <div className="flex items-center justify-center gap-1">
          <Flame className="h-3.5 w-3.5 text-brand" />
          <span>Apex Pro Cockpit Platform v0.3.0</span>
        </div>
        <p>GDPR Art. 9 & 17 Compliant • Encrypted Biometric Store</p>
      </div>
    </div>
  );
};

export default SettingsPage;
