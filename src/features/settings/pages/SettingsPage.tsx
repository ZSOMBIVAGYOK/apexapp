import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@features/auth/authStore";
import { useThemeStore } from "@shared/lib/theme/themeStore";
import {
  Card,
  Button,
  SegmentedControl,
  Avatar,
  Badge,
  SectionHeader,
  showToast
} from "@shared/ui";
import {
  Globe,
  Shield,
  Palette,
  Users,
  Cpu,
  LogOut,
  ExternalLink
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut, setUserProfile } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    showToast({
      title: "Nyelv beállítva",
      message: lang === "hu" ? "Magyar nyelv aktív" : "English language set",
      type: "info"
    });
  };

  const handleThemeChange = (newTheme: "dark" | "light" | "system") => {
    setTheme(newTheme);
    showToast({
      title: "Megjelenés módosítva",
      message: `Téma: ${newTheme === "dark" ? "Sötét" : newTheme === "light" ? "Világos" : "Rendszer követése"}`,
      type: "info"
    });
  };

  const handleRoleChange = (role: "athlete" | "coach") => {
    if (!user) return;
    setUserProfile({
      ...user,
      role,
      updatedAt: new Date().toISOString()
    });
    showToast({
      title: "Szerepkör frissítve",
      message: `Navigációs mód: ${role === "coach" ? "Edző / Szakember" : "Sportoló"}`,
      type: "success"
    });
  };

  const isEmulatorActive = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {/* Header */}
      <SectionHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
        action={
          <Button
            variant="tertiary"
            size="sm"
            leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            onClick={() => navigate("/design")}
          >
            Design Styleguide
          </Button>
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
                <Badge variant="brand" size="sm">
                  {user?.role === "coach" ? "Vezetőedző" : "Sportoló"}
                </Badge>
              </div>
              <p className="text-12 text-text-secondary mt-0.5">
                {user?.email || "olimpikon@apex.hu"} • {user?.sport || "Triatlon"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/onboarding">
              <Button variant="secondary" size="sm">
                Profil szerkesztése
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
              Kijelentkezés
            </Button>
          </div>
        </div>
      </Card>

      {/* Preferences Section: Theme, Language, Role Mode */}
      <div className="space-y-4">
        <h3 className="text-14 font-semibold uppercase tracking-wider text-text-secondary">
          Megjelenés & Testreszabás
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Theme Selector */}
          <Card variant="surface" radius="20" className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-primary">
              <Palette className="h-4 w-4 text-brand" aria-hidden="true" />
              <h4 className="text-14 font-bold">Téma (Dark / Light / Rendszer)</h4>
            </div>
            <p className="text-12 text-text-secondary">
              Apple-szintű tiszta felület, sötét vagy világos módban.
            </p>
            <SegmentedControl
              options={[
                { value: "dark", label: "Sötét" },
                { value: "light", label: "Világos" },
                { value: "system", label: "Rendszer" }
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
            <p className="text-12 text-text-secondary">
              Válassz a magyar (alapértelmezett) és angol nyelv között.
            </p>
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

          {/* Role Navigation Mode Switcher */}
          <Card variant="surface" radius="20" className="p-5 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-primary">
                <Users className="h-4 w-4 text-brand" aria-hidden="true" />
                <h4 className="text-14 font-bold">Szerepkör-alapú navigáció (Role Mode)</h4>
              </div>
              <Badge variant="outline" size="sm">
                Dinamikus Cockpit
              </Badge>
            </div>
            <p className="text-12 text-text-secondary">
              A sportolók 5 fület látnak (Ma, Terv, Étrend, Regeneráció, Profil). Edzői és szakemberi módban megjelenik a <strong>Csapat (Team)</strong> menüpont.
            </p>
            <SegmentedControl
              options={[
                { value: "athlete", label: "Sportoló nézet (5 tab)" },
                { value: "coach", label: "Edző / Szakember nézet (+ Csapat)" }
              ]}
              value={user?.role === "coach" ? "coach" : "athlete"}
              onChange={(val) => handleRoleChange(val as "athlete" | "coach")}
              fullWidth
            />
          </Card>
        </div>
      </div>

      {/* System & Architecture Diagnostics */}
      <Card variant="surface" radius="20" className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-text-primary">
          <Cpu className="h-4 w-4 text-brand" aria-hidden="true" />
          <h4 className="text-14 font-bold">Rendszer & Architektúra</h4>
        </div>

        <div className="space-y-3 text-12 divide-y divide-border-hairline">
          <div className="flex justify-between items-center pt-2">
            <span className="text-text-secondary">{t("settings.version")}</span>
            <span className="font-mono text-text-primary font-medium">v0.2.0 (Design System Shell)</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-text-secondary">{t("settings.offlineMode")}</span>
            <span className="text-status-ready font-medium flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              Service Worker & Gyorsítótár Aktív
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-text-secondary">Firebase Csatlakozás</span>
            <Badge variant={isEmulatorActive ? "caution" : "ready"} dot size="sm">
              {isEmulatorActive ? "Emulátor Mód" : "Éles Firebase Cloud"}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
