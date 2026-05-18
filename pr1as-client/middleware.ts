import { NextResponse, type NextRequest } from "next/server"

import {
  ACTIVE_ROLE_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@/lib/auth/auth-cookie"

const PROTECTED_PREFIXES = ["/client", "/chat", "/posts", "/dashboard"]
const AUTH_PAGES = ["/login", "/register"]

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    )

    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function getTokenRole(token: string | undefined): string | null {
  if (!token) return null

  const payload = decodeJwtPayload(token)
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value
  const cookieRole = req.cookies.get(ACTIVE_ROLE_COOKIE_NAME)?.value?.toLowerCase()
  const tokenRole = getTokenRole(token)
  const activeRole = tokenRole === "admin" ? tokenRole : (cookieRole ?? tokenRole)

  if (token && activeRole === "admin" && !pathname.startsWith("/dashboard")) {
    const url = req.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (pathname === "/" && token && activeRole === "worker") {
    const url = req.nextUrl.clone()
    url.pathname = "/posts"
    return NextResponse.redirect(url)
  }

  if (isProtectedPath(pathname) && !token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  if (AUTH_PAGES.includes(pathname) && token) {
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
    "/posts/:path*",
    "/dashboard/:path*",
    "/",
    "/login",
    "/register",
  ],
}
