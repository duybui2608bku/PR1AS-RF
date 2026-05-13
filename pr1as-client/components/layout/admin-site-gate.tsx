"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useMe } from "@/lib/hooks/use-auth"
import { isAdminUser } from "@/lib/auth/roles"
import { useAuthStore } from "@/lib/store/auth-store"

export function AdminSiteGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const meQuery = useMe()
  const hydrated = React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      if (useAuthStore.persist.hasHydrated()) return () => undefined
      return useAuthStore.persist.onFinishHydration(onStoreChange)
    }, []),
    () => useAuthStore.persist.hasHydrated(),
    () => true
  )

  const hasSession = hydrated && isAuthenticated
  const resolvedUser = meQuery.data?.data?.user ?? user
  const isAdmin = hasSession && isAdminUser(resolvedUser)
  const shouldHoldPublicShell =
    hasSession && !meQuery.isError && (!resolvedUser || isAdmin)

  React.useEffect(() => {
    if (isAdmin) {
      router.replace("/dashboard")
    }
  }, [isAdmin, router])

  if (!hydrated || shouldHoldPublicShell) {
    return null
  }

  return <>{children}</>
}
