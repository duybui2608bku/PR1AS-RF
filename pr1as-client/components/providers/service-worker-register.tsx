"use client"

import * as React from "react"

// Đăng ký service worker (chỉ ở production) để bật khả năng cài PWA + cache asset.
// Dev tắt để tránh cache che mất hot-reload.
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", {
          // Luôn fetch sw.js mới từ network — không dùng HTTP cache
          updateViaCache: "none",
        })
        .catch(() => {
          // Lỗi đăng ký không được làm hỏng app
        })
    }

    // Reload page khi SW mới activate (sau deploy) — đảm bảo code mới được chạy
    navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        window.location.reload()
      }
    })

    if (document.readyState === "complete") register()
    else {
      window.addEventListener("load", register)
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return null
}
