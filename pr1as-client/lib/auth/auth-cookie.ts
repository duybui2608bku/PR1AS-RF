export const AUTH_COOKIE_NAME = "auth_token"
export const ACTIVE_ROLE_COOKIE_NAME = "active_role"

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`
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

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  document.cookie = `${ACTIVE_ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}
