"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GoogleOAuthProvider } from "@react-oauth/google"

import { NetworkStatusWatcher } from "@/components/providers/network-status-watcher"
import { QueryProvider } from "@/components/providers/query-provider"
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { TokenForegroundRefresh } from "@/components/providers/token-foreground-refresh"
import { TopProgressBar } from "@/components/providers/top-progress-bar"
import { BannedAccountModal } from "@/components/providers/banned-account-modal"
import { OnboardingRoleModal } from "@/components/providers/onboarding-role-modal"
import { LegalResponsibilityModal } from "@/components/providers/legal-responsibility-modal"
import { AttendanceReminderModal } from "@/components/providers/attendance-reminder-modal"
import { BrandingSync } from "@/components/providers/branding-sync"
import { AuthRequiredDialog } from "@/components/auth/auth-required-dialog"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { PrefLoadingOverlay } from "@/components/layout/pref-loading-overlay"
import { Toaster } from "@/components/ui/sonner"
import { clearSessionCookie } from "@/lib/auth/auth-cookie"
import { useAuthStore, useHasHydrated, type AuthUser } from "@/lib/store/auth-store"
import { useCurrencyStore } from "@/lib/store/currency-store"

/** GET /api/auth/session với retry — network blip lúc mở app trên mobile không
 *  được phép làm mất phiên (cookie hợp lệ nhưng Zustand trống → UI tưởng logged out).
 */
async function fetchSessionWithRetry(): Promise<{
  ok: boolean
  user?: AuthUser
  token?: string
}> {
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" })
      if (res.ok) {
        return (await res.json()) as { ok: boolean; user?: AuthUser; token?: string }
      }
    } catch {
      // Network blip — thử lại với backoff
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
  }
  return { ok: false }
}

/** Restores Zustand session from httpOnly cookie khi sessionStorage empty (e.g. tab mới).
 *  Gọi GET /api/auth/session — Next.js server đọc cookie và verify JWT server-side.
 *  Fixes bug: valid cookie → middleware redirect khỏi /login dù Zustand nói chưa login.
 */
function SessionRestoreProvider() {
  const hasHydrated = useHasHydrated()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setSessionLoaded = useAuthStore((s) => s._setSessionLoaded)
  // Chỉ check 1 lần lúc startup — không re-run sau logout
  const didCheckRef = React.useRef(false)

  React.useEffect(() => {
    if (!hasHydrated) return
    if (didCheckRef.current) return
    didCheckRef.current = true

    if (isAuthenticated) { setSessionLoaded(); return }

    let cancelled = false
    fetchSessionWithRetry()
      .then((data) => {
        if (!cancelled && data.ok && data.user && data.token) {
          setAuth({ user: data.user, token: data.token })
        }
      })
      .finally(() => { if (!cancelled) setSessionLoaded() })

    return () => { cancelled = true }
  }, [hasHydrated, isAuthenticated, setAuth, setSessionLoaded])

  return null
}

/** Applies the persisted currency preference (cookie/localStorage) after mount. */
function CurrencyHydrator() {
  const hydrate = useCurrencyStore((s) => s.hydrate)
  React.useEffect(() => {
    hydrate()
  }, [hydrate])
  return null
}

/** Syncs logout across browser tabs via BroadcastChannel. */
function AuthBroadcastListener() {
  const router = useRouter()
  const hasHydrated = useHasHydrated()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // After hydration, if sessionStorage has no auth state, clear any stale httpOnly
  // cookie left over from a previous browser session. The DELETE endpoint is smart:
  // it only clears the cookie when the JWT is already expired or invalid, so active
  // tabs that still hold a valid token are not affected.
  React.useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      fetch("/api/auth/session", { method: "DELETE" }).catch(() => {})
    }
  }, [hasHydrated, isAuthenticated])

  React.useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return

    const channel = new BroadcastChannel("auth_logout")

    channel.onmessage = (event: MessageEvent) => {
      if (event.data !== "logout") return
      // Read current state from the store (not a React snapshot) to avoid stale closure
      const { isAuthenticated, clearAuth } = useAuthStore.getState()
      if (!isAuthenticated) return
      clearAuth()
      void clearSessionCookie()
      router.replace("/login")
    }

    return () => {
      channel.close()
    }
  }, [router])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
    <ThemeProvider>
      <TopProgressBar />
      <QueryProvider>
        {children}
        {/* Đồng bộ favicon theo cài đặt admin trong phiên SPA */}
        <BrandingSync />
        <Toaster richColors position="top-right" />
        <AuthRequiredDialog />
        {/* Banned account modal — triggered by socket or HTTP 403 USER_BANNED */}
        <BannedAccountModal />
        {/* Onboarding modal — shown once on first login */}
        <OnboardingRoleModal />
        {/* Legal-responsibility notice — shown to users whose account is < 7 days old */}
        <LegalResponsibilityModal />
        {/* Restore session từ cookie khi sessionStorage empty */}
        <SessionRestoreProvider />
        {/* Daily worker attendance prompt; snoozes for one hour when dismissed. */}
        <AttendanceReminderModal />
        {/* Chủ động refresh token khi app quay lại foreground (chống bị đá khỏi protected routes sau khi background >15') */}
        <TokenForegroundRefresh />
        {/* Sync logout across tabs */}
        <AuthBroadcastListener />
        {/* Áp dụng tiền tệ đã chọn (cookie/localStorage) sau khi mount */}
        <CurrencyHydrator />
        {/* Global mobile bottom nav — hiển thị trên mọi trang, kể cả /chat */}
        <MobileBottomNav />
        {/* Overlay loading khi đổi ngôn ngữ / tiền tệ */}
        <PrefLoadingOverlay />
        {/* Theo dõi mạng — mất kết nối thì chuyển sang /offline, có lại thì quay về */}
        <NetworkStatusWatcher />
        {/* Đăng ký service worker (production) để bật PWA */}
        <ServiceWorkerRegister />
      </QueryProvider>
    </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
