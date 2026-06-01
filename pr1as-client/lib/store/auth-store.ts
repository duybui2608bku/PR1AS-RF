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
  isAuthenticated: boolean
  /** Set while a logout-on-401 is in flight to avoid multiple cascading logouts. */
  isLoggingOut: boolean
  /**
   * True after Zustand has rehydrated from sessionStorage.
   * Intentionally NOT persisted — resets to false on every page load.
   */
  _hasHydrated: boolean
  /**
   * True after SessionRestoreProvider has finished its async session check.
   * Until true, auth-dependent UI (login button, user menu) shows a skeleton
   * to prevent the race condition where user clicks "Login" but gets proxy-redirected
   * because a valid httpOnly cookie already exists.
   * NOT persisted — resets to false on every page load.
   */
  _isSessionLoaded: boolean
  setAuth: (payload: { user: AuthUser }) => void
  /** Updates user info without touching auth state (e.g. after role switch or profile update). */
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setLoggingOut: (value: boolean) => void
  _setHasHydrated: () => void
  _setSessionLoaded: () => void
}

// BroadcastChannel để sync logout across tabs
const logoutChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("auth_logout")
    : null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoggingOut: false,
      _hasHydrated: false,
      _isSessionLoaded: false,
      setAuth: ({ user }) => {
        removeLegacyAuthToken()
        setActiveRoleCookie(getActiveRole(user))
        set({ user, isAuthenticated: true, isLoggingOut: false })
      },
      setUser: (user) => {
        setActiveRoleCookie(getActiveRole(user))
        set({ user })
      },
      clearAuth: () => {
        removeLegacyAuthToken()
        clearActiveRoleCookie()
        if (get().isAuthenticated) {
          logoutChannel?.postMessage("logout")
        }
        set({
          user: null,
          isAuthenticated: false,
          isLoggingOut: false,
        })
      },
      setLoggingOut: (value) => set({ isLoggingOut: value }),
      _setHasHydrated: () => set({ _hasHydrated: true }),
      _setSessionLoaded: () => set({ _isSessionLoaded: true }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.sessionStorage : (undefined as unknown as Storage)
      ),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // _hasHydrated và _isSessionLoaded intentionally excluded — reset on every page load
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated()
      },
    }
  )
)

/** True once Zustand has finished reading from sessionStorage. */
export const useHasHydrated = () => useAuthStore((s) => s._hasHydrated)

/** True once SessionRestoreProvider has finished its async session check. */
export const useIsSessionLoaded = () => useAuthStore((s) => s._isSessionLoaded)
