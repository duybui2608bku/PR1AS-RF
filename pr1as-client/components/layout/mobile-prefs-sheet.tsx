"use client"

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import * as React from "react"

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet"
import { CURRENCY_META, SUPPORTED_CURRENCIES } from "@/lib/currency"
import { useCurrency } from "@/lib/hooks/use-currency"
import {
  LOCALE_COOKIE_NAME,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/locale"
import { cn } from "@/lib/utils"

/**
 * Theme + language + currency selectors. Shared by the desktop popover and the
 * mobile bottom sheet behind the header's preferences icon-bar button.
 */
export function PrefsPanel() {
  const t = useTranslations("Nav")
  const currentLocale = useLocale() as SupportedLocale
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency } = useCurrency()
  const router = useRouter()

  const themeOptions: { value: string; label: string; icon: LucideIcon }[] = [
    { value: "light", label: t("themeLight"), icon: Sun },
    { value: "dark", label: t("themeDark"), icon: Moon },
    { value: "system", label: t("themeSystem"), icon: Monitor },
  ]

  const handleSelectLocale = (locale: SupportedLocale) => {
    if (locale === currentLocale) return
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // localStorage may be unavailable (e.g. private browsing)
    }
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Appearance / theme */}
      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {t("appearance")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((option) => {
            const isActive = theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-sm transition-colors",
                  isActive
                    ? "border-foreground bg-accent font-medium"
                    : "border-border hover:bg-accent",
                )}
              >
                <option.icon className="size-5" />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Language */}
      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {t("language")}
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          {SUPPORTED_LOCALES.map((locale, i) => {
            const isActive = locale === currentLocale
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleSelectLocale(locale)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-accent",
                  i > 0 && "border-t border-border",
                  isActive && "bg-accent font-medium",
                )}
              >
                <span>{LOCALE_LABELS[locale]}</span>
                {isActive && <Check className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      </section>

      {/* Currency */}
      <section>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {t("displayCurrency")}
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          {SUPPORTED_CURRENCIES.map((code, i) => {
            const isActive = code === currency
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-accent",
                  i > 0 && "border-t border-border",
                  isActive && "bg-accent font-medium",
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{CURRENCY_META[code].flag}</span>
                  {CURRENCY_META[code].label}
                </span>
                {isActive && <Check className="size-4 shrink-0" />}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

interface MobilePrefsSheetProps {
  open: boolean
  onClose: () => void
}

/**
 * Mobile-only preferences sheet that consolidates the theme, language and
 * currency switchers behind a single icon-bar button. Opens a bottom sheet.
 */
export function MobilePrefsSheet({ open, onClose }: MobilePrefsSheetProps) {
  const t = useTranslations("Nav")

  return (
    <BottomSheet open={open} onOpenChange={(v) => !v && onClose()}>
      <BottomSheetContent className="pb-safe">
        <div className="border-b px-4 py-3">
          <BottomSheetTitle>{t("preferences")}</BottomSheetTitle>
        </div>
        <div className="px-4 py-4">
          <PrefsPanel />
        </div>
      </BottomSheetContent>
    </BottomSheet>
  )
}
