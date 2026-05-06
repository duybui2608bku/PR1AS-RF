"use client"

import * as React from "react"
import { Loader2, MessageSquare, Send, Users } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useGroupConversations,
  useGroupMessages,
  useSendGroupMessage,
  useMarkGroupMessagesRead,
} from "@/lib/hooks/use-chat"
import { useChatSocket } from "@/lib/hooks/use-chat-socket"
import { useAuthStore } from "@/lib/store/auth-store"
import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type {
  GroupChatConversation,
  GroupChatMessage,
} from "@/services/chat.service"

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function ConversationSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1 rounded-lg p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <Skeleton className="h-10 w-48 rounded-2xl" />
        </div>
      ))}
    </div>
  )
}

function ConversationItem({
  conv,
  selected,
  onClick,
}: {
  conv: GroupChatConversation
  selected: boolean
  onClick: () => void
}) {
  const lastMsg = conv.last_message_data
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/60 ${
        selected ? "bg-muted" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {conv.name || `Tranh chấp #${conv._id.slice(-6)}`}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {lastMsg ? lastMsg.content : "Chưa có tin nhắn"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {lastMsg && (
            <span className="text-[10px] whitespace-nowrap text-muted-foreground">
              {formatTime(lastMsg.created_at)}
            </span>
          )}
          {(conv.unread_count ?? 0) > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {conv.unread_count}
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Users className="size-3" />
        <span>{conv.members.length} thành viên</span>
      </div>
    </button>
  )
}

function ChatMessages({
  conversationGroupId,
  currentUserId,
  socketMessages,
}: {
  conversationGroupId: string
  currentUserId: string
  socketMessages: GroupChatMessage[]
}) {
  const messagesQuery = useGroupMessages(conversationGroupId, { limit: 100 })
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const fetchedMessages = messagesQuery.data?.messages ?? []
  const socketIds = new Set(socketMessages.map((m) => m._id))
  const allMessages = [
    ...fetchedMessages.filter((m) => !socketIds.has(m._id)),
    ...socketMessages,
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [allMessages.length])

  if (messagesQuery.isLoading) return <MessageSkeleton />

  if (allMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {allMessages.map((msg) => {
        const isMe = msg.sender_id === currentUserId
        return (
          <div
            key={msg._id}
            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                isMe
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {!isMe && (
                <p className="mb-1 text-[10px] font-semibold opacity-60">
                  {msg.sender_id.slice(-8)}
                </p>
              )}
              <p className="break-words whitespace-pre-wrap">{msg.content}</p>
              <p
                className={`mt-1 text-right text-[10px] ${
                  isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export default function AdminDisputesPage() {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id ?? "")
  const { socket } = useChatSocket()

  const [selectedConvId, setSelectedConvId] = React.useState<string | null>(
    null
  )
  const [selectedConv, setSelectedConv] =
    React.useState<GroupChatConversation | null>(null)
  const [input, setInput] = React.useState("")
  const [socketMessages, setSocketMessages] = React.useState<
    GroupChatMessage[]
  >([])
  const prevConvIdRef = React.useRef<string | null>(null)

  const conversationsQuery = useGroupConversations({ limit: 50 })
  const sendMessageMutation = useSendGroupMessage()
  const markReadMutation = useMarkGroupMessagesRead()

  const conversations = conversationsQuery.data?.conversations ?? []

  React.useEffect(() => {
    if (!socket) return

    const handler = (payload: {
      message: GroupChatMessage
      conversation: GroupChatConversation
    }) => {
      if (payload.conversation._id !== selectedConvId) return
      setSocketMessages((prev) => {
        if (prev.find((m) => m._id === payload.message._id)) return prev
        return [...prev, payload.message]
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.groupConversationsRoot,
      })
    }

    socket.on("new_message", handler as never)
    return () => {
      socket.off("new_message", handler as never)
    }
  }, [socket, selectedConvId, queryClient])

  React.useEffect(() => {
    if (!socket) return

    if (prevConvIdRef.current && prevConvIdRef.current !== selectedConvId) {
      socket.emit("leave_group_conversation", {
        conversation_group_id: prevConvIdRef.current,
      })
    }

    if (selectedConvId) {
      socket.emit("join_group_conversation", {
        conversation_group_id: selectedConvId,
      })
      markReadMutation.mutate({ conversation_group_id: selectedConvId })
    }

    prevConvIdRef.current = selectedConvId
  }, [socket, selectedConvId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectConversation = (conv: GroupChatConversation) => {
    if (conv._id === selectedConvId) return
    setSelectedConvId(conv._id)
    setSelectedConv(conv)
    setSocketMessages([])
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || !selectedConv) return
    setInput("")
    try {
      await sendMessageMutation.mutateAsync({
        booking_id: selectedConv.booking_id,
        type: "text",
        content: text,
      })
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể gửi tin nhắn."))
      setInput(text)
    }
  }

  return (
    <div className="flex h-[calc(100svh-6rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat tranh chấp</h1>
        <p className="text-sm text-muted-foreground">
          Giải quyết các tranh chấp booking đang mở.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-background shadow-sm">
        {/* Left — conversation list */}
        <aside className="flex w-72 shrink-0 flex-col border-r">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Các cuộc tranh chấp
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversationsQuery.isLoading ? (
              <ConversationSkeleton />
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Không có tranh chấp nào.
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conv={conv}
                  selected={selectedConvId === conv._id}
                  onClick={() => handleSelectConversation(conv)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Right — chat panel */}
        {selectedConvId && selectedConv ? (
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b px-5 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
                <MessageSquare className="size-4 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {selectedConv.name ||
                    `Tranh chấp #${selectedConv._id.slice(-6)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Booking ID: {selectedConv.booking_id.slice(-8)} &middot;{" "}
                  {selectedConv.members.length} thành viên
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <ChatMessages
                conversationGroupId={selectedConvId}
                currentUserId={currentUserId}
                socketMessages={socketMessages}
              />
            </div>

            {/* Send input */}
            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 border-t px-4 py-3"
            >
              <input
                className="flex-1 rounded-xl border bg-muted/40 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                placeholder="Nhập tin nhắn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e as unknown as React.FormEvent)
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || sendMessageMutation.isPending}
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <MessageSquare className="size-12 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Chọn một cuộc tranh chấp
              </p>
              <p className="text-xs text-muted-foreground">
                để xem và trả lời tin nhắn
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
