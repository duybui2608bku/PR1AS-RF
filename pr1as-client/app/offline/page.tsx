"use client"

import { RefreshCw, WifiOff } from "lucide-react"
import { useTranslations } from "next-intl"
import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

const RETURN_KEY = "pr1as:return-path"

export default function OfflinePage() {
  const router = useRouter()
  const t = useTranslations("System.offline")
  const [checking, setChecking] = React.useState(false)

  const goBack = React.useCallback(() => {
    let back = "/"
    try {
      back = sessionStorage.getItem(RETURN_KEY) || "/"
      sessionStorage.removeItem(RETURN_KEY)
    } catch {
    }
    router.replace(back)
  }, [router])

  const retry = React.useCallback(async () => {
    setChecking(true)
    let online = typeof navigator === "undefined" ? true : navigator.onLine
    if (online) {
      try {
        await fetch(`/icon.svg?_=${Date.now()}`, { method: "HEAD", cache: "no-store" })
      } catch {
        online = false
      }
    }
    setChecking(false)
    if (online) goBack()
  }, [goBack])

  React.useEffect(() => {
    window.addEventListener("online", goBack)
    return () => window.removeEventListener("online", goBack)
  }, [goBack])

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="bg-muted text-muted-foreground flex size-20 items-center justify-center rounded-full sm:size-24">
        <WifiOff className="size-9 sm:size-11" aria-hidden />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm sm:text-base">
          {t("description")}
        </p>
      </div>

      <Button onClick={retry} disabled={checking} size="lg" className="w-full max-w-xs">
        <RefreshCw className={checking ? "animate-spin" : undefined} aria-hidden />
        {checking ? t("checking") : t("retry")}
      </Button>
    </div>
  )
}
