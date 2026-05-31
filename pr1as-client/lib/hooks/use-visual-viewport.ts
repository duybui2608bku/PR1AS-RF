"use client"
import { useEffect } from "react"

/**
 * Tracks the gap between layout viewport and visual viewport (= browser toolbar height).
 * Sets --bottom-toolbar-offset on <html> so bottom nav and its spacer can shift up
 * when the mobile browser toolbar appears, without JS per-component.
 */
export function useVisualViewportBottom(): void {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.offsetTop - vv.height)
      document.documentElement.style.setProperty("--bottom-toolbar-offset", `${offset}px`)
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)

    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      document.documentElement.style.removeProperty("--bottom-toolbar-offset")
    }
  }, [])
}
