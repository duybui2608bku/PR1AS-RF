import { type NextRequest, NextResponse } from "next/server"

export const TOKEN_COOKIE_NAME = "token"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function isBasicJwt(value: string): boolean {
  const parts = value.split(".")
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = body?.token

  if (!token || typeof token !== "string" || !isBasicJwt(token)) {
    return NextResponse.json({ error: "Token không hợp lệ." }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  })
  return res
}

export async function DELETE() {
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
