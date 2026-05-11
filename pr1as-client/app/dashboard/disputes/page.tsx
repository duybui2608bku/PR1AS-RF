"use client"

import * as React from "react"
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Send,
  Users,
} from "lucide-react"
import Image from "next/image"
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
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type {
  GroupChatConversation,
  GroupChatMember,
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

function formatConversationTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getMemberName(member?: GroupChatMember | null) {
  return member?.full_name || member?.email || "Thành viên"
}

function isAdminMember(member?: GroupChatMember | null) {
  return member?.roles.includes("admin") ?? false
}

function getConversationMembers(conversation: GroupChatConversation) {
  const members = conversation.members_data ?? []
  if (members.length === 0) return `${conversation.members.length} thành viên`
  return members.map(getMemberName).join(", ")
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

function MemberAvatarStack({ members }: { members?: GroupChatMember[] }) {
  const visibleMembers = (members ?? [])
    .filter((member) => !isAdminMember(member))
    .slice(0, 3)

  if (visibleMembers.length === 0) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
        N
      </span>
    )
  }

  return (
    <span className="flex h-9 w-11 shrink-0 items-center">
      {visibleMembers.map((member, index) => {
        const name = getMemberName(member)

        return member.avatar ? (
          <Image
            key={member._id}
            src={member.avatar}
            alt={name}
            width={28}
            height={28}
            className={cn(
              "size-7 rounded-full border-2 border-background object-cover shadow-xs",
              index > 0 && "-ml-3"
            )}
          />
        ) : (
          <span
            key={member._id}
            className={cn(
              "flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold shadow-xs",
              index > 0 && "-ml-3"
            )}
          >
            {name.trim().charAt(0).toUpperCase() || "N"}
          </span>
        )
      })}
    </span>
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
  const lastMessagePreview = lastMessage?.content || "Chưa có tin nhắn"
  const updatedAt = lastMessage?.created_at ?? conversation.updated_at

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 items-start gap-3 overflow-hidden border-b px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-4",
        selected && "bg-muted/70"
      )}
    >
      <MemberAvatarStack members={conversation.members_data} />
      <span className="w-0 min-w-0 flex-1 overflow-hidden">
        <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_3rem] items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm leading-5 font-semibold">
              {getConversationName(conversation)}
            </span>
            <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">
              {lastMessagePreview}
            </span>
          </span>

          <span className="flex w-12 shrink-0 flex-col items-end gap-1 pt-0.5">
            <span className="text-[10px] leading-3 text-muted-foreground">
              {formatConversationTime(updatedAt)}
            </span>
            {unreadCount > 0 ? (
              <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            ) : null}
          </span>
        </span>

        <span className="mt-2 flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden text-[11px] leading-4 text-muted-foreground">
          <Users className="size-3 shrink-0" />
          <span className="block min-w-0 truncate">
            {getConversationMembers(conversation)}
          </span>
        </span>
      </span>
    </button>
  )
}

function BookingSummary({
  conversation,
}: {
  conversation: GroupChatConversation
}) {
  const booking = conversation.booking_data
  if (!booking) return null

  return (
    <div className="border-b bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            Booking {booking.service_code}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatTime(booking.schedule.start_time)} -{" "}
            {formatTime(booking.schedule.end_time)}
          </p>
        </div>
        <Badge variant="outline">{booking.status}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p className="truncate">Client: {getMemberName(booking.client)}</p>
        <p className="truncate">Worker: {getMemberName(booking.worker)}</p>
      </div>
      {booking.dispute ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Lý do: {booking.dispute.reason}</p>
          <p className="mt-1 line-clamp-2">{booking.dispute.description}</p>
        </div>
      ) : null}
    </div>
  )
}

function ChatMessages({
  conversation,
  conversationGroupId,
  currentUserId,
  socketMessages,
}: {
  conversation: GroupChatConversation
  conversationGroupId: string
  currentUserId: string
  socketMessages: GroupChatMessage[]
}) {
  const messagesQuery = useGroupMessages(conversationGroupId, { limit: 100 })
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const memberMap = React.useMemo(
    () =>
      new Map(
        (conversation.members_data ?? []).map((member) => [member._id, member])
      ),
    [conversation.members_data]
  )

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
        const sender = memberMap.get(message.sender_id)
        const senderIsAdmin = isAdminMember(sender)

        return (
          <div
            key={message._id}
            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(86%,42rem)] rounded-xl px-3 py-2 text-sm shadow-xs sm:max-w-[min(70%,42rem)] sm:px-4 ${
                isCurrentUser
                  ? "bg-primary text-primary-foreground"
                  : senderIsAdmin
                    ? "border border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                    : "border bg-card text-card-foreground"
              }`}
            >
              {!isCurrentUser ? (
                <p
                  className={`mb-1 text-[10px] font-semibold ${
                    senderIsAdmin
                      ? "text-amber-700 dark:text-amber-200"
                      : "text-muted-foreground"
                  }`}
                >
                  {getMemberName(sender)}
                  {senderIsAdmin ? (
                    <span className="ml-2 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] text-amber-900 dark:bg-amber-800 dark:text-amber-50">
                      Admin
                    </span>
                  ) : null}
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
    <div className="flex h-[calc(100svh-7.5rem)] flex-col gap-3 md:h-[calc(100svh-6rem)] md:gap-4">
      <div className="flex flex-col gap-1">
        <p className="hidden text-sm text-muted-foreground sm:block">
          Giải quyết các tranh chấp booking đang mở.
        </p>
      </div>

      <Card className="grid min-h-0 flex-1 overflow-hidden rounded-lg lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          className={cn(
            "flex min-h-0 flex-col border-b lg:border-r lg:border-b-0",
            selectedConversationId && "max-lg:hidden"
          )}
        >
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
            <CardHeader className="flex-row items-center gap-2 space-y-0 p-3 sm:gap-3 sm:p-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-lg lg:hidden"
                onClick={() => setSelectedConversationId(null)}
                aria-label="Quay lai danh sach"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                <MessageSquare className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  {getConversationName(selectedConversation)}
                </CardTitle>
                <CardDescription className="truncate">
                  {getConversationMembers(selectedConversation)}
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="hidden gap-1 sm:inline-flex"
              >
                <Users className="size-3" />
                {selectedConversation.members.length}
              </Badge>
            </CardHeader>
            <Separator />

            <ScrollArea className="min-h-0 flex-1">
              <BookingSummary conversation={selectedConversation} />
              <ChatMessages
                conversation={selectedConversation}
                conversationGroupId={selectedConversationId}
                currentUserId={currentUserId}
                socketMessages={socketMessages}
              />
            </ScrollArea>

            <Separator />
            <CardContent className="p-2 sm:p-3">
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
          <div className="hidden min-h-0 lg:block">
            <EmptyState
              title="Chọn một cuộc tranh chấp"
              description="Chọn hội thoại ở danh sách bên trái để xem và trả lời tin nhắn."
            />
          </div>
        )}
      </Card>
    </div>
  )
}
