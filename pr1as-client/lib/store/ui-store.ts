import { create } from "zustand"

interface UIState {
  /** Ẩn bottom nav trên mobile (vd: khi đang trong 1 đoạn chat) */
  hideBottomNav: boolean
  setHideBottomNav: (hide: boolean) => void
  /** Header đang bị ẩn (auto-hide khi scroll xuống trên mobile) */
  headerHidden: boolean
  setHeaderHidden: (hidden: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  hideBottomNav: false,
  setHideBottomNav: (hide) => set({ hideBottomNav: hide }),
  headerHidden: false,
  setHeaderHidden: (hidden) => set({ headerHidden: hidden }),
}))
