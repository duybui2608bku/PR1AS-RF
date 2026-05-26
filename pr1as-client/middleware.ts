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
  "/settings",
  "/wallet",
  "/worker/setup",
  "/worker/bookings",
  "/worker/schedule",
]
const AUTH_PAGES = ["/login", "/register"]

// Signature and Expiration Verification at Next.js Edge Layer using jose
async function verifyAndDecodeJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET || "pr1as"
    const secret = new TextEncoder().encode(jwtSecret)
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value
  
  // Verify token signature and exp claim at Edge
  const payload = token ? await verifyAndDecodeJwt(token) : null
  const isTokenValid = payload !== null

  const cookieRole = req.cookies.get(ACTIVE_ROLE_COOKIE_NAME)?.value?.toLowerCase()
  const tokenRole = getTokenRole(payload)
  const activeRole = tokenRole === "admin" ? tokenRole : (cookieRole ?? tokenRole)

  if (isTokenValid && activeRole === "admin" && !pathname.startsWith("/dashboard")) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (pathname === "/" && isTokenValid && activeRole === "worker") {
    const url = req.nextUrl.clone()
    url.pathname = "/posts"
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
  matcher: [
    "/client/:path*",
    "/chat/:path*",
    "/dashboard/:path*",
    "/settings/:path*",
    "/wallet/:path*",
    "/worker/setup/:path*",
    "/worker/bookings/:path*",
    "/worker/schedule/:path*",
    "/",
    "/login",
    "/register",
  ],
}
