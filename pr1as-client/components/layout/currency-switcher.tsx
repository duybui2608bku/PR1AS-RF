"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, Coins } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePrefSwitch } from "@/lib/hooks/use-pref-switch"
import { CURRENCY_META, SUPPORTED_CURRENCIES } from "@/lib/currency"
import { cn } from "@/lib/utils"

/**
 * Standalone icon dropdown for the header. Used for guests (logged-in users get
 * the picker inside the avatar overlay instead).
 */
export function CurrencySwitcher() {
  const { currency, changeCurrency } = usePrefSwitch()
  const tCurrency = useTranslations("Currency")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={tCurrency(currency)}>
          <Coins className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_CURRENCIES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => changeCurrency(code)}
            className={code === currency ? "font-semibold bg-accent" : ""}
          >
            <span className="mr-2">{CURRENCY_META[code].flag}</span>
            {tCurrency(code)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Inline currency picker for embedding inside a menu/overlay (avatar dropdown,
 * mobile sheet). Rendered as a self-contained dropdown — the option list stays
 * a DOM child of the panel (no portal), so the parent overlay's click-outside
 * handler doesn't close mid-selection.
 */
export function CurrencyOptions({
  label,
  dropUp = false,
}: {
  label: string
  /** Open the option list upward — use when placed near the bottom (mobile sheet). */
  dropUp?: boolean
}) {
  const { currency, changeCurrency } = usePrefSwitch()
  const tCurrency = useTranslations("Currency")
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const meta = CURRENCY_META[currency]

  React.useEffect(() => {
    if (!open) return
    const handle = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", handle)
    return () => window.removeEventListener("mousedown", handle)
  }, [open])

  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <span>{meta.flag}</span>
            {tCurrency(currency)}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform",
              (open ? !dropUp : dropUp) && "rotate-180"
            )}
          />
        </button>
        {open && (
          <div
            className={cn(
              "absolute left-0 right-0 z-50 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md",
              dropUp ? "bottom-full mb-1" : "top-full mt-1"
            )}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  changeCurrency(code)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-1.5 text-sm transition-colors hover:bg-accent",
                  code === currency && "bg-accent font-medium"
                )}
              >
                <span>{CURRENCY_META[code].flag}</span>
                {tCurrency(code)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
