"use client"

import * as React from "react"

import {
  disconnectChatSocket,
  getChatSocket,
  type ChatSocket,
} from "@/lib/chat-socket"
import { useAuthStore } from "@/lib/store/auth-store"

export type ChatSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"

export function useChatSocket() {
  const token = useAuthStore((s) => s.token)
  const [socket, setSocket] = React.useState<ChatSocket | null>(null)
  const [status, setStatus] = React.useState<ChatSocketStatus>("idle")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) {
      disconnectChatSocket()
      setSocket(null)
      setStatus("idle")
      return
    }

    const nextSocket = getChatSocket(token)
    setSocket(nextSocket)
    setStatus(nextSocket.connected ? "connected" : "connecting")
    setError(null)

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

    nextSocket.on("connect", handleConnect)
    nextSocket.on("disconnect", handleDisconnect)
    nextSocket.on("connect_error", handleConnectError)

    if (!nextSocket.connected) {
      nextSocket.connect()
    }

    return () => {
      nextSocket.off("connect", handleConnect)
      nextSocket.off("disconnect", handleDisconnect)
      nextSocket.off("connect_error", handleConnectError)
      disconnectChatSocket()
    }
  }, [token])

  return { socket, status, error, isConnected: status === "connected" }
}
