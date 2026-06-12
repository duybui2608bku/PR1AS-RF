"use client"

import * as React from "react"

// Đăng ký service worker (chỉ ở production) để bật khả năng cài PWA + cache asset.
// Dev tắt để tránh cache che mất hot-reload.
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Lỗi đăng ký không được làm hỏng app — bỏ qua im lặng.
      })
    }

    // SW mới activate sau deploy sẽ postMessage SW_UPDATED (xem sw.js).
    // Reload để tab chạy code mới — nhưng không reload giữa lúc user đang
    // thao tác: nếu tab đang hiển thị thì đợi đến khi bị ẩn mới reload.
    let pendingReload = false
    const reloadWhenSafe = () => {
      if (document.visibilityState === "hidden") {
        window.location.reload()
      } else {
        pendingReload = true
      }
    }
    const onVisibilityChange = () => {
      if (pendingReload && document.visibilityState === "hidden") {
        window.location.reload()
      }
    }
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === "SW_UPDATED") {
        reloadWhenSafe()
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage)
    document.addEventListener("visibilitychange", onVisibilityChange)

    let removeLoadListener: (() => void) | undefined
    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register)
      removeLoadListener = () => window.removeEventListener("load", register)
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      removeLoadListener?.()
    }
  }, [])

  return null
}
