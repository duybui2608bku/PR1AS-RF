"use client"

import * as React from "react"
import { ShieldX } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { getChatSocket } from "@/lib/chat-socket"
import { clearSessionCookie } from "@/lib/auth/auth-cookie"
import { useAuthStore } from "@/lib/store/auth-store"

const COUNTDOWN_SECONDS = 10

export function BannedAccountModal() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const token = useAuthStore((s) => s.token)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()
  const [visible, setVisible] = React.useState(false)
  const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS)

  // Listen for account:banned socket event
  React.useEffect(() => {
    if (!isAuthenticated) return

    const socket = getChatSocket(token)

    const handleBanned = () => {
      setVisible(true)
      setCountdown(COUNTDOWN_SECONDS)
    }

    socket.on("account:banned", handleBanned)
    return () => {
      socket.off("account:banned", handleBanned)
    }
  }, [isAuthenticated, token])

  // Countdown timer — starts when modal becomes visible
  React.useEffect(() => {
    if (!visible) return

    if (countdown <= 0) {
      void (async () => {
        clearAuth()
        queryClient.clear()
        await clearSessionCookie()
        window.location.replace("/login")
      })()
      return
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [visible, countdown, clearAuth, queryClient])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 bg-red-50 px-6 py-5 dark:bg-red-950/40">
          <ShieldX className="h-7 w-7 shrink-0 text-red-500" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
              Thông báo từ quản trị viên
            </p>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Tài khoản bị khóa
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            Tài khoản của bạn vừa bị quản trị viên <span className="font-semibold text-red-500">khóa</span> do vi phạm điều khoản sử dụng.
          </p>
          <p>
            Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ bộ phận hỗ trợ để được giải quyết.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <p className="text-sm text-zinc-400">
            Tự động đăng xuất sau{" "}
            <span className="font-bold text-red-500">{countdown}s</span>
          </p>
          <button
            type="button"
            onClick={() => setCountdown(0)}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            Đăng xuất ngay
          </button>
        </div>
      </div>
    </div>
  )
}
