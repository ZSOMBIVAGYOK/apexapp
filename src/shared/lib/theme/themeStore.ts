import { create } from "zustand";

export type ThemeMode = "system" | "dark" | "light";

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: ThemeMode) => void;
}

const STORAGE_KEY = "apex-theme-mode";

const getSystemTheme = (): "dark" | "light" => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }
  return "dark"; // Dark theme default as requested
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  resolvedTheme: getInitialTheme() === "system" ? getSystemTheme() : (getInitialTheme() as "dark" | "light"),

  setTheme: (newTheme: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    const resolved = newTheme === "system" ? getSystemTheme() : newTheme;
    applyThemeToDOM(resolved);
    set({ theme: newTheme, resolvedTheme: resolved });
  }
}));

const applyThemeToDOM = (resolved: "dark" | "light") => {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }

  // Update theme-color meta tag for PWA bar
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", resolved === "dark" ? "#0B0C0F" : "#F5F6F8");
  }
};

// Initialize system theme listener
export const initThemeListener = () => {
  if (typeof window === "undefined") return () => {};

  const initial = useThemeStore.getState().theme;
  const initialResolved = initial === "system" ? getSystemTheme() : initial;
  applyThemeToDOM(initialResolved);

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    if (useThemeStore.getState().theme === "system") {
      const resolved = e.matches ? "dark" : "light";
      applyThemeToDOM(resolved);
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  };

  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
};
