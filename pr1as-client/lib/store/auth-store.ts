import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import {
  setActiveRoleCookie,
  clearActiveRoleCookie,
} from "@/lib/auth/auth-cookie"
import { getActiveRole } from "@/lib/auth/roles"

const LEGACY_AUTH_TOKEN_KEY = "auth_token"

const removeLegacyAuthToken = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
  }
}

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
  meta_data?: {
    pricing_plan_code?: string | null
    pricing_started_at?: string | null
    pricing_expires_at?: string | null
    reputation_score?: number
  }
}

type AuthState = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (payload: { user: AuthUser; token: string }) => void
  /** Updates user info without touching the token (e.g. after role switch or profile update). */
  setUser: (user: AuthUser) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: ({ user, token }) => {
        removeLegacyAuthToken()
        setActiveRoleCookie(getActiveRole(user))
        set({ user, token, isAuthenticated: true })
      },
      setUser: (user) => {
        setActiveRoleCookie(getActiveRole(user))
        set({ user })
      },
      clearAuth: () => {
        removeLegacyAuthToken()
        clearActiveRoleCookie()
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
