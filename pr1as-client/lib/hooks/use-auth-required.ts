"use client"

import { useCallback } from "react"
import { usePathname } from "next/navigation"

import { useAuthStore } from "@/lib/store/auth-store"
import { useAuthDialogStore } from "@/lib/store/auth-dialog-store"

export function useAuthRequired() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const openAuthDialog = useAuthDialogStore((state) => state.openAuthDialog)
  const pathname = usePathname()

  const requireAuth = useCallback(
    (callback?: () => void) => {
      if (isAuthenticated) {
        callback?.()
      } else {
        openAuthDialog(pathname)
      }
    },
    [isAuthenticated, openAuthDialog, pathname],
  )

  return { requireAuth, isAuthenticated }
}
