"use client";

import { useThemeStore } from "../stores/theme.store";
import type { ThemeMode } from "../stores/theme.store";

/**
 * Hook để sử dụng theme
 */
export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore();

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}

