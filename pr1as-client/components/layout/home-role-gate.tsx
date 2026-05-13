"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { isWorkerRoleActive } from "@/lib/auth/roles"
import { useMe } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { getRoleDefaultRoute } from "@/lib/navigation/role-routes"

export function HomeRoleGate({ children }: { children: React.ReactNode }) {
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
  const isWorker = hasSession && isWorkerRoleActive(resolvedUser)
  const shouldHoldHome =
    hasSession && !meQuery.isError && (!resolvedUser || isWorker)

  React.useEffect(() => {
    if (isWorker) {
      router.replace(getRoleDefaultRoute("worker"))
    }
  }, [isWorker, router])

  if (!hydrated || isWorker || shouldHoldHome) {
    return null
  }

  return <>{children}</>
}
