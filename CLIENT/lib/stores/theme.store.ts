import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ThemeMode,
  ThemeStorageKey,
  ThemeDefault,
} from "../constants/theme.constants";

export type { ThemeMode };

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => {
      return {
        theme: ThemeDefault.MODE,

        setTheme: (theme: ThemeMode) => {
          set({ theme });
        },

        toggleTheme: () => {
          const currentTheme = get().theme;
          set({
            theme:
              currentTheme === ThemeMode.LIGHT
                ? ThemeMode.DARK
                : ThemeMode.LIGHT,
          });
        },
      };
    },
    {
      name: ThemeStorageKey.THEME,
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

