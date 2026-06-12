"use client"

import * as React from "react"

import { api } from "@/lib/axios"
import { useAuthStore } from "@/lib/store/auth-store"

/**
 * Đọc claim exp từ JWT (KHÔNG verify chữ ký — chỉ dùng để quyết định
 * refresh sớm phía client; mọi xác thực thật vẫn ở backend/middleware).
 */
function getJwtExpMs(token: string): number | null {
  try {
    const payloadPart = token.split(".")[1]
    if (!payloadPart) return null
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(base64)) as { exp?: unknown }
    return typeof payload.exp === "number" ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** Refresh khi token còn dưới 90s (hoặc đã hết hạn). */
const EXPIRY_MARGIN_MS = 90_000

/**
 * Chủ động làm mới access token khi app trở lại foreground.
 *
 * Kịch bản mobile: user background app >15 phút → JWT trong httpOnly cookie
 * hết hạn (không có API call nào nên silent refresh chưa từng chạy) → bấm
 * vào protected route bị middleware đá về /login. Provider này chặn đứng
 * kịch bản đó: khi tab visible trở lại và token sắp/đã hết hạn, gọi /auth/me —
 * axios interceptor sẽ tự refresh token và ghi lại cookie trước khi user
 * kịp điều hướng.
 */
export function TokenForegroundRefresh() {
  React.useEffect(() => {
    let inFlight = false

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return
      const { token, isAuthenticated } = useAuthStore.getState()
      if (!isAuthenticated || !token || inFlight) return

      const expMs = getJwtExpMs(token)
      if (expMs === null || expMs - Date.now() > EXPIRY_MARGIN_MS) return

      inFlight = true
      // Bearer hết hạn → 401 → interceptor refresh + setSessionCookie.
      // Nếu refresh token cũng hết hạn, interceptor tự force-logout — đúng kỳ vọng.
      api
        .get("/auth/me")
        .catch(() => {})
        .finally(() => {
          inFlight = false
        })
    }

    document.addEventListener("visibilitychange", maybeRefresh)
    // pageshow: bfcache restore trên mobile Safari không bắn visibilitychange
    window.addEventListener("pageshow", maybeRefresh)
    maybeRefresh()

    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh)
      window.removeEventListener("pageshow", maybeRefresh)
    }
  }, [])

  return null
}
