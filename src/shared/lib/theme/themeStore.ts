import { useCallback } from "react";
import { useAppearanceStore, ThemeOption } from "../appearance/appearanceStore";

export type ThemeMode = "system" | "dark" | "light";

export const useThemeStore = () => {
  const theme = useAppearanceStore((s) => s.theme);
  const resolvedTheme = useAppearanceStore((s) => s.resolvedTheme);
  const setThemeRaw = useAppearanceStore((s) => s.setTheme);

  const normalizedTheme: ThemeMode = theme === "auto" ? "system" : theme;

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      const next: ThemeOption = mode === "system" ? "auto" : mode;
      setThemeRaw(next);
    },
    [setThemeRaw]
  );

  return {
    theme: normalizedTheme,
    resolvedTheme,
    setTheme
  };
};

// Compatibility for direct getState() calls if any
(useThemeStore as unknown as { getState: () => { theme: ThemeMode; resolvedTheme: "dark" | "light"; setTheme: (m: ThemeMode) => void } }).getState = () => {
  const s = useAppearanceStore.getState();
  return {
    theme: s.theme === "auto" ? "system" : s.theme,
    resolvedTheme: s.resolvedTheme,
    setTheme: (mode: ThemeMode) => {
      s.setTheme(mode === "system" ? "auto" : mode);
    }
  };
};

export const initThemeListener = () => {
  // Handled inside appearanceStore
  return () => {};
};
