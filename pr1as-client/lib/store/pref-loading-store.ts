import { create } from "zustand"

/** Which preference is currently being applied (drives the loading overlay). */
export type PrefLoadingKind = "locale" | "currency"

type PrefLoadingState = {
  /** Non-null while a language/currency switch is in flight. */
  kind: PrefLoadingKind | null
  /** Begin showing the overlay for the given preference. */
  start: (kind: PrefLoadingKind) => void
  /** Hide the overlay. */
  stop: () => void
}

/**
 * Global, switcher-agnostic loading state. Any of the locale/currency switchers
 * (header dropdowns, mobile prefs sheet) calls `start`; a single overlay mounted
 * in the providers tree reads `kind` and renders the spinner.
 */
export const usePrefLoadingStore = create<PrefLoadingState>((set) => ({
  kind: null,
  start: (kind) => set({ kind }),
  stop: () => set({ kind: null }),
}))
