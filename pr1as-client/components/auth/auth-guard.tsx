"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"

type AuthGuardProps = {
  children: React.ReactNode
  redirectTo?: string
}

export function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return () => {
      unsub()
    }
  }, [])

  React.useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(redirectTo)
    }
  }, [hydrated, isAuthenticated, router, redirectTo])

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
