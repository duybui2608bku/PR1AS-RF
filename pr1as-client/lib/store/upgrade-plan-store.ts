import { create } from "zustand"

export type UpgradePlanReason = "messaging" | "post" | "boost" | "generic"

type UpgradePlanStore = {
  open: boolean
  reason: UpgradePlanReason
  openUpgradeDialog: (reason?: UpgradePlanReason) => void
  closeUpgradeDialog: () => void
}

export const useUpgradePlanStore = create<UpgradePlanStore>((set) => ({
  open: false,
  reason: "generic",
  openUpgradeDialog: (reason = "generic") => set({ open: true, reason }),
  closeUpgradeDialog: () => set({ open: false }),
}))
