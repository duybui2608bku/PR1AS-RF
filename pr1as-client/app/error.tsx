"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations("System")

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[route-error]", error)
    }
  }, [error])

  return (
    <div className="container mx-auto flex min-h-[60svh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-destructive text-sm font-medium">{t("errorTitle")}</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("errorMessage")}
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        {t("errorRetry")}
      </p>
      {error.digest ? (
        <p className="text-muted-foreground/80 font-mono text-xs">
          {t("errorCode", { code: error.digest })}
        </p>
      ) : null}
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>{t("tryAgain")}</Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>
          {t("backToHome")}
        </Button>
      </div>
    </div>
  )
}
