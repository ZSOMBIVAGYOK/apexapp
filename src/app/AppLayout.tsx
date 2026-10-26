import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Activity,
  Dumbbell,
  Apple,
  Smartphone,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Flame,
  Globe
} from "lucide-react";
import { useAuthStore } from "@features/auth/authStore";
import { PwaUpdateToast } from "@shared/ui/PwaUpdateToast";
import { PwaInstallBanner } from "@shared/ui/PwaInstallBanner";
import { OfflineIndicator } from "@shared/ui/OfflineIndicator";

export const AppLayout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith("hu") ? "en" : "hu";
    i18n.changeLanguage(nextLang);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const navItems = [
    { to: "/", icon: CalendarDays, label: t("nav.today"), exact: true },
    { to: "/checkin", icon: Activity, label: t("nav.checkin") },
    { to: "/training", icon: Dumbbell, label: t("nav.training") },
    { to: "/nutrition", icon: Apple, label: t("nav.nutrition") },
    { to: "/insights", icon: BarChart3, label: t("nav.insights") },
    { to: "/devices", icon: Smartphone, label: t("nav.devices") },
    { to: "/coach", icon: Users, label: t("nav.coach") },
    { to: "/settings", icon: Settings, label: t("nav.settings") }
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col">
      {/* Skip to main content link for WCAG AA compliance */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-apex-500 focus:px-4 focus:py-2 focus:text-brand-dark focus:font-bold focus:shadow-xl focus:outline-none"
      >
        Ugrás a tartalomra (Skip to content)
      </a>

      {/* PWA Banners & Offline Status */}
      <PwaInstallBanner />
      <OfflineIndicator />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-brand-muted bg-brand-dark/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="flex items-center gap-2 text-lg font-black tracking-wider text-slate-100 transition-opacity hover:opacity-90"
              aria-label="Apex Home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-apex-400 to-apex-600 text-brand-dark shadow-lg shadow-apex-500/20">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="font-extrabold uppercase">Apex</span>
            </NavLink>
            <span className="hidden sm:inline-flex items-center rounded-full bg-apex-500/10 px-2.5 py-0.5 text-xs font-semibold text-apex-400 border border-apex-500/20">
              Pro Platform
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t("common.language")}
              className="flex items-center gap-1.5 rounded-lg border border-brand-muted bg-brand-card px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-apex-400"
            >
              <Globe className="h-3.5 w-3.5 text-apex-400" aria-hidden="true" />
              <span className="uppercase">{i18n.language.startsWith("hu") ? "HU" : "EN"}</span>
            </button>

            {/* User Info / Logout */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-block text-xs text-slate-400 max-w-[140px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title={t("common.logout")}
                  aria-label={t("common.logout")}
                  className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 sm:px-6">
        {/* Desktop Sidebar Navigation */}
        <aside
          aria-label="Oldalsó navigáció"
          className="hidden w-64 shrink-0 py-6 md:block border-r border-brand-muted pr-6"
        >
          <nav className="flex flex-col gap-1.5" aria-label="Desktop Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-apex-500 text-brand-dark shadow-md shadow-apex-500/20"
                      : "text-slate-400 hover:bg-brand-card hover:text-slate-200"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content Outlet */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 py-6 pb-24 md:pb-12 md:pl-6 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobil navigáció"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-muted bg-brand-card/95 backdrop-blur-lg md:hidden"
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors ${
                  isActive ? "text-apex-400 font-bold" : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              <item.icon className="h-5 w-5 mb-0.5" aria-hidden="true" />
              <span className="truncate max-w-[58px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* PWA Update Toast */}
      <PwaUpdateToast />
    </div>
  );
};

export default AppLayout;
