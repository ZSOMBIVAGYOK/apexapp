import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  HelpCircle,
  X
} from "lucide-react";
import { useAuthStore } from "@features/auth/authStore";
import { useAppearanceStore } from "@shared/lib/appearance/appearanceStore";
import { getNavItemsForRole } from "./navigation";
import { UserRole } from "@shared/types";
import { Avatar } from "@shared/ui/Avatar";
import { Badge } from "@shared/ui/Badge";
import { ToastContainer } from "@shared/ui/Toast";
import { showToast } from "@shared/ui/toastStore";
import { PwaInstallBanner } from "@shared/ui/PwaInstallBanner";
import { OfflineIndicator } from "@shared/ui/OfflineIndicator";
import { NotificationCenter } from "@shared/ui/NotificationCenter";
import { SyncStatusBadge } from "@shared/ui/SyncStatusBadge";
import { ErrorBoundary } from "@shared/ui/ErrorBoundary";
import { useNotificationStore } from "@shared/lib/notifications/notificationStore";
import { flushOfflineQueue } from "@shared/lib/offline/offlineStorage";
import { runEmergencyDataRecovery } from "@shared/lib/storage/recoveryRoutine";
import { useRenderLoopDetector } from "@shared/hooks/useRenderLoopDetector";

export const AppLayout: React.FC = () => {
  useRenderLoopDetector("AppLayout");
  const { i18n } = useTranslation();
  const { user, signOut, setUserProfile } = useAuthStore();
  const theme = useAppearanceStore((s) => s.theme);
  const resolvedTheme = useAppearanceStore((s) => s.resolvedTheme);
  const setTheme = useAppearanceStore((s) => s.setTheme);
  const location = useLocation();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQuickActionSheet, setShowQuickActionSheet] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Persistent sidebar collapse state for laptops (>=1024px)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("apex_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("apex_sidebar_collapsed", next ? "true" : "false");
      } catch {
        // storage quota
      }
      return next;
    });
  };

  const [showBetaBanner, setShowBetaBanner] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("apex_hide_beta_banner") !== "true";
  });

  const dismissBetaBanner = () => {
    setShowBetaBanner(false);
    try {
      localStorage.setItem("apex_hide_beta_banner", "true");
    } catch {
      // storage full
    }
  };

  // Scroll listener for collapsing top header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled((prev) => {
        const next = window.scrollY > 20;
        return prev === next ? prev : next;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcuts: ⌘K, ?, N, G sequences
  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          setShowSearchModal((prev) => !prev);
        }
        return;
      }

      // ⌘K Search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
        return;
      }

      // ? for shortcuts help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Escape closes modals
      if (e.key === "Escape") {
        setShowSearchModal(false);
        setShowShortcutsModal(false);
        setShowQuickActionSheet(false);
        setShowNotifications(false);
        return;
      }

      // N for new training session
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        navigate("/training");
        showToast({ title: "Edzések", message: "Átnavigálás az edzésnaplóhoz", type: "info" });
        return;
      }

      // G key combinations (G then T, G then E, G then M, G then R, G then S)
      const now = Date.now();
      if (e.key === "g" || e.key === "G") {
        lastKey = "g";
        lastKeyTime = now;
        return;
      }

      if (lastKey === "g" && now - lastKeyTime < 1200) {
        lastKey = "";
        if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          navigate("/");
          return;
        }
        if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          navigate("/training");
          return;
        }
        if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          navigate("/nutrition");
          return;
        }
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          navigate("/insights");
          return;
        }
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          navigate("/settings");
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const userRoles = user?.roles;
  const userRole = user?.role;
  const navItems = useMemo(
    () => getNavItemsForRole(userRoles || (userRole ? [userRole] : ["athlete"]), true),
    [userRoles, userRole]
  );

  const toggleLanguage = () => {
    const nextLang = i18n.language?.startsWith("hu") ? "en" : "hu";
    i18n.changeLanguage(nextLang);
  };

  const cycleTheme = () => {
    const next = theme === "dark" ? "light" : theme === "light" ? "auto" : "dark";
    setTheme(next);
  };

  // Emergency recovery routine on login/mount
  useEffect(() => {
    if (user?.uid) {
      runEmergencyDataRecovery(user.uid).then((res) => {
        if (res.recoveredSessions > 0 || res.recoveredWorkouts > 0 || res.recoveredDailies > 0) {
          showToast({
            title: "Helyi adatok helyreállítva",
            message: `${res.recoveredSessions + res.recoveredWorkouts + res.recoveredDailies} korábban elmentett elem feltöltve a felhőbe!`,
            type: "success"
          });
        }
      });
    }
  }, [user?.uid]);

  const handleSignOut = async (force = false) => {
    const res = await signOut(force);
    if (res?.blocked) {
      try {
        await flushOfflineQueue();
        await signOut(true);
      } catch {
        // forced
      }
    }
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

  // Active navigation item for mobile header & sliding lens
  const activeNavItem = useMemo(() => {
    return (
      navItems.find((item) =>
        item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to) && item.to !== "/"
      ) || navItems[0]
    );
  }, [location.pathname, navItems]);

  const currentNav = activeNavItem || { defaultLabel: "Apex" };

  // Mobile Floating Tab Bar Sliding Lens State
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const tabButtonsRef = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [mobileLens, setMobileLens] = useState<{ left: number; width: number } | null>(null);

  const updateMobileLens = useCallback(() => {
    if (!activeNavItem) return;
    const activeEl = tabButtonsRef.current.get(activeNavItem.id);
    if (activeEl && tabContainerRef.current) {
      const nextLeft = activeEl.offsetLeft;
      const nextWidth = activeEl.offsetWidth;
      setMobileLens((prev) => {
        if (prev && prev.left === nextLeft && prev.width === nextWidth) return prev;
        return { left: nextLeft, width: nextWidth };
      });
    }
  }, [activeNavItem]);

  useLayoutEffect(() => {
    updateMobileLens();
    window.addEventListener("resize", updateMobileLens);
    return () => window.removeEventListener("resize", updateMobileLens);
  }, [updateMobileLens]);

  return (
    <div className="relative min-h-[100dvh] bg-bg-primary text-text-primary flex flex-col transition-colors duration-280">
      {/* Static Ambient Gradient Mesh Layer */}
      <div className="ambient-gradient-mesh" aria-hidden="true" />

      {/* WCAG AA Skip to Main Content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-white focus:font-semibold focus:shadow-elevated"
      >
        Ugrás a tartalomra
      </a>

      {/* PWA & Network Notifications */}
      <PwaInstallBanner />
      <OfflineIndicator />

      {/* Dismissible Beta Banner */}
      {showBetaBanner && (
        <aside
          aria-label="Béta verzió értesítés"
          className="bg-brand/10 border-b border-brand/20 px-4 py-2 text-12 text-text-primary z-50 relative select-none"
        >
          <div className="mx-auto max-w-[1280px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold px-2 py-0.5 rounded-full bg-brand text-white text-[10px] tracking-wide uppercase">
                Tesztverzió (Béta)
              </span>
              <span className="text-text-secondary text-12">
                Az Apex fejlesztés alatt áll. Nem orvosi tanácsadás.
              </span>
              <span className="hidden sm:inline text-border/60">•</span>
              <a
                href="mailto:marenecdozsazsombor7@gmail.com?subject=Apex%20Béta%20Visszajelzés"
                className="font-semibold text-brand underline hover:text-brand-hover"
              >
                Visszajelzés küldése
              </a>
              <span className="hidden sm:inline text-border/60">•</span>
              <NavLink to="/privacy" className="text-text-tertiary hover:underline">
                Adatvédelem
              </NavLink>
            </div>
            <button
              type="button"
              onClick={dismissBetaBanner}
              aria-label="Béta értesítés elrejtése"
              className="touch-target p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Desktop Liquid Glass Top Bar (>=1024px) */}
      <header className="hidden lg:block sticky top-0 z-40 border-b border-border/60 glass-thin">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
          {/* Quick Search Bar with ⌘K */}
          <div className="flex items-center gap-3 w-80">
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="flex w-full items-center justify-between rounded-control border border-border/60 bg-bg-surface-solid dark:bg-white/[0.04] px-3.5 py-2 text-13 text-text-secondary hover:border-border hover:text-text-primary transition-all duration-160 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-inner"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                <span>Keresés (edzés, étrend, mutató)...</span>
              </div>
              <kbd className="inline-flex items-center gap-0.5 rounded-8 bg-bg-surface px-1.5 py-0.5 text-[10px] font-mono border border-border/60 text-text-tertiary shadow-sm">
                <Command className="h-3 w-3" aria-hidden="true" />K
              </kbd>
            </button>
          </div>

          {/* Top Actions: Sync, Role, Language, Theme, Shortcuts, Notifications, User */}
          <div className="flex items-center gap-2.5">
            <SyncStatusBadge />

            {/* Quick Role Switcher */}
            <button
              type="button"
              onClick={toggleRoleMode}
              className="touch-target text-12 font-medium px-3 py-1.5 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
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
              className="touch-target h-9 px-3 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center gap-1.5 text-12 font-medium transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span className="uppercase">{i18n.language?.startsWith("hu") ? "HU" : "EN"}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`Téma váltása: jelenleg ${theme}`}
              className="touch-target h-9 w-9 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            >
              {theme === "auto" ? (
                <Laptop className="h-4 w-4" aria-hidden="true" />
              ) : resolvedTheme === "dark" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Shortcuts Help (?) */}
            <button
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              aria-label="Gyorsbillentyűk súgó"
              title="Gyorsbillentyűk súgó (?)"
              className="touch-target h-9 w-9 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Értesítések"
                className="touch-target relative h-9 w-9 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] hover:bg-bg-elevated text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand animate-pulse" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-card border border-border/60 glass-thick p-4 shadow-glass-lg z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
                    <span className="text-14 font-semibold text-text-primary">Értesítések</span>
                    <Badge variant="brand" size="sm">Új</Badge>
                  </div>
                  <div className="space-y-2 text-12">
                    <div className="p-2.5 rounded-14 bg-bg-surface border border-border/40">
                      <p className="font-semibold text-text-primary">Reggeli Check-in sikeres</p>
                      <p className="text-text-secondary text-[11px] mt-0.5">Regenerációs pontszám: 92% (Optimális)</p>
                    </div>
                    <div className="p-2.5 rounded-14 bg-bg-surface border border-border/40">
                      <p className="font-semibold text-text-primary">Vezetőedzői megjegyzés</p>
                      <p className="text-text-secondary text-[11px] mt-0.5">Dr. Varga Tamás frissítette a délutáni futóblokkot.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-border/60">
              <Avatar
                name={user?.displayName || "Sportoló"}
                size="md"
                status="ready"
              />
              <div className="hidden xl:block text-left select-none">
                <p className="text-12 font-semibold text-text-primary leading-none truncate max-w-[130px]">
                  {user?.displayName || "Kovács Zsombor"}
                </p>
                <p className="text-[10px] text-text-secondary leading-none mt-1 uppercase font-semibold tracking-wider">
                  {user?.level || "Olimpikon"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSignOut()}
                aria-label="Kijelentkezés"
                title="Kijelentkezés"
                className="touch-target h-9 w-9 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] hover:bg-status-rest/15 hover:text-status-rest text-text-secondary flex items-center justify-center transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Liquid Glass Top Bar (<1024px) */}
      <header
        className={`lg:hidden sticky top-0 z-30 transition-all duration-280 ease-spring ${
          isScrolled
            ? "glass-thin border-b border-border/60 py-3 shadow-glass-sm"
            : "bg-transparent py-3.5"
        }`}
      >
        <div className="px-4 flex items-center justify-between">
          {/* Brand Lockup & Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-glass-sm">
              <Flame className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span
                className={`font-bold tracking-tight text-text-primary transition-all duration-200 block ${
                  isScrolled ? "text-16" : "text-18"
                }`}
              >
                {currentNav.defaultLabel}
              </span>
            </div>
          </div>

          {/* Contextual Actions */}
          <div className="flex items-center gap-2">
            <SyncStatusBadge showText={false} />

            <button
              type="button"
              onClick={cycleTheme}
              aria-label="Téma váltás"
              className="touch-target h-8.5 w-8.5 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] text-text-secondary flex items-center justify-center"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              aria-label="Értesítések"
              className="touch-target relative h-8.5 w-8.5 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] px-1 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Contextual Quick Primary Action (+) */}
            <button
              type="button"
              onClick={() => setShowQuickActionSheet(true)}
              aria-label="Gyors művelet hozzáadása"
              className="touch-target h-8.5 w-8.5 rounded-full bg-brand text-white flex items-center justify-center shadow-glass-sm active:scale-95 transition-transform"
            >
              <Plus className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Shell */}
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 px-4 lg:px-6">
        {/* Desktop Left Collapsible Liquid Glass Sidebar (>=1024px) */}
        <aside
          aria-label="Fő navigáció"
          className={`hidden lg:flex shrink-0 flex-col justify-between py-6 border-r border-border/60 min-h-[calc(100vh-4rem)] transition-all duration-280 ease-spring ${
            sidebarCollapsed ? "w-20 pr-3" : "w-64 pr-6"
          }`}
        >
          <div className="space-y-6">
            {/* Refined APEX Branding Lockup */}
            <div className="flex items-center justify-between px-2 select-none">
              <NavLink
                to="/"
                className="flex items-center gap-3 group"
                aria-label="Apex Kezdőlap"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-glass-sm transition-transform group-hover:scale-105">
                  <Flame className="h-5 w-5" aria-hidden="true" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="text-16 font-black tracking-widest text-text-primary uppercase block">
                      APEX
                    </span>
                    <div className="h-0.5 w-6 bg-brand/80 rounded-full mt-0.5" />
                  </div>
                )}
              </NavLink>

              {/* Sidebar Collapse Toggle Button */}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={sidebarCollapsed ? "Oldalsáv kinyitása" : "Oldalsáv összecsukása"}
                title={sidebarCollapsed ? "Oldalsáv kinyitása" : "Oldalsáv összecsukása"}
                className="touch-target h-7 w-7 rounded-full border border-border/60 bg-bg-surface-solid dark:bg-white/[0.05] text-text-secondary hover:text-text-primary hover:bg-bg-elevated flex items-center justify-center transition-colors"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Navigation Menu Links */}
            <nav className="space-y-1.5" aria-label="Desktop Navigáció">
              {navItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.exact}
                  title={sidebarCollapsed ? item.defaultLabel : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center ${
                      sidebarCollapsed ? "justify-center px-2 py-3" : "justify-between px-3.5 py-2.5"
                    } rounded-full text-14 font-medium transition-all duration-160 ease-spring select-none ${
                      isActive
                        ? "bg-brand text-white shadow-glass-sm dark:shadow-[0_2px_12px_rgba(61,123,255,0.35)]"
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated dark:hover:bg-white/[0.05]"
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!sidebarCollapsed && <span className="truncate">{item.defaultLabel}</span>}
                  </div>
                  {!sidebarCollapsed && item.requiresSpecialist && (
                    <Badge variant="outline" size="sm" className="text-[10px]">
                      Stáb
                    </Badge>
                  )}
                  {!sidebarCollapsed && item.devOnly && (
                    <Badge variant="brand" size="sm" className="text-[10px]">
                      Dev
                    </Badge>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer Info */}
          {!sidebarCollapsed ? (
            <div className="rounded-card border border-border/60 bg-bg-surface-solid dark:bg-white/[0.03] p-3.5 space-y-2 text-12 select-none shadow-sm">
              <div className="flex items-center justify-between text-text-secondary">
                <span>Kapcsolat</span>
                <span className="text-status-ready font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-ready animate-pulse" />
                  Éles Cloud
                </span>
              </div>
              <div className="text-[11px] text-text-tertiary border-t border-border/40 pt-2 flex items-center justify-between">
                <span>Interdiszciplináris</span>
                <span className="font-mono text-[10px]">v0.2</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center select-none py-2">
              <span className="h-2 w-2 rounded-full bg-status-ready animate-pulse" title="Éles Cloud" />
            </div>
          )}
        </aside>

        {/* Content Outlet Canvas */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 py-4 lg:py-8 lg:pl-8 pb-32 lg:pb-12 focus:outline-none min-w-0 max-w-[1120px] 2xl:max-w-[1280px]"
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Floating Liquid Glass Capsule Bottom Tab Bar (<1024px) */}
      <nav
        aria-label="Mobil navigáció"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto pointer-events-auto"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div
          ref={tabContainerRef}
          className="relative grid grid-cols-5 items-center p-1.5 rounded-full glass-thin shadow-glass-lg border border-border/60"
        >
          {/* Sliding Glass Lens Indicator */}
          {mobileLens && (
            <div
              aria-hidden="true"
              className="glass-lens absolute top-1.5 bottom-1.5 rounded-full transition-all duration-280 ease-spring pointer-events-none"
              style={{
                left: `${mobileLens.left}px`,
                width: `${mobileLens.width}px`
              }}
            />
          )}

          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.exact}
              ref={(el) => {
                if (el) tabButtonsRef.current.set(item.id, el);
                else tabButtonsRef.current.delete(item.id);
              }}
              className={({ isActive }) =>
                `touch-target relative z-10 flex flex-col items-center justify-center py-1.5 rounded-full transition-colors duration-160 select-none ${
                  isActive
                    ? "text-brand font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`
              }
            >
              <item.icon className="h-5 w-5 mb-0.5 shrink-0" aria-hidden="true" />
              <span className="text-[10px] tracking-tight truncate max-w-[56px]">
                {item.defaultLabel}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Quick Search Modal (⌘K) */}
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
          <div className="relative z-10 w-full max-w-lg rounded-card border border-border/60 glass-thick p-5 shadow-glass-lg">
            <div className="flex items-center gap-3 pb-3 border-b border-border/40">
              <Search className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
              <input
                type="text"
                autoFocus
                placeholder="Keress edzést, receptet, sportorvost, vagy mutatót..."
                className="w-full bg-transparent text-16 sm:text-14 text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
              <kbd
                onClick={() => setShowSearchModal(false)}
                className="cursor-pointer px-2 py-0.5 text-12 font-mono text-text-secondary rounded-full bg-bg-surface border border-border/60"
              >
                ESC
              </kbd>
            </div>
            <div className="mt-4 space-y-2 text-13">
              <p className="text-11 uppercase font-semibold text-text-tertiary tracking-wider px-2">
                Gyors navigáció
              </p>
              <div
                onClick={() => {
                  navigate("/training");
                  setShowSearchModal(false);
                }}
                className="px-3 py-2 rounded-12 hover:bg-bg-elevated cursor-pointer flex items-center justify-between text-text-primary"
              >
                <span>Edzések & Tervezés</span>
                <span className="text-11 text-text-secondary">G + T</span>
              </div>
              <div
                onClick={() => {
                  navigate("/nutrition");
                  setShowSearchModal(false);
                }}
                className="px-3 py-2 rounded-12 hover:bg-bg-elevated cursor-pointer flex items-center justify-between text-text-primary"
              >
                <span>Étrend & Nap összeállító</span>
                <span className="text-11 text-text-secondary">G + E</span>
              </div>
              <div
                onClick={() => {
                  navigate("/insights");
                  setShowSearchModal(false);
                }}
                className="px-3 py-2 rounded-12 hover:bg-bg-elevated cursor-pointer flex items-center justify-between text-text-primary"
              >
                <span>Regeneráció & Készülékek</span>
                <span className="text-11 text-text-secondary">G + R</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Sheet Modal (?) */}
      {showShortcutsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowShortcutsModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-card border border-border/60 glass-thick p-6 shadow-glass-lg">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-brand" />
                <h3 className="text-16 font-bold text-text-primary">Gyorsbillentyűk</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="touch-target p-1 rounded-full text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-13">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Keresés megnyitása</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">⌘K</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Új edzés / Edzésnapló</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">N</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Ugrás: Ma</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">G majd M</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Ugrás: Edzésterv</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">G majd T</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Ugrás: Étrend</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">G majd E</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Ugrás: Regeneráció</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">G majd R</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Ugrás: Beállítások</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">G majd S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Gyorsbillentyűk súgó</span>
                <kbd className="px-2 py-0.5 rounded-8 bg-bg-surface border border-border/60 text-11 font-mono text-text-primary">?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Contextual Quick Action Sheet */}
      {showQuickActionSheet && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowQuickActionSheet(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-t-32 sm:rounded-32 border border-border/60 glass-thick p-5 shadow-glass-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <span className="text-14 font-bold text-text-primary">Gyors rögzítés</span>
              <button
                type="button"
                onClick={() => setShowQuickActionSheet(false)}
                className="touch-target p-1 rounded-full text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowQuickActionSheet(false);
                  navigate("/training");
                }}
                className="w-full text-left px-4 py-3 rounded-14 bg-bg-surface border border-border/60 hover:bg-bg-elevated transition-colors flex items-center justify-between font-medium text-14 text-text-primary"
              >
                <span>Új edzés rögzítése</span>
                <Plus className="h-4 w-4 text-brand" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuickActionSheet(false);
                  navigate("/nutrition");
                }}
                className="w-full text-left px-4 py-3 rounded-14 bg-bg-surface border border-border/60 hover:bg-bg-elevated transition-colors flex items-center justify-between font-medium text-14 text-text-primary"
              >
                <span>Étel rögzítése / Nap tervezése</span>
                <Plus className="h-4 w-4 text-brand" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQuickActionSheet(false);
                  navigate("/today");
                }}
                className="w-full text-left px-4 py-3 rounded-14 bg-bg-surface border border-border/60 hover:bg-bg-elevated transition-colors flex items-center justify-between font-medium text-14 text-text-primary"
              >
                <span>Reggeli Check-in kitöltése</span>
                <Plus className="h-4 w-4 text-brand" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Notifications Drawer */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
};
