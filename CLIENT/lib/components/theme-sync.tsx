"use client";

import { useEffect } from "react";
import { useThemeStore } from "../stores/theme.store";

/**
 * Component để đồng bộ theme với body/html background
 * Cần thiết vì Ant Design dark mode chỉ áp dụng cho components, không tự động thay đổi body background
 */
export function ThemeSync() {
  const { theme } = useThemeStore();

  useEffect(() => {
    // Áp dụng theme cho body và html
    const applyTheme = (themeMode: "light" | "dark") => {
      const body = document.body;
      const html = document.documentElement;

      if (themeMode === "dark") {
        body.style.backgroundColor = "#141414";
        body.style.color = "rgba(255, 255, 255, 0.85)";
        html.style.backgroundColor = "#141414";
        html.setAttribute("data-theme", "dark");
      } else {
        body.style.backgroundColor = "#ffffff";
        body.style.color = "rgba(0, 0, 0, 0.88)";
        html.style.backgroundColor = "#ffffff";
        html.setAttribute("data-theme", "light");
      }
    };

    // Áp dụng theme ngay lập tức
    applyTheme(theme);

    // Cleanup function để reset khi unmount
    return () => {
      const body = document.body;
      const html = document.documentElement;
      body.style.backgroundColor = "";
      body.style.color = "";
      html.style.backgroundColor = "";
      html.removeAttribute("data-theme");
    };
  }, [theme]);

  // Áp dụng theme ngay khi component mount (trước khi rehydrate)
  useEffect(() => {
    // Kiểm tra localStorage trực tiếp để tránh flash of wrong theme
    const storedTheme = localStorage.getItem("theme-storage");
    if (storedTheme) {
      try {
        const parsed = JSON.parse(storedTheme);
        const themeMode = parsed?.state?.theme || "light";
        const body = document.body;
        const html = document.documentElement;

        if (themeMode === "dark") {
          body.style.backgroundColor = "#141414";
          body.style.color = "rgba(255, 255, 255, 0.85)";
          html.style.backgroundColor = "#141414";
        } else {
          body.style.backgroundColor = "#ffffff";
          body.style.color = "rgba(0, 0, 0, 0.88)";
          html.style.backgroundColor = "#ffffff";
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  return null;
}

