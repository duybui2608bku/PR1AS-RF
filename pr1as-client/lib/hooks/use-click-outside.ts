"use client"

import * as React from "react"

export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onOutside: (event: MouseEvent) => void,
  enabled = true,
) {
  const handlerRef = React.useRef(onOutside)
  React.useEffect(() => {
    handlerRef.current = onOutside
  }, [onOutside])

  React.useEffect(() => {
    if (!enabled) return

    const handle = (event: MouseEvent) => {
      const node = ref.current
      if (!node || node.contains(event.target as Node)) return
      handlerRef.current(event)
    }

    window.addEventListener("mousedown", handle)
    return () => window.removeEventListener("mousedown", handle)
  }, [ref, enabled])
}
