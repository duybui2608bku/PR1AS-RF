import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type AuthUser = {
  id: string
  email: string
  name?: string
  role?: string
}

type AuthState = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (payload: { user: AuthUser; token: string }) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: ({ user, token }) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("auth_token", token)
        }
        set({ user, token, isAuthenticated: true })
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("auth_token")
        }
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
