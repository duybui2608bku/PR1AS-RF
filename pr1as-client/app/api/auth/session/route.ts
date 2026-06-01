import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

export const TOKEN_COOKIE_NAME = "token"

// GET: check server-side session — đọc httpOnly cookie, gọi backend server-to-server.
// Dùng bởi SessionRestoreProvider để restore Zustand khi sessionStorage empty (tab mới).
export async function GET(req: NextRequest) {
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ ok: false })

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? "pr1as-dev-only-not-for-production",
    )
    await jwtVerify(token, secret)
  } catch {
    return NextResponse.json({ ok: false })
  }

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api").replace(/\/+$/, "")
  try {
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": "vi" },
    })
    if (!res.ok) return NextResponse.json({ ok: false })
    const data = await res.json()
    return NextResponse.json({ ok: true, user: data.data?.user ?? null, token })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = body?.token

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token không hợp lệ." }, { status: 400 })
  }

  try {
    const jwtSecret = process.env.JWT_SECRET ?? "pr1as-dev-only-not-for-production"
    const secret = new TextEncoder().encode(jwtSecret)
    await jwtVerify(token, secret)

    const res = NextResponse.json({ ok: true })
    res.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // Session cookie (no maxAge) — clears when browser closes,
      // matching the sessionStorage lifecycle of the Zustand auth store.
      path: "/",
    })
    return res
  } catch {
    return NextResponse.json({ error: "Token không hợp lệ hoặc đã hết hạn." }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  // CSRF Protection: verify the origin or referer header to prevent cross-origin session destruction
  const origin = req.headers.get("origin")
  const referer = req.headers.get("referer")
  const host = req.headers.get("host") || ""

  if (origin && !origin.includes(host)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ (CSRF)." }, { status: 403 })
  }
  if (!origin && referer && !referer.includes(host)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ (CSRF)." }, { status: 403 })
  }

  // Smart delete: skip if token is still valid (another tab may be using it).
  // Only clear if the token is expired or invalid (stale cookie case).
  const currentToken = req.cookies.get(TOKEN_COOKIE_NAME)?.value
  if (currentToken) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET ?? "pr1as-dev-only-not-for-production",
      )
      await jwtVerify(currentToken, secret)
      return NextResponse.json({ ok: true, skipped: true })
    } catch {
      // Expired or invalid — proceed to clear
    }
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  return res
}
