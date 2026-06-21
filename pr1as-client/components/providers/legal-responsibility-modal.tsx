"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Scale, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore, useHasHydrated } from "@/lib/store/auth-store"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const DISMISS_KEY_PREFIX = "legal-responsibility-dismissed-until:"

/** Home/landing route — the notice re-appears on every visit here. */
const TRIGGER_PATH = "/about"

/** True when the account was created within the last 7 days. */
function isWithinFirstWeek(createdAt?: string): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created < SEVEN_DAYS_MS
}

/** Reads the per-user "hide for 6 hours" timestamp from localStorage. */
function isDismissedNow(userId: string): boolean {
  if (typeof window === "undefined") return false
  const raw = window.localStorage.getItem(`${DISMISS_KEY_PREFIX}${userId}`)
  if (!raw) return false
  const until = Number(raw)
  return Number.isFinite(until) && Date.now() < until
}

/**
 * First-week legal-responsibility notice. Re-appears on every visit to the home
 * page ({@link TRIGGER_PATH}) for logged-in users whose account is younger than
 * 7 days. Simply closing it (X / "got it") lets it show again on the next visit;
 * only the "hide for 6 hours" action suppresses it, persisted per-user in
 * localStorage. See memorybank/legal-responsibility.md.
 */
export function LegalResponsibilityModal() {
  const t = useTranslations("LegalResponsibilityModal")
  const pathname = usePathname()
  const hasHydrated = useHasHydrated()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  const [open, setOpen] = React.useState(false)

  const userId = user?.id
  const createdAt = user?.created_at

  React.useEffect(() => {
    if (
      !hasHydrated ||
      !isAuthenticated ||
      !userId ||
      pathname !== TRIGGER_PATH ||
      !isWithinFirstWeek(createdAt) ||
      isDismissedNow(userId)
    ) {
      setOpen(false)
      return
    }
    setOpen(true)
  }, [hasHydrated, isAuthenticated, userId, createdAt, pathname])

  const handleDismissForSixHours = () => {
    if (userId && typeof window !== "undefined") {
      window.localStorage.setItem(
        `${DISMISS_KEY_PREFIX}${userId}`,
        String(Date.now() + SIX_HOURS_MS)
      )
    }
    setOpen(false)
  }

  const handleAcknowledge = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleAcknowledge()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="size-5" />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <Link
          href="/legal-responsibility"
          onClick={handleAcknowledge}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ShieldCheck className="size-4" />
          {t("viewFull")}
        </Link>

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleDismissForSixHours}
          >
            {t("dismiss6h")}
          </Button>
          <Button type="button" onClick={handleAcknowledge}>
            {t("acknowledge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
