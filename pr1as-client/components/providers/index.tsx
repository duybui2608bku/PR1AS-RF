"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { QueryProvider } from "@/components/providers/query-provider"
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { TopProgressBar } from "@/components/providers/top-progress-bar"
import { BannedAccountModal } from "@/components/providers/banned-account-modal"
import { AuthRequiredDialog } from "@/components/auth/auth-required-dialog"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { Toaster } from "@/components/ui/sonner"
import { clearSessionCookie } from "@/lib/auth/auth-cookie"
import { useAuthStore, useHasHydrated, type AuthUser } from "@/lib/store/auth-store"

/** Restores Zustand session from httpOnly cookie khi sessionStorage empty (e.g. tab mới).
 *  Gọi GET /api/auth/session — Next.js server đọc cookie và verify JWT server-side.
 *  Fixes bug: valid cookie → middleware redirect khỏi /login dù Zustand nói chưa login.
 */
function SessionRestoreProvider() {
  const hasHydrated = useHasHydrated()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setSessionLoaded = useAuthStore((s) => s._setSessionLoaded)

  React.useEffect(() => {
    if (!hasHydrated) return
    if (isAuthenticated) { setSessionLoaded(); return }

    let cancelled = false
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: { ok: boolean; user?: AuthUser; token?: string }) => {
        if (!cancelled && data.ok && data.user && data.token) {
          setAuth({ user: data.user, token: data.token })
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSessionLoaded() })

    return () => { cancelled = true }
  }, [hasHydrated, isAuthenticated, setAuth, setSessionLoaded])

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
  // TODO: Khi enable Google login:
  // 1. import { GoogleOAuthProvider } from "@react-oauth/google"
  // 2. Bọc ThemeProvider bằng <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
  return (
    <ThemeProvider>
      <TopProgressBar />
      <QueryProvider>
        {children}
        <Toaster richColors position="top-right" />
        <AuthRequiredDialog />
        {/* Banned account modal — triggered by socket or HTTP 403 USER_BANNED */}
        <BannedAccountModal />
        {/* Restore session từ cookie khi sessionStorage empty */}
        <SessionRestoreProvider />
        {/* Sync logout across tabs */}
        <AuthBroadcastListener />
        {/* Global mobile bottom nav — hiển thị trên mọi trang, kể cả /chat */}
        <MobileBottomNav />
        {/* Đăng ký service worker (production) để bật PWA */}
        <ServiceWorkerRegister />
      </QueryProvider>
    </ThemeProvider>
  )
}
