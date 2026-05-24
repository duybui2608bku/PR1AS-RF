import { type NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

export const TOKEN_COOKIE_NAME = "token"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = body?.token

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token không hợp lệ." }, { status: 400 })
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "pr1as"
    const secret = new TextEncoder().encode(jwtSecret)
    const { payload } = await jwtVerify(token, secret)

    // Calculate dynamic maxAge based on exp claim to synchronize Cookie and Token TTL
    const exp = payload.exp
    let maxAge = 60 * 60 * 24 * 7 // Default fallback to 7 days
    if (exp && typeof exp === "number") {
      const nowInSeconds = Math.floor(Date.now() / 1000)
      maxAge = Math.max(0, exp - nowInSeconds)
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(TOKEN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAge,
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
