"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Crown } from "lucide-react"
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
import { useUpgradePlanStore, type UpgradePlanReason } from "@/lib/store/upgrade-plan-store"
import { PLAN_RESTRICTED_CODE_REASON } from "@/lib/utils/plan-restriction"

const REASON_DESC_KEY: Record<UpgradePlanReason, string> = {
  messaging: "descMessaging",
  post: "descPost",
  boost: "descBoost",
  generic: "descGeneric",
}

export function UpgradePlanDialog() {
  const { open, reason, closeUpgradeDialog, openUpgradeDialog } = useUpgradePlanStore()
  const router = useRouter()
  const t = useTranslations("PlanUpgrade")

  // Defense-in-depth: a plan-restricted 403 that slipped past a proactive
  // check (stale poll, multi-tab) still surfaces this same dialog.
  useEffect(() => {
    const handler = (event: Event) => {
      const code = (event as CustomEvent<{ code?: string }>).detail?.code
      openUpgradeDialog(code ? (PLAN_RESTRICTED_CODE_REASON[code] ?? "generic") : "generic")
    }
    window.addEventListener("plan:restricted", handler)
    return () => window.removeEventListener("plan:restricted", handler)
  }, [openUpgradeDialog])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) closeUpgradeDialog() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Crown className="size-5" />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t(REASON_DESC_KEY[reason])}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeUpgradeDialog}>
            {t("later")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              closeUpgradeDialog()
              router.push("/pricing")
            }}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
