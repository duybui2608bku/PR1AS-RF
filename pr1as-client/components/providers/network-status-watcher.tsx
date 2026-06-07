"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

// Trang hiển thị khi mất mạng + khóa lưu trang cần quay lại.
// RETURN_KEY phải khớp với app/offline/page.tsx.
const OFFLINE_PATH = "/offline"
const RETURN_KEY = "pr1as:return-path"

/**
 * Theo dõi trạng thái mạng của trình duyệt (desktop + mobile).
 * Khi mất mạng: lưu trang hiện tại rồi chuyển sang /offline.
 * Khi có mạng lại: tự quay về đúng trang đã lưu.
 *
 * Dùng sự kiện online/offline chuẩn của trình duyệt nên hoạt động trên mọi nền tảng.
 */
export function NetworkStatusWatcher() {
  const router = useRouter()
  const pathname = usePathname()
  // Giữ pathname mới nhất trong ref để handler không cần đăng ký lại mỗi lần đổi trang.
  const pathRef = React.useRef(pathname)
  React.useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  React.useEffect(() => {
    if (typeof navigator === "undefined") return

    const goOffline = () => {
      if (pathRef.current === OFFLINE_PATH) return
      try {
        sessionStorage.setItem(RETURN_KEY, pathRef.current + window.location.search)
      } catch {
        // sessionStorage bị chặn — vẫn chuyển trang, chỉ là không nhớ chỗ cũ.
      }
      router.push(OFFLINE_PATH)
    }

    const goOnline = () => {
      if (pathRef.current !== OFFLINE_PATH) return
      let back = "/"
      try {
        back = sessionStorage.getItem(RETURN_KEY) || "/"
        sessionStorage.removeItem(RETURN_KEY)
      } catch {
        // bỏ qua
      }
      router.replace(back)
    }

    // Nếu vào app khi đang offline sẵn, chuyển ngay.
    if (!navigator.onLine) goOffline()

    window.addEventListener("offline", goOffline)
    window.addEventListener("online", goOnline)
    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online", goOnline)
    }
  }, [router])

  return null
}
