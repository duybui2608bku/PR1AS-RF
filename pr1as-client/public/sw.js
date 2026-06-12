// PR1AS service worker — tối giản & an toàn.
// Mục tiêu: đủ điều kiện cài PWA + tăng tốc asset tĩnh, KHÔNG cache API/socket.
// Tăng version khi muốn buộc làm mới cache cũ.
const CACHE = "pr1as-v7"

// Các path yêu cầu đăng nhập — KHÔNG cache HTML (nội dung cá nhân hóa,
// và tránh cache nhầm response redirect về /login của middleware).
const PROTECTED_PREFIXES = [
  "/client",
  "/chat",
  "/dashboard",
  "/notifications",
  "/settings",
  "/wallet",
  "/worker",
]

const isProtectedPath = (pathname) =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))

// Trang fallback khi điều hướng lúc mất mạng (kể cả reload cứng khi offline).
const OFFLINE_URL = "/offline"

self.addEventListener("install", (event) => {
  // Precache trang offline để luôn có sẵn dù chưa từng truy cập khi đang online.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {
        // Precache thất bại không được chặn cài SW.
      }),
  )
  // Kích hoạt SW mới ngay, không chờ tab cũ đóng
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Dọn cache phiên bản cũ
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
      // Báo tất cả tab reload để chạy code mới sau deploy
      const clients = await self.clients.matchAll({ type: "window" })
      clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }))
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Chỉ xử lý GET cùng origin. Bỏ qua API, socket.io, và mọi cross-origin.
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) return

  // Điều hướng trang (HTML): network-first, fallback cache khi offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          // Chỉ cache response thành công, không phải redirect (navigation request
          // có redirect mode "manual" → redirect của middleware là opaqueredirect,
          // cache nó sẽ khiến lần offline sau bị "đá về /login" oan), và không
          // phải trang protected (nội dung cá nhân hóa).
          if (fresh.ok && !fresh.redirected && !isProtectedPath(url.pathname)) {
            const cache = await caches.open(CACHE)
            cache.put(request, fresh.clone())
          }
          return fresh
        } catch {
          // Ưu tiên bản cache của chính trang; nếu không có thì rơi về trang offline.
          const cached = await caches.match(request)
          return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error()
        }
      })(),
    )
    return
  }

  // Asset tĩnh bất biến của Next (_next/static) + ảnh: cache-first.
  if (url.pathname.startsWith("/_next/static") || /\.(?:png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const fresh = await fetch(request)
        const cache = await caches.open(CACHE)
        cache.put(request, fresh.clone())
        return fresh
      })(),
    )
  }
})
