export const TOKEN_COOKIE_NAME = "token"
export const ACTIVE_ROLE_COOKIE_NAME = "active_role"

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7


/**
 * Set httpOnly session cookie qua POST /api/auth/session.
 * Retry với backoff để chịu được network blip trên mobile — đây là request
 * duy nhất tạo cookie cho middleware, fail đồng nghĩa user bị đá khỏi
 * protected routes dù Zustand đã authenticated.
 * @returns true nếu cookie được set thành công.
 */
export async function setSessionCookie(token: string): Promise<boolean> {
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "same-origin",
        cache: "no-store",
        // keepalive: request không bị huỷ nếu trang điều hướng giữa chừng
        keepalive: true,
      })
      if (res.ok) return true
    } catch {
      // Network blip — thử lại với backoff
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }
  return false
}

export async function clearSessionCookie(): Promise<void> {
  // force=true: luôn xóa cookie khi logout chủ động,
  // không dùng smart-delete (smart-delete giữ lại cookie còn hạn → gây auto re-login)
  await fetch("/api/auth/session?force=true", { method: "DELETE" })
}

export function setActiveRoleCookie(activeRole: string | null | undefined): void {
  if (typeof document === "undefined") return

  if (!activeRole) {
    document.cookie = `${ACTIVE_ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
    return
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ACTIVE_ROLE_COOKIE_NAME}=${encodeURIComponent(activeRole)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

export function clearActiveRoleCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${ACTIVE_ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}
