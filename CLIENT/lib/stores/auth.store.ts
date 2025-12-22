import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * User Interface
 */
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

/**
 * Auth State Interface
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Auth Actions Interface
 */
interface AuthActions {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

/**
 * Auth Store với Zustand
 * Sử dụng persist middleware để lưu vào localStorage
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => {
      // Lắng nghe custom event từ axios interceptor
      if (typeof window !== "undefined") {
        window.addEventListener("auth:logout", () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem("token");
        });
      }

      return {
        // Initial state
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,

        // Actions
        setUser: (user) =>
          set({
            user,
            isAuthenticated: !!user,
          }),

        setToken: (token) => {
          set({ token });
          // Lưu token vào localStorage để axios interceptor sử dụng
          if (typeof window !== "undefined") {
            if (token) {
              localStorage.setItem("token", token);
            } else {
              localStorage.removeItem("token");
            }
          }
        },

        login: (user, token) => {
          set({
            user,
            token,
            isAuthenticated: true,
          });
          // Lưu token vào localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem("token", token);
          }
        },

        logout: () => {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          // Xóa token khỏi localStorage
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
          }
        },

        setLoading: (isLoading) => set({ isLoading }),
      };
    },
    {
      name: "auth-storage", // Tên key trong localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
