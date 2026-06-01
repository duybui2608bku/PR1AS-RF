"use client"

import * as React from "react"

import { getChatSocket } from "@/lib/chat-socket"
import { useAuthStore, useHasHydrated } from "@/lib/store/auth-store"
import { localizeServerMessage } from "@/lib/utils/error-handler"

export type ChatSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export function useChatSocket() {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useHasHydrated()
  const [status, setStatus] = React.useState<ChatSocketStatus>("idle")
  const [error, setError] = React.useState<string | null>(null)
  // Chờ Zustand hydrate từ sessionStorage trước khi tạo socket.
  // Nếu tạo socket trước khi biết auth state thật, useNotificationSocket có thể
  // disconnect socket singleton trong cùng render cycle → socket phải tạo lại.
  const socket = React.useMemo(
    () => (hasHydrated && isAuthenticated ? getChatSocket(token) : null),
    [hasHydrated, token, isAuthenticated]
  )

  React.useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      setStatus("connected")
      setError(null)
    }

    const handleDisconnect = () => {
      setStatus("disconnected")
    }

    const handleConnectError = (connectError: Error) => {
      setStatus("error")
      setError(
        localizeServerMessage(connectError.message, "Không thể kết nối trò chuyện.")
      )
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("connect_error", handleConnectError)

    if (!socket.connected) {
      socket.connect()
    }

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("connect_error", handleConnectError)
      // Không disconnect ở đây — useNotificationSocket (luôn mount trong header)
      // quản lý vòng đời kết nối socket và ngắt khi user logout
    }
  }, [socket])

  const effectiveStatus: ChatSocketStatus = !isAuthenticated
    ? "idle"
    : socket?.connected
      ? "connected"
      : status === "idle"
        ? "connecting"
        : status

  return {
    socket,
    status: effectiveStatus,
    error: isAuthenticated ? error : null,
    isConnected: effectiveStatus === "connected",
  }
}
