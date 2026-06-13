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
    onboarding_done?: boolean
    locale?: string
  }
}

type AuthState = {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  /** Set while a logout-on-401 is in flight to avoid multiple cascading logouts. */
  isLoggingOut: boolean
  /**
   * True after Zustand has rehydrated from sessionStorage.
   * Use this to guard effects/redirects that must not fire before auth state is known.
   * Intentionally NOT persisted — resets to false on every page load.
   */
  _hasHydrated: boolean
  _isSessionLoaded: boolean
  _setSessionLoaded: () => void
  setAuth: (payload: { user: AuthUser; token: string; refreshToken?: string | null }) => void
  /** Updates user info without touching the token (e.g. after role switch or profile update). */
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setLoggingOut: (value: boolean) => void
  _setHasHydrated: () => void
}

// Auth state is persisted to sessionStorage (cleared when the tab closes)
// instead of localStorage. This narrows the XSS exposure window and prevents
// other tabs / future browser sessions from inheriting a stolen access token.
// Cross-tab login persistence is intentionally not supported here — users
// who reopen the browser are expected to log in again.
// BroadcastChannel to sync logout across tabs. Each tab posts when it logs out;
// other tabs listen and respond via the AuthBroadcastListener component.
// Only broadcast if the user was authenticated to break the potential broadcast loop.
const logoutChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("auth_logout")
    : null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoggingOut: false,
      _hasHydrated: false,
      _isSessionLoaded: false,
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
        // Only broadcast if authenticated — prevents cascade loop between tabs
        if (get().isAuthenticated) {
          logoutChannel?.postMessage("logout")
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
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
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        // _hasHydrated intentionally excluded — must reset to false on every page load
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated()
      },
    }
  )
)

/** True once Zustand has finished reading from sessionStorage. */
export const useHasHydrated = () => useAuthStore((s) => s._hasHydrated)

/** True once session restore check is complete (cookie checked via /api/auth/session). */
export const useIsSessionLoaded = () => useAuthStore((s) => s._isSessionLoaded)
