import { type NextRequest, NextResponse } from "next/server"

// Route handler cho /api/auth/* — thay thế rewrite proxy để đảm bảo Set-Cookie
// từ backend được forward chính xác đến browser (rewrites() không làm được điều này).
const getBackendBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
  return apiUrl.replace(/\/api\/?$/, "")
}

async function proxyToBackend(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/")
  const targetUrl = `${getBackendBaseUrl()}/api/auth/${path}${req.nextUrl.search}`

  const headers: Record<string, string> = {}
  const contentType = req.headers.get("content-type")
  if (contentType) headers["content-type"] = contentType
  const lang = req.headers.get("accept-language")
  if (lang) headers["accept-language"] = lang
  // Forward browser cookies (token, refreshToken) đến backend
  const cookie = req.headers.get("cookie")
  if (cookie) headers["cookie"] = cookie
  // Forward CSRF token
  const csrf = req.headers.get("x-csrf-token")
  if (csrf) headers["x-csrf-token"] = csrf
  // Preserve client IP cho rate limiting
  const fwd = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")
  if (fwd) headers["x-forwarded-for"] = fwd

  const hasBody = req.method !== "GET" && req.method !== "HEAD"
  const body = hasBody ? await req.text() : undefined

  let backendRes: Response
  try {
    backendRes = await fetch(targetUrl, { method: req.method, headers, body })
  } catch {
    return NextResponse.json(
      { success: false, message: "Không thể kết nối đến máy chủ" },
      { status: 503 },
    )
  }

  const resBody = await backendRes.text()
  const response = new NextResponse(resBody, {
    status: backendRes.status,
    headers: { "content-type": backendRes.headers.get("content-type") ?? "application/json" },
  })

  // Explicitly copy Set-Cookie — đây là lý do route handler tồn tại
  for (const setCookie of backendRes.headers.getSetCookie()) {
    response.headers.append("set-cookie", setCookie)
  }

  return response
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxyToBackend(req, (await params).path)
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxyToBackend(req, (await params).path)
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return proxyToBackend(req, (await params).path)
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return proxyToBackend(req, (await params).path)
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return proxyToBackend(req, (await params).path)
}
