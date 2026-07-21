import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

import {
  ACTIVE_ROLE_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "@/lib/auth/auth-cookie"
import { getJwtSecret } from "@/lib/auth/jwt-secret"
import {
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  detectLocaleFromAcceptLanguage,
} from "@/lib/locale"

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

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
  // Resolve the secret OUTSIDE the try: a missing secret in production throws
  // and bubbles up to a 500, making the misconfiguration loud instead of
  // silently failing every verification and looping users back to /login.
  const secret = getJwtSecret()
  try {
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

// Trang mặc định cho user đã đăng nhập khi họ landing ở entry point mặc định
// (root `/` hoặc trang auth trong lúc còn phiên). Client → Dịch vụ, Worker →
// Bảng tin, Admin → Dashboard. Role khác/không xác định giữ fallback /about.
function defaultLandingForRole(role: string | null): string {
  if (role === "admin") return "/dashboard"
  if (role === "client") return "/services"
  if (role === "worker") return "/posts"
  return "/about"
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
      // Check này chạy trên gần như mọi navigation — không được phép treo
      // navigation khi mạng mobile chập chờn. Quá 2s thì bỏ qua (catch bên dưới).
      signal: AbortSignal.timeout(2000),
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

  // First-time visitors have no explicit language choice yet: detect it from the
  // browser's Accept-Language header (fallback English) and pin it into the
  // NEXT_LOCALE cookie so it stays stable on subsequent requests. We also detect
  // when the existing cookie holds an unsupported value (tampered / removed
  // locale) so it gets healed instead of leaving the UI and backend out of sync.
  // Once a valid cookie exists, this is a no-op (detectedLocale === null).
  const localeCookie = req.cookies.get(LOCALE_COOKIE_NAME)?.value
  const hasValidLocaleCookie =
    !!localeCookie && (SUPPORTED_LOCALES as readonly string[]).includes(localeCookie)
  const detectedLocale = hasValidLocaleCookie
    ? null
    : detectLocaleFromAcceptLanguage(req.headers.get("accept-language"))

  // Only pin the cookie on real HTML document navigations — not on RSC prefetches,
  // API calls, or metadata routes (robots.txt / sitemap.xml / manifest), where a
  // stray Set-Cookie would defeat CDN caching.
  const isDocumentNavigation = req.headers.get("sec-fetch-dest") === "document"

  const applyLocaleCookie = (res: NextResponse): NextResponse => {
    if (detectedLocale && isDocumentNavigation) {
      res.cookies.set(LOCALE_COOKIE_NAME, detectedLocale, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      })
    }
    return res
  }

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
      return applyLocaleCookie(NextResponse.redirect(url))
    }
  }

  // User đã đăng nhập quay lại trang gốc `/` (dù còn phiên, không cần login lại)
  // → đá thẳng về trang mặc định theo role thay vì rơi xuống app/page.tsx (/about).
  // Khách (không token) vẫn rơi xuống /about như cũ.
  if (isTokenValid && pathname === "/") {
    const landing = defaultLandingForRole(activeRole)
    if (landing !== "/") {
      const url = req.nextUrl.clone()
      url.pathname = landing
      return applyLocaleCookie(NextResponse.redirect(url))
    }
  }

  // Worker không được vào trang Dịch vụ — kể cả gõ thẳng URL. Đẩy về /posts.
  if (
    isTokenValid &&
    activeRole === "worker" &&
    (pathname === "/services" || pathname.startsWith("/services/"))
  ) {
    const url = req.nextUrl.clone()
    url.pathname = "/posts"
    url.search = ""
    return applyLocaleCookie(NextResponse.redirect(url))
  }

  if (isProtectedPath(pathname) && !isTokenValid) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)

    // Clear cookies since the token is invalid/expired
    const response = NextResponse.redirect(url)
    response.cookies.delete(TOKEN_COOKIE_NAME)
    response.cookies.delete(ACTIVE_ROLE_COOKIE_NAME)
    return applyLocaleCookie(response)
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
    url.pathname = allowedFrom ?? defaultLandingForRole(activeRole)
    return applyLocaleCookie(NextResponse.redirect(url))
  }

  return applyLocaleCookie(NextResponse.next())
}

export const config = {
  // Run middleware on all page routes; exclude Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)"],
}
