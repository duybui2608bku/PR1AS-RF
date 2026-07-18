"use client"

import { useCallback } from "react"

import { useUpgradePlanStore, type UpgradePlanReason } from "@/lib/store/upgrade-plan-store"

export function useRequirePlan() {
  const openUpgradeDialog = useUpgradePlanStore((s) => s.openUpgradeDialog)

  const requirePlan = useCallback(
    (allowed: boolean, reason: UpgradePlanReason, callback?: () => void) => {
      if (allowed) {
        callback?.()
      } else {
        openUpgradeDialog(reason)
      }
    },
    [openUpgradeDialog],
  )

  return { requirePlan }
}
