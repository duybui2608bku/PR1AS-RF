"use client";

import { useEffect } from "react";
import { useThemeStore } from "../stores/theme.store";
import {
  ThemeMode,
  ThemeStorageKey,
  ThemeColor,
  ThemeOpacity,
  ThemeCSSVariable,
  ThemeAttribute,
  ThemeDefault,
} from "../constants/theme.constants";

export function ThemeSync() {
  const { theme } = useThemeStore();

  useEffect(() => {
    const applyTheme = (themeMode: ThemeMode) => {
      const body = document.body;
      const html = document.documentElement;

      const bgColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue(ThemeCSSVariable.BACKGROUND)
          .trim() || ThemeColor.LIGHT_BG_PRIMARY;
      const textColor =
        getComputedStyle(document.documentElement)
          .getPropertyValue(ThemeCSSVariable.FOREGROUND)
          .trim() || ThemeColor.LIGHT_TEXT_PRIMARY;

      if (themeMode === ThemeMode.DARK) {
        body.style.backgroundColor = ThemeColor.DARK_BG_SECONDARY;
        body.style.color = `rgba(255, 255, 255, ${ThemeOpacity.DARK_TEXT_PRIMARY})`;
        html.style.backgroundColor = ThemeColor.DARK_BG_SECONDARY;
        html.setAttribute(ThemeAttribute.DATA_THEME, ThemeMode.DARK);
      } else {
        body.style.backgroundColor = bgColor;
        body.style.color = textColor;
        html.style.backgroundColor = bgColor;
        html.setAttribute(ThemeAttribute.DATA_THEME, ThemeMode.LIGHT);
      }
    };

    applyTheme(theme);

    return () => {
      const body = document.body;
      const html = document.documentElement;
      body.style.backgroundColor = "";
      body.style.color = "";
      html.style.backgroundColor = "";
      html.removeAttribute(ThemeAttribute.DATA_THEME);
    };
  }, [theme]);

  useEffect(() => {
    const storedTheme = localStorage.getItem(ThemeStorageKey.THEME);
    if (storedTheme) {
      try {
        const parsed = JSON.parse(storedTheme);
        const themeMode = parsed?.state?.theme || ThemeDefault.MODE;
        const body = document.body;
        const html = document.documentElement;

        const bgColor =
          getComputedStyle(document.documentElement)
            .getPropertyValue(ThemeCSSVariable.BACKGROUND)
            .trim() || ThemeColor.LIGHT_BG_PRIMARY;
        const textColor =
          getComputedStyle(document.documentElement)
            .getPropertyValue(ThemeCSSVariable.FOREGROUND)
            .trim() || ThemeColor.LIGHT_TEXT_PRIMARY;

        if (themeMode === ThemeMode.DARK) {
          body.style.backgroundColor = ThemeColor.DARK_BG_SECONDARY;
          body.style.color = `rgba(255, 255, 255, ${ThemeOpacity.DARK_TEXT_PRIMARY})`;
          html.style.backgroundColor = ThemeColor.DARK_BG_SECONDARY;
        } else {
          body.style.backgroundColor = bgColor;
          body.style.color = textColor;
          html.style.backgroundColor = bgColor;
        }
      } catch {
        return;
      }
    }
  }, []);

  return null;
}

