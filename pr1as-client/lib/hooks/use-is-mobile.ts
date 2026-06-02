"use client"
import * as React from "react"

// Matches Tailwind's `sm` breakpoint: < 640px is treated as mobile.
const MOBILE_QUERY = "(max-width: 639px)"

/**
 * Returns whether the viewport is below Tailwind's `sm` breakpoint.
 * SSR-safe: starts as `false` and resolves after mount, so server output
 * matches the desktop layout and updates on the client once measured.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  return isMobile
}
