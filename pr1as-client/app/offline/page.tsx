"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"

// Khóa sessionStorage lưu trang người dùng đang xem trước khi mất mạng,
// để quay lại đúng chỗ khi có mạng trở lại. Phải khớp với network-status-watcher.
const RETURN_KEY = "pr1as:return-path"

export default function OfflinePage() {
  const router = useRouter()
  const [checking, setChecking] = React.useState(false)

  // Quay lại trang đang xem trước đó (hoặc trang chủ nếu không có).
  const goBack = React.useCallback(() => {
    let back = "/"
    try {
      back = sessionStorage.getItem(RETURN_KEY) || "/"
      sessionStorage.removeItem(RETURN_KEY)
    } catch {
      // sessionStorage có thể bị chặn (chế độ riêng tư) — bỏ qua.
    }
    router.replace(back)
  }, [router])

  // Bấm "Thử lại": navigator.onLine báo nhanh nhưng chỉ biết có kết nối mạng nội bộ,
  // nên ping thật một file tĩnh (kèm query chống cache) để chắc chắn ra được internet.
  const retry = React.useCallback(async () => {
    setChecking(true)
    let online = typeof navigator === "undefined" ? true : navigator.onLine
    if (online) {
      try {
        await fetch(`/icon.svg?_=${Date.now()}`, { method: "HEAD", cache: "no-store" })
      } catch {
        online = false
      }
    }
    setChecking(false)
    if (online) goBack()
  }, [goBack])

  // Khi trình duyệt báo có mạng trở lại, tự động quay về trang cũ.
  React.useEffect(() => {
    window.addEventListener("online", goBack)
    return () => window.removeEventListener("online", goBack)
  }, [goBack])

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="bg-muted text-muted-foreground flex size-20 items-center justify-center rounded-full sm:size-24">
        <WifiOff className="size-9 sm:size-11" aria-hidden />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mất kết nối mạng</h1>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm sm:text-base">
          Có vẻ như bạn đang ngoại tuyến. Vui lòng kiểm tra kết nối Wi‑Fi hoặc dữ liệu di động rồi
          thử lại.
        </p>
      </div>

      <Button onClick={retry} disabled={checking} size="lg" className="w-full max-w-xs">
        <RefreshCw className={checking ? "animate-spin" : undefined} aria-hidden />
        {checking ? "Đang kiểm tra…" : "Thử lại"}
      </Button>
    </div>
  )
}
