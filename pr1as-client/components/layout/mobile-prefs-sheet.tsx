"use client"

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import * as React from "react"

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet"
import { CURRENCY_META, SUPPORTED_CURRENCIES } from "@/lib/currency"
import { usePrefSwitch } from "@/lib/hooks/use-pref-switch"
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/locale"
import { cn } from "@/lib/utils"

/**
 * Theme + language + currency selectors. Shared by the desktop popover and the
 * mobile bottom sheet behind the header's preferences icon-bar button.
 */
export function PrefsPanel() {
  const t = useTranslations("Nav")
  const tCurrency = useTranslations("Currency")
  const { theme, setTheme } = useTheme()
  const { currentLocale, currency, changeLocale, changeCurrency } = usePrefSwitch()

  const themeOptions: { value: string; label: string; icon: LucideIcon }[] = [
    { value: "light", label: t("themeLight"), icon: Sun },
    { value: "dark", label: t("themeDark"), icon: Moon },
    { value: "system", label: t("themeSystem"), icon: Monitor },
  ]

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
                onClick={() => changeLocale(locale)}
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
                onClick={() => changeCurrency(code)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-accent",
                  i > 0 && "border-t border-border",
                  isActive && "bg-accent font-medium",
                )}
              >
                <span className="flex items-center gap-2">
                  <span>{CURRENCY_META[code].flag}</span>
                  {tCurrency(code)}
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
