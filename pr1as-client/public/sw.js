// PR1AS service worker — tối giản & an toàn.
// Mục tiêu: đủ điều kiện cài PWA + tăng tốc asset tĩnh, KHÔNG cache API/socket.
// Tăng version khi muốn buộc làm mới cache cũ.
const CACHE = "pr1as-v2"

self.addEventListener("install", () => {
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
          const cache = await caches.open(CACHE)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(request)
          return cached ?? Response.error()
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
