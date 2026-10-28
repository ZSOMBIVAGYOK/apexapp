import { create } from "zustand";

export type ThemeOption = "auto" | "dark" | "light";
export type GlassOption = "full" | "reduced" | "none";
export type TextSizeOption = "small" | "default" | "large";

export interface AppearanceState {
  theme: ThemeOption;
  resolvedTheme: "dark" | "light";
  glass: GlassOption;
  reducedMotion: boolean;
  textSize: TextSizeOption;

  setTheme: (theme: ThemeOption) => void;
  setGlass: (glass: GlassOption) => void;
  setReducedMotion: (enabled: boolean) => void;
  setTextSize: (size: TextSizeOption) => void;
}

const STORAGE_KEY = "apex_appearance";
const LEGACY_THEME_KEY = "apex-theme-mode";

const getSystemTheme = (): "dark" | "light" => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getSystemReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

interface StoredAppearance {
  theme?: ThemeOption;
  glass?: GlassOption;
  reducedMotion?: boolean;
  textSize?: TextSizeOption;
}

const loadStoredAppearance = (): StoredAppearance => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Legacy fallback
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === "dark" || legacy === "light") {
      return { theme: legacy };
    }
  } catch {
    // fallback
  }
  return {};
};

const initialStored = loadStoredAppearance();
const initialTheme: ThemeOption = initialStored.theme || "dark";
const initialResolvedTheme: "dark" | "light" =
  initialTheme === "auto" ? getSystemTheme() : initialTheme;
const initialGlass: GlassOption = initialStored.glass || "full";
const initialReducedMotion: boolean =
  initialStored.reducedMotion !== undefined
    ? initialStored.reducedMotion
    : getSystemReducedMotion();
const initialTextSize: TextSizeOption = initialStored.textSize || "default";

const applyToDOM = (state: {
  resolvedTheme: "dark" | "light";
  glass: GlassOption;
  reducedMotion: boolean;
  textSize: TextSizeOption;
}) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Theme
  root.setAttribute("data-theme", state.resolvedTheme);
  root.classList.toggle("dark", state.resolvedTheme === "dark");
  root.classList.toggle("light", state.resolvedTheme === "light");
  root.style.colorScheme = state.resolvedTheme;

  // Glass
  root.setAttribute("data-glass", state.glass);

  // Text size
  root.setAttribute("data-text-size", state.textSize);

  // Motion
  root.setAttribute("data-reduced-motion", state.reducedMotion ? "true" : "false");

  // Meta theme-color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", state.resolvedTheme === "dark" ? "#07080B" : "#F2F4F8");
  }
};

const persist = (data: Partial<StoredAppearance>) => {
  if (typeof window === "undefined") return;
  try {
    const current = loadStoredAppearance();
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (data.theme) {
      localStorage.setItem(LEGACY_THEME_KEY, data.theme === "auto" ? "system" : data.theme);
    }
  } catch {
    // storage unavailable
  }
};

export const useAppearanceStore = create<AppearanceState>((set, get) => {
  // Apply initial on load
  if (typeof document !== "undefined") {
    applyToDOM({
      resolvedTheme: initialResolvedTheme,
      glass: initialGlass,
      reducedMotion: initialReducedMotion,
      textSize: initialTextSize
    });
  }

  return {
    theme: initialTheme,
    resolvedTheme: initialResolvedTheme,
    glass: initialGlass,
    reducedMotion: initialReducedMotion,
    textSize: initialTextSize,

    setTheme: (newTheme) => {
      const current = get();
      const resolved = newTheme === "auto" ? getSystemTheme() : newTheme;
      if (current.theme === newTheme && current.resolvedTheme === resolved) return;
      persist({ theme: newTheme });
      applyToDOM({
        resolvedTheme: resolved,
        glass: current.glass,
        reducedMotion: current.reducedMotion,
        textSize: current.textSize
      });
      set({ theme: newTheme, resolvedTheme: resolved });
    },

    setGlass: (newGlass) => {
      const current = get();
      if (current.glass === newGlass) return;
      persist({ glass: newGlass });
      applyToDOM({
        resolvedTheme: current.resolvedTheme,
        glass: newGlass,
        reducedMotion: current.reducedMotion,
        textSize: current.textSize
      });
      set({ glass: newGlass });
    },

    setReducedMotion: (enabled) => {
      const current = get();
      if (current.reducedMotion === enabled) return;
      persist({ reducedMotion: enabled });
      applyToDOM({
        resolvedTheme: current.resolvedTheme,
        glass: current.glass,
        reducedMotion: enabled,
        textSize: current.textSize
      });
      set({ reducedMotion: enabled });
    },

    setTextSize: (newSize) => {
      const current = get();
      if (current.textSize === newSize) return;
      persist({ textSize: newSize });
      applyToDOM({
        resolvedTheme: current.resolvedTheme,
        glass: current.glass,
        reducedMotion: current.reducedMotion,
        textSize: newSize
      });
      set({ textSize: newSize });
    }
  };
});

// Listener for system changes
if (typeof window !== "undefined") {
  const colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
  colorQuery.addEventListener("change", (e) => {
    const store = useAppearanceStore.getState();
    if (store.theme === "auto") {
      const resolved = e.matches ? "dark" : "light";
      if (store.resolvedTheme === resolved) return;
      applyToDOM({
        resolvedTheme: resolved,
        glass: store.glass,
        reducedMotion: store.reducedMotion,
        textSize: store.textSize
      });
      useAppearanceStore.setState({ resolvedTheme: resolved });
    }
  });

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener("change", (e) => {
    const stored = loadStoredAppearance();
    if (stored.reducedMotion === undefined) {
      const current = useAppearanceStore.getState();
      if (current.reducedMotion !== e.matches) {
        current.setReducedMotion(e.matches);
      }
    }
  });
}
