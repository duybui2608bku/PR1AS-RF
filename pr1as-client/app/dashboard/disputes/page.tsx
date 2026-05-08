"use client"

import * as React from "react"
import { AlertCircle, Loader2, MessageSquare, Send, Users } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  useGroupConversations,
  useGroupMessages,
  useMarkGroupMessagesRead,
  useSendGroupMessage,
} from "@/lib/hooks/use-chat"
import { useChatSocket } from "@/lib/hooks/use-chat-socket"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type {
  GroupChatConversation,
  GroupChatMessage,
} from "@/services/chat.service"

const EMPTY_CONVERSATIONS: GroupChatConversation[] = []
const EMPTY_MESSAGES: GroupChatMessage[] = []

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function getConversationName(conversation: GroupChatConversation) {
  return conversation.name || `Tranh chấp #${conversation._id.slice(-6)}`
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <Skeleton className="h-11 w-52 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Empty className="h-full min-h-56 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquare className="size-4" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ConversationItem({
  conversation,
  selected,
  onSelect,
}: {
  conversation: GroupChatConversation
  selected: boolean
  onSelect: () => void
}) {
  const lastMessage = conversation.last_message_data
  const unreadCount = conversation.unread_count ?? 0

  return (
    <Button
      type="button"
      variant={selected ? "outline" : "ghost"}
      onClick={onSelect}
      className="h-auto w-full justify-start rounded-lg px-3 py-3 text-left"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {getConversationName(conversation)}
            </span>
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {lastMessage?.content || "Chưa có tin nhắn"}
            </span>
          </span>

          <span className="flex shrink-0 flex-col items-end gap-1">
            {lastMessage ? (
              <span className="text-[10px] font-normal text-muted-foreground">
                {formatTime(lastMessage.created_at)}
              </span>
            ) : null}
            {unreadCount > 0 ? (
              <Badge className="h-5 min-w-5 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            ) : null}
          </span>
        </span>

        <span className="flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground">
          <Users className="size-3" />
          {conversation.members.length} thành viên
        </span>
      </span>
    </Button>
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

  const allMessages = React.useMemo(() => {
    const fetchedMessages = messagesQuery.data?.messages ?? EMPTY_MESSAGES
    const socketMessageIds = new Set(
      socketMessages.map((message) => message._id)
    )

    return [
      ...fetchedMessages.filter(
        (message) => !socketMessageIds.has(message._id)
      ),
      ...socketMessages,
    ].sort(
      (left, right) =>
        new Date(left.created_at).getTime() -
        new Date(right.created_at).getTime()
    )
  }, [messagesQuery.data?.messages, socketMessages])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [allMessages.length])

  if (messagesQuery.isLoading) return <MessageSkeleton />

  if (messagesQuery.isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Không tải được tin nhắn</AlertTitle>
          <AlertDescription>
            {getErrorMessage(messagesQuery.error, "Vui lòng thử lại sau.")}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (allMessages.length === 0) {
    return (
      <EmptyState
        title="Chưa có tin nhắn"
        description="Cuộc tranh chấp này chưa có trao đổi nào."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {allMessages.map((message) => {
        const isCurrentUser = message.sender_id === currentUserId

        return (
          <div
            key={message._id}
            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(70%,42rem)] rounded-xl px-4 py-2 text-sm shadow-xs ${
                isCurrentUser
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card text-card-foreground"
              }`}
            >
              {!isCurrentUser ? (
                <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                  {message.sender_id.slice(-8)}
                </p>
              ) : null}
              <p className="break-words whitespace-pre-wrap">
                {message.content}
              </p>
              <p
                className={`mt-1 text-right text-[10px] ${
                  isCurrentUser
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
              >
                {formatTime(message.created_at)}
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
  const currentUserId = useAuthStore((state) => state.user?.id ?? "")
  const { socket } = useChatSocket()

  const [selectedConversationId, setSelectedConversationId] = React.useState<
    string | null
  >(null)
  const [input, setInput] = React.useState("")
  const [socketMessages, setSocketMessages] = React.useState<
    GroupChatMessage[]
  >([])
  const previousConversationIdRef = React.useRef<string | null>(null)
  const markedConversationIdRef = React.useRef<string | null>(null)

  const conversationsQuery = useGroupConversations({ limit: 50 })
  const sendMessageMutation = useSendGroupMessage()
  const { mutate: markGroupMessagesRead } = useMarkGroupMessagesRead()

  const conversations =
    conversationsQuery.data?.conversations ?? EMPTY_CONVERSATIONS
  const selectedConversation = React.useMemo(
    () =>
      conversations.find(
        (conversation) => conversation._id === selectedConversationId
      ) ?? null,
    [conversations, selectedConversationId]
  )

  React.useEffect(() => {
    if (!socket) return

    const handler = (payload: {
      message: GroupChatMessage
      conversation: GroupChatConversation
    }) => {
      if (payload.conversation._id !== selectedConversationId) return

      setSocketMessages((previousMessages) => {
        if (
          previousMessages.some(
            (message) => message._id === payload.message._id
          )
        ) {
          return previousMessages
        }

        return [...previousMessages, payload.message]
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.groupConversationsRoot,
      })

      if (payload.message.sender_id !== currentUserId) {
        markGroupMessagesRead({
          conversation_group_id: payload.conversation._id,
        })
      }
    }

    socket.on("new_message", handler as never)
    return () => {
      socket.off("new_message", handler as never)
    }
  }, [
    currentUserId,
    markGroupMessagesRead,
    queryClient,
    selectedConversationId,
    socket,
  ])

  React.useEffect(() => {
    if (!socket) return

    if (
      previousConversationIdRef.current &&
      previousConversationIdRef.current !== selectedConversationId
    ) {
      socket.emit("leave_group_conversation", {
        conversation_group_id: previousConversationIdRef.current,
      })
    }

    if (selectedConversationId) {
      socket.emit("join_group_conversation", {
        conversation_group_id: selectedConversationId,
      })

      if (markedConversationIdRef.current !== selectedConversationId) {
        markedConversationIdRef.current = selectedConversationId
        markGroupMessagesRead({ conversation_group_id: selectedConversationId })
      }
    }

    previousConversationIdRef.current = selectedConversationId
  }, [socket, selectedConversationId, markGroupMessagesRead])

  const handleSelectConversation = React.useCallback(
    (conversation: GroupChatConversation) => {
      if (conversation._id === selectedConversationId) return
      setSelectedConversationId(conversation._id)
      markedConversationIdRef.current = null
      setSocketMessages([])
    },
    [selectedConversationId]
  )

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()

    const text = input.trim()
    if (!text || !selectedConversation) return

    setInput("")
    try {
      await sendMessageMutation.mutateAsync({
        booking_id: selectedConversation.booking_id,
        type: "text",
        content: text,
      })
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể gửi tin nhắn."))
      setInput(text)
    }
  }

  return (
    <div className="flex h-[calc(100svh-6rem)] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Chat tranh chấp</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Giải quyết các tranh chấp booking đang mở.
        </p>
      </div>

      <Card className="grid min-h-0 flex-1 overflow-hidden rounded-lg lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col border-b lg:border-r lg:border-b-0">
          <CardHeader className="space-y-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm">Cuộc tranh chấp</CardTitle>
                <CardDescription>
                  {conversations.length} cuộc hội thoại
                </CardDescription>
              </div>
              <Badge variant="outline">{conversations.length}</Badge>
            </div>
          </CardHeader>
          <Separator />

          <ScrollArea className="min-h-0 flex-1">
            {conversationsQuery.isLoading ? (
              <ConversationSkeleton />
            ) : conversationsQuery.isError ? (
              <div className="p-3">
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Không tải được danh sách</AlertTitle>
                  <AlertDescription>
                    {getErrorMessage(
                      conversationsQuery.error,
                      "Vui lòng thử lại sau."
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                title="Không có tranh chấp"
                description="Hiện chưa có cuộc hội thoại tranh chấp nào."
              />
            ) : (
              <div className="space-y-2 p-3">
                {conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation._id}
                    conversation={conversation}
                    selected={selectedConversationId === conversation._id}
                    onSelect={() => handleSelectConversation(conversation)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </section>

        {selectedConversationId && selectedConversation ? (
          <section className="flex min-h-0 flex-col">
            <CardHeader className="flex-row items-center gap-3 space-y-0 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                <MessageSquare className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  {getConversationName(selectedConversation)}
                </CardTitle>
                <CardDescription className="truncate">
                  Booking #{selectedConversation.booking_id.slice(-8)}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Users className="size-3" />
                {selectedConversation.members.length}
              </Badge>
            </CardHeader>
            <Separator />

            <ScrollArea className="min-h-0 flex-1">
              <ChatMessages
                conversationGroupId={selectedConversationId}
                currentUserId={currentUserId}
                socketMessages={socketMessages}
              />
            </ScrollArea>

            <Separator />
            <CardContent className="p-3">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <Textarea
                  className="min-h-10 flex-1 resize-none rounded-lg"
                  placeholder="Nhập tin nhắn..."
                  rows={1}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || sendMessageMutation.isPending}
                  className="size-10 shrink-0 rounded-lg"
                  aria-label="Gửi tin nhắn"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </section>
        ) : (
          <EmptyState
            title="Chọn một cuộc tranh chấp"
            description="Chọn hội thoại ở danh sách bên trái để xem và trả lời tin nhắn."
          />
        )}
      </Card>
    </div>
  )
}
