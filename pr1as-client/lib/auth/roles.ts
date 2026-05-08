import type { AuthUser } from "@/lib/store/auth-store"

export function getActiveRole(user: AuthUser | null | undefined): string | null {
  const role = user?.role?.toLowerCase()
  const roles = user?.roles?.map((item) => item.toLowerCase()) ?? []
  const lastActiveRole = user?.last_active_role?.toLowerCase()

  if (
    lastActiveRole &&
    (roles.length === 0 || roles.includes(lastActiveRole) || lastActiveRole === role)
  ) {
    return lastActiveRole
  }

  if (role && (roles.length === 0 || roles.includes(role))) {
    return role
  }

  return roles[0] ?? role ?? null
}

export function isAdminUser(user: AuthUser | null | undefined): boolean {
  const roles = user?.roles?.map((item) => item.toLowerCase()) ?? []

  return getActiveRole(user) === "admin" || roles.includes("admin")
}

export function isWorkerRoleActive(user: AuthUser | null | undefined): boolean {
  return getActiveRole(user) === "worker"
}
