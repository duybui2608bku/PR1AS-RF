"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { usePrefLoadingStore } from "@/lib/store/pref-loading-store"

/** Safety net so a stalled locale refresh can never leave the overlay stuck. */
const MAX_OVERLAY_MS = 8000

/**
 * Full-screen loading overlay shown while the display language or currency is
 * being applied. Mounted once in the providers tree; driven by
 * `usePrefLoadingStore`.
 *
 * For locale changes the overlay clears itself when `useLocale()` reports the
 * new value — i.e. once `router.refresh()` finishes re-rendering the tree with
 * the new language. Currency changes clear via a timer in `usePrefSwitch`.
 */
export function PrefLoadingOverlay() {
  const t = useTranslations("Nav")
  const kind = usePrefLoadingStore((s) => s.kind)
  const stop = usePrefLoadingStore((s) => s.stop)
  const locale = useLocale()

  // Clear the locale overlay once the server re-render swaps the active locale.
  const isFirstRun = React.useRef(true)
  React.useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (usePrefLoadingStore.getState().kind === "locale") stop()
    // Only react to an actual locale change, not to `kind`/`stop` identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  // Never leave the overlay stuck (e.g. refresh fails / network stalls).
  React.useEffect(() => {
    if (!kind) return
    const timeout = window.setTimeout(stop, MAX_OVERLAY_MS)
    return () => window.clearTimeout(timeout)
  }, [kind, stop])

  if (!kind) return null

  const message =
    kind === "currency" ? t("switchingCurrency") : t("switchingLanguage")

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm"
    >
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )
}
