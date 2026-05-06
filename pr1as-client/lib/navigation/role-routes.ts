export type RoleRouteKey =
  | "booking"
  | "chat"
  | "notifications"
  | "posts"
  | "pricing"
  | "profile"
  | "wallet"

type RoleRoutes = Partial<Record<RoleRouteKey, string>>

const ROLE_ROUTES: Record<string, RoleRoutes> = {
  client: {
    booking: "/client/bookings",
    chat: "/client/chat",
    profile: "/client/profile",
    wallet: "/client/wallet",
  },
}

export function getRoleRoute(
  routeKey: RoleRouteKey,
  activeRole: string | null | undefined,
  fallbackHref: string
) {
  if (!activeRole) return fallbackHref

  return ROLE_ROUTES[activeRole.toLowerCase()]?.[routeKey] ?? fallbackHref
}
