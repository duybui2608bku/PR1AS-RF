import { create } from "zustand"

interface UIState {
  /** Ẩn bottom nav trên mobile (vd: khi đang trong 1 đoạn chat) */
  hideBottomNav: boolean
  setHideBottomNav: (hide: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  hideBottomNav: false,
  setHideBottomNav: (hide) => set({ hideBottomNav: hide }),
}))
