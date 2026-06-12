"use client"

import * as React from "react"
import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LOCALE_COOKIE_NAME,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/locale"

export function LocaleSwitcher() {
  const router = useRouter()
  const currentLocale = useLocale() as SupportedLocale

  // On mount, sync localStorage → cookie if they differ (e.g. first visit after
  // the user previously set a preference but the cookie expired).
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null
      if (
        stored &&
        (SUPPORTED_LOCALES as readonly string[]).includes(stored) &&
        stored !== currentLocale
      ) {
        document.cookie = `${LOCALE_COOKIE_NAME}=${stored}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        router.refresh()
      }
    } catch {
      // localStorage may be unavailable (e.g. private browsing in some browsers)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (locale: SupportedLocale) => {
    if (locale === currentLocale) return
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // ignore storage errors
    }
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={LOCALE_LABELS[currentLocale]}>
          <Globe className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSelect(locale)}
            className={locale === currentLocale ? "font-semibold bg-accent" : ""}
          >
            {LOCALE_LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
