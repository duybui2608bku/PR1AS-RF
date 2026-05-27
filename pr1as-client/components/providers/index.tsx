"use client"

import { QueryProvider } from "@/components/providers/query-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { TopProgressBar } from "@/components/providers/top-progress-bar"
import { AuthRequiredDialog } from "@/components/auth/auth-required-dialog"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { Toaster } from "@/components/ui/sonner"
import * as React from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Google OAuthProvider is temporarily disabled to avoid missing client_id errors. */}
      <TopProgressBar />
      <QueryProvider>
        {children}
        <Toaster richColors position="top-right" />
        <AuthRequiredDialog />
        {/* Global mobile bottom nav — hiển thị trên mọi trang, kể cả /chat */}
        <MobileBottomNav />
      </QueryProvider>
    </ThemeProvider>
  )
}
