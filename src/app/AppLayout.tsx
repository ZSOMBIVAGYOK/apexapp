import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Search,
  Moon,
  Sun,
  Laptop,
  Command,
  Flame,
  Globe,
  LogOut,
  ChevronRight
} from "lucide-react";
import { useAuthStore } from "@features/auth/authStore";
import { useThemeStore, ThemeMode } from "@shared/lib/theme/themeStore";
import { getNavItemsForRole } from "./navigation";
import { UserRole } from "@shared/types";
import { Avatar } from "@shared/ui/Avatar";
import { Badge } from "@shared/ui/Badge";
import { ToastContainer } from "@shared/ui/Toast";
import { showToast } from "@shared/ui/toastStore";
import { PwaUpdateToast } from "@shared/ui/PwaUpdateToast";
import { PwaInstallBanner } from "@shared/ui/PwaInstallBanner";
import { OfflineIndicator } from "@shared/ui/OfflineIndicator";
import { NotificationCenter } from "@shared/ui/NotificationCenter";
import { useNotificationStore } from "@shared/lib/notifications/notificationStore";

export const AppLayout: React.FC = () => {
  const { i18n } = useTranslation();
  const { user, signOut, setUserProfile } = useAuthStore();
  const { theme, resolvedTheme, setTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Scroll listener for collapsing large title header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ⌘K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = getNavItemsForRole(user?.roles || (user?.role ? [user.role] : ["athlete"]), true);

  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith("hu") ? "en" : "hu";
    i18n.changeLanguage(nextLang);
  };

  const cycleTheme = () => {
    const next: ThemeMode = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    setTheme(next);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // Switch athlete/coach mode for role-aware demo
  const toggleRoleMode = () => {
    if (!user) return;
    const currentIsCoach = user.roles?.includes("coach") || user.role === "coach";
    const newRoles: UserRole[] = currentIsCoach ? ["athlete"] : ["athlete", "coach"];
    const newRole: UserRole = currentIsCoach ? "athlete" : "coach";
    setUserProfile({
      ...user,
      roles: newRoles,
      role: newRole,
      updatedAt: new Date().toISOString()
    });
    showToast({
      title: "Szerepkör módosítva",
      message: `Jelenlegi nézet: ${newRole === "coach" ? "Edző / Szakember" : "Sportoló"}`,
      type: "info"
    });
  };

  // Find active navigation item title for mobile collapsed header
  const currentNav =
    navItems.find((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to) && item.to !== "/"
    ) || navItems[0] || { defaultLabel: "Apex" };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col transition-colors duration-200">
      {/* WCAG AA Skip to Main Content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-12 focus:bg-brand focus:px-4 focus:py-2 focus:text-white focus:font-semibold focus:shadow-elevated"
      >
        Ugrás a tartalomra
      </a>

      {/* PWA & Network Notifications */}
      <PwaInstallBanner />
      <OfflineIndicator />

      {/* Desktop Top Header (>=1024px) */}
      <header className="hidden lg:block sticky top-0 z-40 border-b border-border-hairline bg-bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          {/* Quick Search Bar */}
          <div className="flex items-center gap-3 w-80">
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="flex w-full items-center justify-between rounded-12 border border-border-hairline bg-bg-elevated px-3 py-2 text-12 text-text-secondary hover:border-border-subtle hover:text-text-primary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Keresés edzésre, mutatóra...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 rounded-8 bg-bg-surface px-1.5 py-0.5 text-[10px] font-mono border border-border-hairline">
                <Command className="h-3 w-3" aria-hidden="true" />K
              </kbd>
            </button>
          </div>

          {/* Top Actions: Role Switcher, Language, Theme, Notifications, User */}
          <div className="flex items-center gap-2.5">
            {/* Quick Role Switcher for Cockpit Demo */}
            <button
              type="button"
              onClick={toggleRoleMode}
              className="text-12 font-medium px-2.5 py-1.5 rounded-12 border border-border-hairline bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
              title="Váltás Sportoló és Edzői nézet között"
            >
              Szerep:{" "}
              <span className="font-semibold text-brand uppercase">
                {user?.role === "coach" ? "Edző" : "Sportoló"}
              </span>
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label="Nyelvváltás"
              className="h-9 px-2.5 rounded-12 border border-border-hairline bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center gap-1.5 text-12 font-medium transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span className="uppercase">{i18n.language.startsWith("hu") ? "HU" : "EN"}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`Téma váltása: jelenleg ${theme}`}
              className="h-9 w-9 rounded-12 border border-border-hairline bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            >
              {theme === "system" ? (
                <Laptop className="h-4 w-4" aria-hidden="true" />
              ) : resolvedTheme === "dark" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Értesítések"
                className="relative h-9 w-9 rounded-12 border border-border-hairline bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand" />
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-20 border border-border-hairline bg-bg-elevated p-4 shadow-elevated z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-hairline">
                    <span className="text-14 font-semibold text-text-primary">Értesítések</span>
                    <Badge variant="brand" size="sm">Új</Badge>
                  </div>
                  <div className="space-y-2 text-12">
                    <div className="p-2.5 rounded-12 bg-bg-surface border border-border-hairline">
                      <p className="font-semibold text-text-primary">Reggeli Check-in sikeres</p>
                      <p className="text-text-secondary text-[11px] mt-0.5">Regenerációs pontszám: 92% (Optimális)</p>
                    </div>
                    <div className="p-2.5 rounded-12 bg-bg-surface border border-border-hairline">
                      <p className="font-semibold text-text-primary">Vezetőedzői megjegyzés</p>
                      <p className="text-text-secondary text-[11px] mt-0.5">Dr. Varga Tamás frissítette a délutáni futóblokkot.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-border-hairline">
              <Avatar
                name={user?.displayName || "Sportoló"}
                size="md"
                status="ready"
              />
              <div className="hidden xl:block text-left">
                <p className="text-12 font-semibold text-text-primary leading-none truncate max-w-[130px]">
                  {user?.displayName || "Kovács Zsombor"}
                </p>
                <p className="text-[11px] text-text-secondary leading-none mt-1 uppercase">
                  {user?.level || "Olimpikon"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Kijelentkezés"
                title="Kijelentkezés"
                className="h-9 w-9 rounded-12 border border-border-hairline bg-bg-surface hover:bg-status-rest/10 hover:text-status-rest text-text-secondary flex items-center justify-center transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Top App Bar (Sticky Collapsing Header) */}
      <header
        className={`lg:hidden sticky top-0 z-30 transition-all duration-200 ease-apex-out ${
          isScrolled
            ? "bg-bg-surface/90 backdrop-blur-md border-b border-border-hairline py-3 shadow-sm"
            : "bg-transparent py-4"
        }`}
      >
        <div className="px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-12 bg-brand text-white shadow-sm">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span
                className={`font-bold tracking-tight text-text-primary transition-all duration-200 ${
                  isScrolled ? "text-16" : "text-20"
                }`}
              >
                {currentNav.defaultLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleTheme}
              aria-label="Téma váltás"
              className="h-8 w-8 rounded-12 border border-border-hairline bg-bg-surface text-text-secondary flex items-center justify-center"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              className="h-8 px-2 rounded-12 border border-border-hairline bg-bg-surface text-text-secondary text-[11px] font-semibold uppercase"
            >
              {i18n.language.startsWith("hu") ? "HU" : "EN"}
            </button>
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              aria-label="Értesítések megnyitása"
              className="relative h-8 w-8 rounded-12 border border-border-hairline bg-bg-surface text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <Avatar
              name={user?.displayName || "Sportoló"}
              size="sm"
              status="ready"
              onClick={() => navigate("/settings")}
            />
          </div>
        </div>
      </header>

      {/* Main Body Shell */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 px-4 lg:px-6">
        {/* Desktop Left Sidebar (>=1024px) */}
        <aside
          aria-label="Fő navigáció"
          className="hidden lg:flex w-64 shrink-0 flex-col justify-between py-6 pr-6 border-r border-border-hairline min-h-[calc(100vh-4rem)]"
        >
          <div className="space-y-6">
            {/* Apex Brand Logo */}
            <NavLink
              to="/"
              className="flex items-center gap-2.5 px-2 select-none group"
              aria-label="Apex Kezdőlap"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-12 bg-brand text-white shadow-sm transition-transform group-hover:scale-105">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-16 font-black uppercase tracking-wider text-text-primary">
                  Apex
                </span>
                <span className="block text-[10px] uppercase font-semibold text-text-tertiary tracking-widest">
                  Cockpit v0.2
                </span>
              </div>
            </NavLink>

            {/* Navigation Menu Links */}
            <nav className="space-y-1" aria-label="Desktop Navigáció">
              {navItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-12 text-14 font-medium transition-all duration-200 ease-apex-out ${
                      isActive
                        ? "bg-brand text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.defaultLabel}</span>
                  </div>
                  {item.requiresSpecialist && (
                    <Badge variant="outline" size="sm" className="text-[10px]">
                      Stáb
                    </Badge>
                  )}
                  {item.devOnly && (
                    <Badge variant="brand" size="sm" className="text-[10px]">
                      Dev
                    </Badge>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer Info */}
          <div className="rounded-16 border border-border-hairline bg-bg-surface p-3.5 space-y-2 text-12">
            <div className="flex items-center justify-between text-text-secondary">
              <span>Kapcsolat</span>
              <span className="text-status-ready font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-status-ready animate-pulse" />
                Éles Cloud
              </span>
            </div>
            <div className="text-[11px] text-text-tertiary border-t border-border-hairline/60 pt-2">
              Interdiszciplináris platform
            </div>
          </div>
        </aside>

        {/* Content Outlet Canvas */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 py-4 lg:py-8 lg:pl-8 pb-28 lg:pb-12 focus:outline-none min-w-0"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar with Frosted Glass (5 Items for Athletes, 6 for Coach) */}
      <nav
        aria-label="Mobil navigáció"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-hairline bg-bg-surface/85 backdrop-blur-xl"
      >
        <div
          className={`grid h-16 items-center px-1 max-w-lg mx-auto ${
            navItems.length <= 5 ? "grid-cols-5" : "grid-cols-6"
          }`}
        >
          {navItems.slice(0, 6).map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 transition-colors select-none ${
                  isActive
                    ? "text-brand font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`
              }
            >
              <item.icon className="h-5 w-5 mb-0.5" aria-hidden="true" />
              <span className="text-[10px] tracking-tight truncate max-w-[54px]">
                {item.defaultLabel}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Quick Search Modal */}
      {showSearchModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSearchModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-20 border border-border-hairline bg-bg-elevated p-4 shadow-elevated">
            <div className="flex items-center gap-3 pb-3 border-b border-border-hairline">
              <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
              <input
                type="text"
                autoFocus
                placeholder="Keress edzést, receptet, sportorvost, vagy mutatót..."
                className="w-full bg-transparent text-14 text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
              <kbd
                onClick={() => setShowSearchModal(false)}
                className="cursor-pointer px-2 py-0.5 text-12 font-mono text-text-secondary rounded-8 bg-bg-surface border border-border-hairline"
              >
                ESC
              </kbd>
            </div>
            <div className="py-3 text-12 text-text-secondary space-y-1">
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Gyors parancsok
              </p>
              <button
                type="button"
                onClick={() => {
                  navigate("/checkin");
                  setShowSearchModal(false);
                }}
                className="w-full text-left px-3 py-2 rounded-12 hover:bg-bg-surface flex items-center justify-between text-text-primary"
              >
                <span>Napi Check-in kitöltése</span>
                <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/training");
                  setShowSearchModal(false);
                }}
                className="w-full text-left px-3 py-2 rounded-12 hover:bg-bg-surface flex items-center justify-between text-text-primary"
              >
                <span>Edzésnapló megnyitása</span>
                <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" />
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/design");
                  setShowSearchModal(false);
                }}
                className="w-full text-left px-3 py-2 rounded-12 hover:bg-bg-surface flex items-center justify-between text-brand"
              >
                <span>Design System & Styleguide</span>
                <ChevronRight className="h-3.5 w-3.5 text-brand" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive In-App Notification Center */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* App-Wide Toasts & PWA Updates */}
      <ToastContainer />
      <PwaUpdateToast />
    </div>
  );
};

export default AppLayout;
