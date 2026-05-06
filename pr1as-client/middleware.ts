import { NextResponse, type NextRequest } from "next/server"

const AUTH_COOKIE_NAME = "auth_token"

const PROTECTED_PREFIXES = ["/client", "/chat", "/posts", "/dashboard"]
const AUTH_PAGES = ["/login", "/register"]

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value

  if (isProtectedPath(pathname) && !token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  if (AUTH_PAGES.includes(pathname) && token) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
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
    "/login",
    "/register",
  ],
}
