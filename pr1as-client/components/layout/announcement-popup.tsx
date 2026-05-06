"use client"

import * as React from "react"
import { X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

const COOKIE_NAME = "announcement_dismissed"
const DISMISS_HOURS = 6

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)")
  )
  return match ? decodeURIComponent(match[1]) : undefined
}

function setCookie(name: string, value: string, hours: number) {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

export function AnnouncementPopup() {
  const visible = React.useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("announcement-dismissed", onStoreChange)
      return () => {
        window.removeEventListener("announcement-dismissed", onStoreChange)
      }
    },
    () => !getCookie(COOKIE_NAME),
    () => false
  )

  function dismiss() {
    setCookie(COOKIE_NAME, "1", DISMISS_HOURS)
    window.dispatchEvent(new Event("announcement-dismissed"))
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-amber-50 px-6 py-4 dark:bg-amber-950/40">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
          <div>
            <p className="text-xs font-medium tracking-wide text-amber-600 uppercase dark:text-amber-400">
              Thông báo quan trọng
            </p>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Lưu ý khi đặt lịch và giao dịch
            </h2>
          </div>
        </div>

        {/* Body */}
        <ul className="space-y-4 px-6 py-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Giao dịch qua hệ thống:&nbsp;
              </span>
              Mọi giao dịch đặt lịch phải được thực hiện qua hệ thống để nhằm
              bảo vệ quyền lợi người dùng và ghi nhận lịch trình. Việc giao dịch
              ngoài hệ thống sẽ không được nền tảng hỗ trợ khi xảy ra tranh
              chấp.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Tự bảo vệ an toàn:&nbsp;
              </span>
              Vì đây là nền tảng kết nối làm việc trực tiếp, người dùng có trách
              nhiệm tự bảo vệ an toàn thân thể và tài sản cá nhân. Chúng tôi
              khuyến khích gặp gỡ tại nơi công cộng và thông báo cho người thân
              về lịch trình làm việc.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Thỏa thuận công việc:&nbsp;
              </span>
              Người thực hiện có quyền từ chối nếu công việc thực tế sai khác
              hoặc vượt quá mô tả ban đầu.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Nghĩa vụ pháp lý:&nbsp;
              </span>
              Người dùng tự chịu trách nhiệm kê khai thu nhập cá nhân và đóng
              thuế theo quy định của Nhà nước. Nền tảng không chịu trách nhiệm
              thay cho các nghĩa vụ thuế cá nhân này.
            </p>
          </li>
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <p className="mr-auto text-xs text-zinc-400">
            Thông báo sẽ ẩn trong {DISMISS_HOURS} giờ
          </p>
          <Button onClick={dismiss} size="sm" className="gap-2">
            <X className="h-4 w-4" />
            Đã hiểu, đóng lại
          </Button>
        </div>
      </div>
    </div>
  )
}
