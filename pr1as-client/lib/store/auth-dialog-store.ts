import { create } from "zustand"

type AuthDialogStore = {
  open: boolean
  fromPath: string
  openAuthDialog: (fromPath?: string) => void
  closeAuthDialog: () => void
}

export const useAuthDialogStore = create<AuthDialogStore>((set) => ({
  open: false,
  fromPath: "",
  openAuthDialog: (fromPath = "") => set({ open: true, fromPath }),
  closeAuthDialog: () => set({ open: false }),
}))
