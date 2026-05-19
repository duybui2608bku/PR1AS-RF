export type RoleRouteKey =
  | "booking"
  | "chat"
  | "favorites"
  | "posts"
  | "pricing"
  | "profile"
  | "schedule"
  | "settings"
  | "wallet"

type RoleRoutes = Partial<Record<RoleRouteKey, string>>

const ROLE_ROUTES: Record<string, RoleRoutes> = {
  client: {
    booking: "/client/bookings",
    chat: "/client/chat",
    favorites: "/client/favorites",
    profile: "/client/profile",
    wallet: "/wallet",
  },
  worker: {
    booking: "/worker/bookings",
    chat: "/chat",
    favorites: "/client/favorites",
    posts: "/posts",
    profile: "/client/profile",
    schedule: "/worker/bookings/schedule",
    wallet: "/wallet",
  },
}

const DEFAULT_ROLE_ROUTES: Record<string, string> = {
  admin: "/dashboard",
  client: "/",
  worker: "/posts",
}

export function getRoleRoute(
  routeKey: RoleRouteKey,
  activeRole: string | null | undefined,
  fallbackHref: string
) {
  if (!activeRole) return fallbackHref

  return ROLE_ROUTES[activeRole.toLowerCase()]?.[routeKey] ?? fallbackHref
}

export function getRoleDefaultRoute(
  activeRole: string | null | undefined,
  fallbackHref = "/"
) {
  if (!activeRole) return fallbackHref

  return DEFAULT_ROLE_ROUTES[activeRole.toLowerCase()] ?? fallbackHref
}
