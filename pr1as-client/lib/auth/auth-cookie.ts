export { TOKEN_COOKIE_NAME, ACTIVE_ROLE_COOKIE_NAME } from "./auth-cookie-names"

const ACTIVE_ROLE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function setActiveRoleCookie(activeRole: string | null | undefined): void {
  if (typeof document === "undefined") return

  if (!activeRole) {
    document.cookie = `active_role=; path=/; max-age=0; SameSite=Lax`
    return
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `active_role=${encodeURIComponent(activeRole)}; path=/; max-age=${ACTIVE_ROLE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

export function clearActiveRoleCookie(): void {
  if (typeof document === "undefined") return
  document.cookie = `active_role=; path=/; max-age=0; SameSite=Lax`
}
