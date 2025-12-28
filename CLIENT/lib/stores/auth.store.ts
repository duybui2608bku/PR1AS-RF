import { create } from "zustand";
import { persist } from "zustand/middleware";

const TOKEN_STORAGE_KEY = "token";
const REFRESH_TOKEN_STORAGE_KEY = "refreshToken";
const AUTH_STORAGE_KEY = "auth-storage";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
  roles?: string[];
  last_active_role?: "client" | "worker" | "admin";
  worker_profile?: {
    date_of_birth?: string;
    gender?: string;
    height_cm?: number;
    weight_kg?: number;
    star_sign?: string;
    lifestyle?: string;
    hobbies: string[];
    quote?: string;
    introduction?: string;
    gallery_urls: string[];
  } | null;
  [key: string]: unknown;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => {
        if (typeof window !== "undefined") {
          window.addEventListener("auth:logout", () => {
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
            });
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          });

          window.addEventListener("auth:token-refreshed", ((event: CustomEvent<{ token: string; refreshToken: string }>) => {
            const { token, refreshToken } = event.detail;
            set({ token, refreshToken });
          }) as EventListener);
        }

      return {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,

        setUser: (user) =>
          set({
            user,
            isAuthenticated: !!user,
          }),

        setToken: (token) => {
          set({ token });
          if (typeof window !== "undefined") {
            if (token) {
              localStorage.setItem(TOKEN_STORAGE_KEY, token);
            } else {
              localStorage.removeItem(TOKEN_STORAGE_KEY);
            }
          }
        },

        setRefreshToken: (refreshToken) => {
          set({ refreshToken });
          if (typeof window !== "undefined") {
            if (refreshToken) {
              localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
            } else {
              localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
            }
          }
        },

        login: (user, token, refreshToken) => {
          set({
            user,
            token,
            refreshToken,
            isAuthenticated: true,
          });
          if (typeof window !== "undefined") {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
          }
        },

        logout: () => {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          if (typeof window !== "undefined") {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          }
        },

        setLoading: (isLoading) => set({ isLoading }),
      };
    },
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
