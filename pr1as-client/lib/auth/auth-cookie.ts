export const TOKEN_COOKIE_NAME = "token"
export const ACTIVE_ROLE_COOKIE_NAME = "active_role"

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7


export async function setSessionCookie(token: string): Promise<void> {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
}

export async function clearSessionCookie(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" })
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
