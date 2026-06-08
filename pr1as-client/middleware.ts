import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

import {
  ACTIVE_ROLE_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@/lib/auth/auth-cookie"

const PROTECTED_PREFIXES = [
  "/client",
  "/chat",
  "/dashboard",
  "/notifications",
  "/settings",
  "/wallet",
  "/worker/setup",
  "/worker/bookings",
  "/worker/schedule",
]
const AUTH_PAGES = ["/login", "/register"]

// Paths that bypass maintenance mode redirect
const MAINTENANCE_BYPASS_PREFIXES = [
  "/maintenance",
  "/login",
  "/register",
  "/_next",
  "/favicon",
  "/api",
]

// Signature and Expiration Verification at Next.js Edge Layer using jose
async function verifyAndDecodeJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret && process.env.NODE_ENV === "production") {
      console.error("[middleware] CRITICAL: JWT_SECRET env var is not set in production. All token verifications will fail.")
    }
    const secret = new TextEncoder().encode(jwtSecret ?? "pr1as-dev-only-not-for-production")
    const { payload } = await jwtVerify(token, secret)
    return payload as Record<string, unknown>
  } catch {
    // Returns null if signature is invalid, token is forged, or token is expired
    return null
  }
}

function getTokenRole(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null

  const roles = Array.isArray(payload.roles)
    ? payload.roles
        .filter((role): role is string => typeof role === "string")
        .map((role) => role.toLowerCase())
    : []
  const role = typeof payload.role === "string" ? payload.role.toLowerCase() : null
  const lastActiveRole =
    typeof payload.last_active_role === "string"
      ? payload.last_active_role.toLowerCase()
      : null

  if (
    lastActiveRole &&
    (roles.length === 0 || roles.includes(lastActiveRole) || lastActiveRole === role)
  ) {
    return lastActiveRole
  }

  if (role && (roles.length === 0 || roles.includes(role))) {
    return role
  }

  return roles[0] ?? role
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function isMaintenanceBypassPath(pathname: string): boolean {
  return MAINTENANCE_BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

async function fetchMaintenanceStatus(): Promise<{ maintenanceMode: boolean; maintenanceMessage: string }> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
    const url = `${apiBase}/site-settings/maintenance`
    const res = await fetch(url, {
      next: { revalidate: 30 }, // Cache for 30 seconds
    })
    if (!res.ok) return { maintenanceMode: false, maintenanceMessage: "" }
    const json = await res.json() as { data?: { maintenanceMode?: boolean; maintenanceMessage?: string } }
    return {
      maintenanceMode: json.data?.maintenanceMode ?? false,
      maintenanceMessage: json.data?.maintenanceMessage ?? "",
    }
  } catch {
    // If the API is unreachable, don't block access
    return { maintenanceMode: false, maintenanceMessage: "" }
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value

  // Verify token signature and exp claim at Edge
  const payload = token ? await verifyAndDecodeJwt(token) : null
  const isTokenValid = payload !== null

  const cookieRole = req.cookies.get(ACTIVE_ROLE_COOKIE_NAME)?.value?.toLowerCase()
  const tokenRole = getTokenRole(payload)

  // Validate cookieRole against JWT's roles array to prevent stale cookies from
  // overriding the correct role (e.g. old "worker" cookie when user is now "client")
  const tokenPayloadRoles = (Array.isArray(payload?.roles) ? payload.roles : [])
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.toLowerCase())
  if (typeof payload?.role === "string" && !tokenPayloadRoles.includes(payload.role.toLowerCase())) {
    tokenPayloadRoles.push(payload.role.toLowerCase())
  }
  const isCookieRoleValid =
    !!cookieRole && (tokenPayloadRoles.length === 0 || tokenPayloadRoles.includes(cookieRole))
  const activeRole = tokenRole === "admin" ? tokenRole : (isCookieRoleValid ? cookieRole : tokenRole)

  // Maintenance mode check — skip for admin users and bypass paths
  if (!isMaintenanceBypassPath(pathname) && activeRole !== "admin") {
    const { maintenanceMode } = await fetchMaintenanceStatus()
    if (maintenanceMode) {
      const url = req.nextUrl.clone()
      url.pathname = "/maintenance"
      return NextResponse.redirect(url)
    }
  }

  if (isTokenValid && activeRole === "admin" && pathname === "/") {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (pathname === "/" && isTokenValid && activeRole === "worker") {
    const url = req.nextUrl.clone()
    url.pathname = "/posts"
    return NextResponse.redirect(url)
  }

  if (pathname === "/" && isTokenValid && activeRole === "client") {
    const url = req.nextUrl.clone()
    url.pathname = "/services"
    return NextResponse.redirect(url)
  }

  if (isProtectedPath(pathname) && !isTokenValid) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)

    // Clear cookies since the token is invalid/expired
    const response = NextResponse.redirect(url)
    response.cookies.delete(TOKEN_COOKIE_NAME)
    response.cookies.delete(ACTIVE_ROLE_COOKIE_NAME)
    return response
  }

  if (AUTH_PAGES.includes(pathname) && isTokenValid) {
    const url = req.nextUrl.clone()
    const fromParam = req.nextUrl.searchParams.get("from")
    const safeFrom =
      fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//")
        ? fromParam
        : null
    const allowedFrom =
      safeFrom && safeFrom.startsWith("/dashboard") && activeRole !== "admin"
        ? null
        : safeFrom

    url.search = ""
    url.pathname =
      allowedFrom ??
      (activeRole === "admin"
        ? "/dashboard"
        : activeRole === "worker"
          ? "/posts"
          : "/")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all page routes; exclude Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)"],
}
