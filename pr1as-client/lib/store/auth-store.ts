import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export type ClientProfile = {
  company_name?: string | null
  website?: string | null
  total_spent?: number
}

export type AuthUser = {
  id: string
  email: string
  name?: string
  full_name?: string | null
  phone?: string | null
  role?: string
  status?: string
  roles?: string[]
  last_active_role?: string
  worker_profile?: unknown | null
  client_profile?: ClientProfile | null
  avatar?: string | null
  verify_email?: boolean
  pricing_plan_code?: string
  pricing_started_at?: string | null
  pricing_expires_at?: string | null
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
