"use client"

import * as React from "react"

import { disconnectChatSocket, getChatSocket } from "@/lib/chat-socket"
import { useAuthStore } from "@/lib/store/auth-store"

export type ChatSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export function useChatSocket() {
  const token = useAuthStore((s) => s.token)
  const [status, setStatus] = React.useState<ChatSocketStatus>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const socket = React.useMemo(
    () => (token ? getChatSocket(token) : null),
    [token]
  )

  React.useEffect(() => {
    if (!socket) {
      disconnectChatSocket()
      return
    }

    const handleConnect = () => {
      setStatus("connected")
      setError(null)
    }

    const handleDisconnect = () => {
      setStatus("disconnected")
    }

    const handleConnectError = (connectError: Error) => {
      setStatus("error")
      setError(connectError.message)
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
      disconnectChatSocket()
    }
  }, [socket])

  const effectiveStatus: ChatSocketStatus = !token
    ? "idle"
    : socket?.connected
      ? "connected"
      : status === "idle"
        ? "connecting"
        : status

  return {
    socket,
    status: effectiveStatus,
    error: token ? error : null,
    isConnected: effectiveStatus === "connected",
  }
}
