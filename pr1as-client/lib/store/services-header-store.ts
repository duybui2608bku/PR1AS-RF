import { create } from "zustand"

import type { ServiceTab } from "@/lib/home/home-search-params"

type ServicesHeaderState = {
  activeTab: ServiceTab
  selectedLocationLabel: string | null
  scheduledAtLabel: string | null
  switchTabCallback: ((tab: ServiceTab) => void) | null
  isHeaderExpanded: boolean
  filterSlotEl: HTMLElement | null
  setActiveTab: (tab: ServiceTab) => void
  setSearchDisplay: (location: string | null, date: string | null) => void
  setSwitchTabCallback: (fn: ((tab: ServiceTab) => void) | null) => void
  setHeaderExpanded: (expanded: boolean) => void
  setFilterSlotEl: (el: HTMLElement | null) => void
}

export const useServicesHeaderStore = create<ServicesHeaderState>()((set) => ({
  activeTab: "ASSISTANCE",
  selectedLocationLabel: null,
  scheduledAtLabel: null,
  switchTabCallback: null,
  isHeaderExpanded: true,
  filterSlotEl: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchDisplay: (location, date) =>
    set({ selectedLocationLabel: location, scheduledAtLabel: date }),
  setSwitchTabCallback: (fn) => set({ switchTabCallback: fn }),
  setHeaderExpanded: (expanded) => set({ isHeaderExpanded: expanded }),
  setFilterSlotEl: (el) => set({ filterSlotEl: el }),
}))
