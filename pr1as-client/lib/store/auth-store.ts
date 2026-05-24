import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

import {
  setActiveRoleCookie,
  clearActiveRoleCookie,
} from "@/lib/auth/auth-cookie"
import { getActiveRole } from "@/lib/auth/roles"

const LEGACY_AUTH_TOKEN_KEY = "auth_token"
const LEGACY_AUTH_STORAGE_KEY = "auth-storage"

const removeLegacyAuthToken = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY)
    // Migrate users with the previous localStorage-persisted store off it —
    // localStorage exposure outlives the tab and is XSS-prone.
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
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
  refreshToken: string | null
  isAuthenticated: boolean
  /** Set while a logout-on-401 is in flight to avoid multiple cascading logouts. */
  isLoggingOut: boolean
  setAuth: (payload: { user: AuthUser; token: string; refreshToken?: string | null }) => void
  /** Updates user info without touching the token (e.g. after role switch or profile update). */
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setLoggingOut: (value: boolean) => void
}

// Auth state is persisted to sessionStorage (cleared when the tab closes)
// instead of localStorage. This narrows the XSS exposure window and prevents
// other tabs / future browser sessions from inheriting a stolen access token.
// Cross-tab login persistence is intentionally not supported here — users
// who reopen the browser are expected to log in again.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoggingOut: false,
      setAuth: ({ user, token, refreshToken = null }) => {
        removeLegacyAuthToken()
        setActiveRoleCookie(getActiveRole(user))
        set({ user, token, refreshToken, isAuthenticated: true, isLoggingOut: false })
      },
      setUser: (user) => {
        setActiveRoleCookie(getActiveRole(user))
        set({ user })
      },
      clearAuth: () => {
        removeLegacyAuthToken()
        clearActiveRoleCookie()
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoggingOut: false,
        })
      },
      setLoggingOut: (value) => set({ isLoggingOut: value }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.sessionStorage : (undefined as unknown as Storage)
      ),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
