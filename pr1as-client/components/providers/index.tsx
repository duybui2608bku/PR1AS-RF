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
import { api } from "@/lib/axios"
import { useAuthStore, useHasHydrated } from "@/lib/store/auth-store"
import type { AuthUser } from "@/lib/store/auth-store"


/**
 * Chạy một lần sau khi hydrate: nếu chưa authenticated nhưng có cookie hợp lệ
 * từ backend, tự động restore session (cho phép stay-logged-in sau browser restart).
 * Flow: /auth/me → nếu fail, thử refresh token → thử /auth/me lần nữa → nếu vẫn fail, clearAuth.
 */
function SessionRestoreProvider() {
  const hasHydrated = useHasHydrated()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const setSessionLoaded = useAuthStore((s) => s._setSessionLoaded)

  React.useEffect(() => {
    if (!hasHydrated) return

    // Đã authenticated từ sessionStorage — không cần check network
    if (isAuthenticated) {
      setSessionLoaded()
      return
    }

    let cancelled = false

    const restoreSession = async () => {
      try {
        const res = await api.get<{ success: boolean; data?: { user: AuthUser } }>("/auth/me")
        if (!cancelled && res.data.success && res.data.data?.user) {
          setAuth({ user: res.data.data.user })
        }
      } catch {
        // /auth/me thất bại — token có thể hết hạn, thử refresh
        try {
          await api.post("/auth/refresh-token", {})
          const res2 = await api.get<{ success: boolean; data?: { user: AuthUser } }>("/auth/me")
          if (!cancelled && res2.data.success && res2.data.data?.user) {
            setAuth({ user: res2.data.data.user })
            return
          }
        } catch {
          // Cả token lẫn refreshToken đều không hợp lệ — user cần login
        }
        if (!cancelled) clearAuth()
      } finally {
        if (!cancelled) setSessionLoaded()
      }
    }

    restoreSession()
    return () => { cancelled = true }
  }, [hasHydrated, isAuthenticated, setAuth, clearAuth, setSessionLoaded])

  return null
}

/** Syncs logout across browser tabs via BroadcastChannel. */
function AuthBroadcastListener() {
  const router = useRouter()

  React.useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return

    const channel = new BroadcastChannel("auth_logout")

    channel.onmessage = (event: MessageEvent) => {
      if (event.data !== "logout") return
      const { isAuthenticated, clearAuth } = useAuthStore.getState()
      if (!isAuthenticated) return
      // Backend đã xóa cookie khi tab gốc gọi /auth/logout
      clearAuth()
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
    <ThemeProvider>
      <TopProgressBar />
      <QueryProvider>
        {children}
        <Toaster richColors position="top-right" />
        <AuthRequiredDialog />
        <BannedAccountModal />
        <AuthBroadcastListener />
        <SessionRestoreProvider />
        <MobileBottomNav />
        <ServiceWorkerRegister />
      </QueryProvider>
    </ThemeProvider>
  )
}
