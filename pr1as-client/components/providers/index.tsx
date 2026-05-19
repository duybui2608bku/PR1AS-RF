"use client"

import * as React from "react"
import { GoogleOAuthProvider } from "@react-oauth/google"

import { ThemeProvider } from "@/components/providers/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { TopProgressBar } from "@/components/providers/top-progress-bar"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
      <ThemeProvider>
        <TopProgressBar />
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
