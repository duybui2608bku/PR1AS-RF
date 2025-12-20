import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

/**
 * Theme State Interface
 */
interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

/**
 * Theme Store với Zustand
 * Quản lý theme sáng/tối
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => {
      return {
        // Initial state - mặc định là light
        theme: "light" as ThemeMode,

        // Set theme
        setTheme: (theme: ThemeMode) => {
          set({ theme });
        },

        // Toggle theme
        toggleTheme: () => {
          const currentTheme = get().theme;
          set({ theme: currentTheme === "light" ? "dark" : "light" });
        },
      };
    },
    {
      name: "theme-storage", // Tên key trong localStorage
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

