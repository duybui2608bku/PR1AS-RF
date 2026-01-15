"use client";

import { useThemeStore } from "../stores/theme.store";
import type { ThemeMode } from "../stores/theme.store";
import { ThemeMode as ThemeModeEnum } from "../constants/theme.constants";

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore();

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === ThemeModeEnum.DARK,
    isLight: theme === ThemeModeEnum.LIGHT,
  };
}

