"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Inbox,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useChatSocket } from "@/lib/hooks/use-chat-socket"
import {
  useDirectConversation,
  useDirectConversations,
  useDirectMessages,
  useDeleteDirectMessage,
  useGroupConversation,
  useGroupConversations,
  useGroupMessages,
  useMarkDirectMessagesRead,
  useMarkGroupMessagesRead,
  useSendDirectMessage,
  useSendGroupMessage,
} from "@/lib/hooks/use-chat"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import type {
  ChatConversation,
  ChatMessage,
  DirectMessageListResult,
  GroupChatConversation,
  GroupChatMessage,
  GroupMessageListResult,
} from "@/services/chat.service"
import type {
  ChatMode,
  DirectReadPayload,
  GroupReadPayload,
  ServerToClientEvents,
} from "@/lib/chat-socket"

const CONVERSATION_PARAMS = { page: 1, limit: 50 } as const
const MESSAGE_PARAMS = { page: 1, limit: 50 } as const

type ChatPageProps = {
  initialMode?: ChatMode
  initialDirectConversationId?: string | null
  initialGroupConversationId?: string | null
}

type NewMessagePayload = Parameters<ServerToClientEvents["new_message"]>[0]

type ReplyTarget = {
  id: string
  senderId: string
  content: string
  type: "text" | "image" | "video" | "audio" | "file"
}

const isGroupMessage = (
  message: ChatMessage | GroupChatMessage
): message is GroupChatMessage => {
  return "conversation_group_id" in message
}

const getOtherUserId = (
  conversation: ChatConversation | null | undefined,
  currentUserId: string | undefined
) => {
  if (!conversation || !currentUserId) return ""
  return conversation.sender_id === currentUserId
    ? conversation.receiver_id
    : conversation.sender_id
}

const getDirectTitle = (conversation: ChatConversation | null | undefined) => {
  return (
    conversation?.other_user?.full_name ||
    conversation?.other_user?.email ||
    "Trò chuyện trực tiếp"
  )
}

const getDirectSubtitle = (
  conversation: ChatConversation | null | undefined,
  currentUserId: string | undefined
) => {
  return (
    conversation?.other_user?.email ||
    getOtherUserId(conversation, currentUserId) ||
    "Chưa chọn người nhận"
  )
}

const isImageUrl = (value: string) => {
  return /^https?:\/\/.+\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(value)
}

const getOutgoingMessageType = (value: string) => {
  return isImageUrl(value.trim()) ? "image" : "text"
}

const getMessagePreview = (message?: ChatMessage | GroupChatMessage | null) => {
  if (!message) return "Chưa có tin nhắn"
  if (message.is_deleted) return "Tin nhắn đã xóa"
  if (message.type === "image") return "Ảnh"
  return message.content
}

const getReplyTargetFromMessage = (
  message: ChatMessage | GroupChatMessage
): ReplyTarget => ({
  id: message._id,
  senderId: message.sender_id,
  content: getMessagePreview(message),
  type: message.type,
})

const getMessageById = (
  messages: Array<ChatMessage | GroupChatMessage>,
  messageId?: string | null
) => {
  if (!messageId) return undefined
  return messages.find((message) => message._id === messageId)
}

const shouldHighlightDirectConversation = (
  conversation: ChatConversation,
  currentUserId?: string
) => {
  const lastMessage = conversation.last_message_data
  return Boolean(
    lastMessage &&
    lastMessage.sender_id === currentUserId &&
    !lastMessage.is_read
  )
}

const formatTime = (value?: string | null) => {
  if (!value) return ""
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

const shortenId = (value?: string | null) => {
  if (!value) return "-"
  return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value
}

const appendDirectMessage = (
  current: DirectMessageListResult | undefined,
  message: ChatMessage
) => {
  if (!current) return current
  if (current.messages.some((item) => item._id === message._id)) return current

  return {
    ...current,
    messages: [...current.messages, message],
    total: Math.max(current.total, current.messages.length + 1),
  }
}

const appendGroupMessage = (
  current: GroupMessageListResult | undefined,
  message: GroupChatMessage
) => {
  if (!current) return current
  if (current.messages.some((item) => item._id === message._id)) return current

  return {
    ...current,
    messages: [...current.messages, message],
    total: Math.max(current.total, current.messages.length + 1),
  }
}

const markDirectMessagesRead = (
  current: DirectMessageListResult | undefined,
  payload: DirectReadPayload
) => {
  if (!current) return current

  return {
    ...current,
    messages: current.messages.map((message) => {
      if (
        message.conversation_id !== payload.conversation_id ||
        message.receiver_id !== payload.read_by
      ) {
        return message
      }

      return {
        ...message,
        is_read: true,
        read_at: payload.read_at,
      }
    }),
  }
}

const markGroupMessagesRead = (
  current: GroupMessageListResult | undefined,
  payload: GroupReadPayload
) => {
  if (!current) return current

  return {
    ...current,
    messages: current.messages.map((message) => {
      if (message.conversation_group_id !== payload.conversation_group_id) {
        return message
      }

      if (message.read_by.some((read) => read.user_id === payload.read_by)) {
        return message
      }

      return {
        ...message,
        read_by: [
          ...message.read_by,
          { user_id: payload.read_by, read_at: payload.read_at },
        ],
      }
    }),
  }
}

const removeDeletedDirectMessage = (
  current: DirectMessageListResult | undefined,
  payload: { message_id: string; conversation_id: string }
) => {
  if (!current) return current

  return {
    ...current,
    messages: current.messages.filter(
      (message) => message._id !== payload.message_id
    ),
  }
}

export function ChatPage({
  initialMode = "direct",
  initialDirectConversationId = null,
  initialGroupConversationId = null,
}: ChatPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [mode, setMode] = React.useState<ChatMode>(initialMode)
  const [selectedDirectId, setSelectedDirectId] = React.useState<string | null>(
    initialDirectConversationId
  )
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(
    initialGroupConversationId
  )
  const [isNewDirectOpen, setIsNewDirectOpen] = React.useState(false)
  const [receiverId, setReceiverId] = React.useState("")
  const [draft, setDraft] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [mobileThreadOpen, setMobileThreadOpen] = React.useState(
    Boolean(initialDirectConversationId || initialGroupConversationId)
  )
  const [replyTarget, setReplyTarget] = React.useState<ReplyTarget | null>(null)
  const [typingByRoom, setTypingByRoom] = React.useState<
    Record<string, string>
  >({})
  const messageScrollerRef = React.useRef<HTMLDivElement | null>(null)
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const typingClearTimersRef = React.useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({})

  const { socket } = useChatSocket()
  const directConversationsQuery = useDirectConversations(CONVERSATION_PARAMS)
  const groupConversationsQuery = useGroupConversations(CONVERSATION_PARAMS)
  const directConversations = directConversationsQuery.data?.conversations ?? []
  const groupConversations = groupConversationsQuery.data?.conversations ?? []

  const selectedDirectFromList = isNewDirectOpen
    ? undefined
    : directConversations.find(
        (conversation) => conversation._id === selectedDirectId
      )
  const selectedGroupFromList = groupConversations.find(
    (conversation) => conversation._id === selectedGroupId
  )
  const directConversationQuery = useDirectConversation(
    selectedDirectFromList || isNewDirectOpen
      ? undefined
      : (selectedDirectId ?? undefined)
  )
  const groupConversationQuery = useGroupConversation(
    selectedGroupFromList ? undefined : (selectedGroupId ?? undefined)
  )
  const selectedDirect = isNewDirectOpen
    ? null
    : (selectedDirectFromList ?? directConversationQuery.data ?? null)
  const selectedGroup =
    selectedGroupFromList ?? groupConversationQuery.data ?? null

  const directMessagesQuery = useDirectMessages(
    mode === "direct" && !isNewDirectOpen
      ? (selectedDirectId ?? undefined)
      : undefined,
    MESSAGE_PARAMS
  )
  const groupMessagesQuery = useGroupMessages(
    mode === "group" ? (selectedGroupId ?? undefined) : undefined,
    MESSAGE_PARAMS
  )
  const directMessages = directMessagesQuery.data?.messages ?? []
  const groupMessages = groupMessagesQuery.data?.messages ?? []
  const activeMessages = mode === "direct" ? directMessages : groupMessages
  const activeConversationId =
    mode === "direct" && !isNewDirectOpen ? selectedDirectId : selectedGroupId

  const sendDirectMessageMutation = useSendDirectMessage()
  const sendGroupMessageMutation = useSendGroupMessage()
  const markDirectReadMutation = useMarkDirectMessagesRead()
  const markGroupReadMutation = useMarkGroupMessagesRead()
  const deleteDirectMessageMutation = useDeleteDirectMessage()

  const filteredDirectConversations = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return directConversations

    return directConversations.filter((conversation) => {
      const title = getDirectTitle(conversation).toLowerCase()
      const subtitle = getDirectSubtitle(conversation, user?.id).toLowerCase()
      return title.includes(term) || subtitle.includes(term)
    })
  }, [directConversations, search, user?.id])

  const filteredGroupConversations = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return groupConversations

    return groupConversations.filter((conversation) => {
      return (
        conversation.name.toLowerCase().includes(term) ||
        conversation.booking_id.toLowerCase().includes(term)
      )
    })
  }, [groupConversations, search])

  const activeTypingRoom = activeConversationId
    ? `${mode}:${activeConversationId}`
    : ""
  const activeTypingUser = activeTypingRoom
    ? typingByRoom[activeTypingRoom]
    : undefined
  const directReceiverId = selectedDirect
    ? getOtherUserId(selectedDirect, user?.id)
    : receiverId.trim()
  const canSubmitDirect =
    mode === "direct" && Boolean(directReceiverId && draft.trim())
  const canSubmitGroup =
    mode === "group" && Boolean(selectedGroup?.booking_id && draft.trim())
  const isSending =
    sendDirectMessageMutation.isPending || sendGroupMessageMutation.isPending
  const activeTitle =
    mode === "direct"
      ? isNewDirectOpen
        ? "Tin nhắn mới"
        : getDirectTitle(selectedDirect)
      : selectedGroup?.name || "Nhóm trò chuyện"
  const activeSubtitle =
    mode === "direct"
      ? isNewDirectOpen
        ? "Nhập ID người nhận để bắt đầu"
        : getDirectSubtitle(selectedDirect, user?.id)
      : selectedGroup
        ? `Đơn ${shortenId(selectedGroup.booking_id)}`
        : "Chưa chọn nhóm"
  const hasActiveThread = Boolean(activeConversationId || isNewDirectOpen)

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  React.useEffect(() => {
    if (
      mode !== "direct" ||
      selectedDirectId ||
      isNewDirectOpen ||
      directConversations.length === 0
    )
      return
    setSelectedDirectId(directConversations[0]._id)
  }, [directConversations, isNewDirectOpen, mode, selectedDirectId])

  React.useEffect(() => {
    if (mode !== "group" || selectedGroupId || groupConversations.length === 0)
      return
    setSelectedGroupId(groupConversations[0]._id)
  }, [groupConversations, mode, selectedGroupId])

  React.useEffect(() => {
    if (!socket || mode !== "direct" || !selectedDirectId || isNewDirectOpen)
      return
    socket.emit("join_conversation", { conversation_id: selectedDirectId })

    return () => {
      socket.emit("leave_conversation", { conversation_id: selectedDirectId })
    }
  }, [isNewDirectOpen, mode, selectedDirectId, socket])

  React.useEffect(() => {
    if (!socket || mode !== "group" || !selectedGroupId) return
    socket.emit("join_group_conversation", {
      conversation_group_id: selectedGroupId,
    })

    return () => {
      socket.emit("leave_group_conversation", {
        conversation_group_id: selectedGroupId,
      })
    }
  }, [mode, selectedGroupId, socket])

  const setTyping = React.useCallback(
    (roomKey: string, nextUserId: string, isTypingNow: boolean) => {
      const existingTimer = typingClearTimersRef.current[roomKey]
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      if (!isTypingNow) {
        setTypingByRoom((current) => {
          const next = { ...current }
          delete next[roomKey]
          return next
        })
        return
      }

      setTypingByRoom((current) => ({ ...current, [roomKey]: nextUserId }))
      typingClearTimersRef.current[roomKey] = setTimeout(() => {
        setTypingByRoom((current) => {
          const next = { ...current }
          delete next[roomKey]
          return next
        })
      }, 2500)
    },
    []
  )

  React.useEffect(() => {
    if (!socket) return

    const handleNewMessage = (payload: NewMessagePayload) => {
      const { message } = payload

      if (isGroupMessage(message)) {
        queryClient.setQueryData<GroupMessageListResult>(
          queryKeys.chat.groupMessages(
            message.conversation_group_id,
            MESSAGE_PARAMS
          ),
          (current) => appendGroupMessage(current, message)
        )
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.groupConversationsRoot,
        })

        if (
          message.conversation_group_id === selectedGroupId &&
          message.sender_id !== user?.id
        ) {
          socket.emit("mark_group_read", {
            conversation_group_id: message.conversation_group_id,
          })
        }
        return
      }

      queryClient.setQueryData<DirectMessageListResult>(
        queryKeys.chat.directMessages(message.conversation_id, MESSAGE_PARAMS),
        (current) => appendDirectMessage(current, message)
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directConversationsRoot,
      })

      if (
        message.conversation_id === selectedDirectId &&
        message.receiver_id === user?.id
      ) {
        socket.emit("mark_read", { conversation_id: message.conversation_id })
      }
    }

    const handleDeletedMessage = (payload: {
      message_id: string
      conversation_id: string
    }) => {
      queryClient.setQueryData<DirectMessageListResult>(
        queryKeys.chat.directMessages(payload.conversation_id, MESSAGE_PARAMS),
        (current) => removeDeletedDirectMessage(current, payload)
      )
    }

    const handleDirectRead = (payload: DirectReadPayload) => {
      queryClient.setQueryData<DirectMessageListResult>(
        queryKeys.chat.directMessages(payload.conversation_id, MESSAGE_PARAMS),
        (current) => markDirectMessagesRead(current, payload)
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directConversationsRoot,
      })
    }

    const handleGroupRead = (payload: GroupReadPayload) => {
      queryClient.setQueryData<GroupMessageListResult>(
        queryKeys.chat.groupMessages(
          payload.conversation_group_id,
          MESSAGE_PARAMS
        ),
        (current) => markGroupMessagesRead(current, payload)
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.groupConversationsRoot,
      })
    }

    const handleMessageRead = (
      payload: DirectReadPayload | GroupReadPayload
    ) => {
      if ("conversation_group_id" in payload) {
        handleGroupRead(payload)
        return
      }

      handleDirectRead(payload)
    }

    const handleTyping = (payload: {
      conversation_id: string
      user_id: string
      is_typing: boolean
    }) => {
      if (payload.user_id === user?.id) return
      setTyping(
        `direct:${payload.conversation_id}`,
        payload.user_id,
        payload.is_typing
      )
    }

    const handleGroupTyping = (payload: {
      conversation_group_id: string
      user_id: string
      is_typing: boolean
    }) => {
      if (payload.user_id === user?.id) return
      setTyping(
        `group:${payload.conversation_group_id}`,
        payload.user_id,
        payload.is_typing
      )
    }

    const handleSocketError = (payload: { message?: string } | Error) => {
      toast.error(payload.message ?? "Không thể kết nối trò chuyện.")
    }

    socket.on("new_message", handleNewMessage)
    socket.on("message_deleted", handleDeletedMessage)
    socket.on("message_read", handleMessageRead)
    socket.on("messages_read", handleDirectRead)
    socket.on("group_messages_read", handleGroupRead)
    socket.on("user_typing", handleTyping)
    socket.on("group_user_typing", handleGroupTyping)
    socket.on("error", handleSocketError)

    return () => {
      socket.off("new_message", handleNewMessage)
      socket.off("message_deleted", handleDeletedMessage)
      socket.off("message_read", handleMessageRead)
      socket.off("messages_read", handleDirectRead)
      socket.off("group_messages_read", handleGroupRead)
      socket.off("user_typing", handleTyping)
      socket.off("group_user_typing", handleGroupTyping)
      socket.off("error", handleSocketError)
    }
  }, [
    queryClient,
    selectedDirectId,
    selectedGroupId,
    setTyping,
    socket,
    user?.id,
  ])

  React.useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }

      Object.values(typingClearTimersRef.current).forEach((timer) =>
        clearTimeout(timer)
      )
    }
  }, [])

  React.useEffect(() => {
    setDraft("")
    setReplyTarget(null)
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }
  }, [mode, selectedDirectId, selectedGroupId])

  React.useEffect(() => {
    const scroller = messageScrollerRef.current
    if (!scroller) return
    scroller.scrollTo({ top: scroller.scrollHeight })
  }, [activeMessages.length, mode, selectedDirectId, selectedGroupId])

  React.useEffect(() => {
    if (
      mode !== "direct" ||
      isNewDirectOpen ||
      !selectedDirectId ||
      directMessages.length === 0
    )
      return

    const unreadIds = directMessages
      .filter((message) => message.receiver_id === user?.id && !message.is_read)
      .map((message) => message._id)

    if (unreadIds.length === 0) return

    if (socket?.connected) {
      socket.emit("mark_read", { conversation_id: selectedDirectId })
      return
    }

    markDirectReadMutation.mutate({ conversation_id: selectedDirectId })
  }, [
    directMessages,
    isNewDirectOpen,
    markDirectReadMutation,
    mode,
    selectedDirectId,
    socket,
    user?.id,
  ])

  React.useEffect(() => {
    if (mode !== "group" || !selectedGroupId || groupMessages.length === 0)
      return

    const unreadIds = groupMessages
      .filter(
        (message) =>
          message.sender_id !== user?.id &&
          !message.read_by.some((read) => read.user_id === user?.id)
      )
      .map((message) => message._id)

    if (unreadIds.length === 0) return

    if (socket?.connected) {
      socket.emit("mark_group_read", { conversation_group_id: selectedGroupId })
      return
    }

    markGroupReadMutation.mutate({ conversation_group_id: selectedGroupId })
  }, [
    groupMessages,
    markGroupReadMutation,
    mode,
    selectedGroupId,
    socket,
    user?.id,
  ])

  const emitTyping = React.useCallback(
    (isTypingNow: boolean) => {
      if (!socket) return

      if (mode === "direct" && selectedDirectId && !isNewDirectOpen) {
        socket.emit("typing", {
          conversation_id: selectedDirectId,
          is_typing: isTypingNow,
        })
      }

      if (mode === "group" && selectedGroupId) {
        socket.emit("group_typing", {
          conversation_group_id: selectedGroupId,
          is_typing: isTypingNow,
        })
      }
    },
    [isNewDirectOpen, mode, selectedDirectId, selectedGroupId, socket]
  )

  const handleDraftChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value)

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }

    if (!event.target.value.trim()) {
      emitTyping(false)
      return
    }

    emitTyping(true)
    typingTimerRef.current = setTimeout(() => emitTyping(false), 1200)
  }

  const handleRefresh = () => {
    directConversationsQuery.refetch()
    groupConversationsQuery.refetch()
    directMessagesQuery.refetch()
    groupMessagesQuery.refetch()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return

    try {
      if (mode === "direct") {
        if (!directReceiverId) {
          toast.error("Nhập ID người nhận trước khi gửi.")
          return
        }

        const result = await sendDirectMessageMutation.mutateAsync({
          receiver_id: directReceiverId,
          content,
          type: getOutgoingMessageType(content),
          reply_to_id: replyTarget?.id ?? null,
        })

        setSelectedDirectId(result.conversation._id)
        setIsNewDirectOpen(false)
        setReceiverId("")
        setDraft("")
        setReplyTarget(null)
        emitTyping(false)
        return
      }

      if (!selectedGroup?.booking_id) {
        toast.error("Chọn nhóm trò chuyện trước khi gửi.")
        return
      }

      const result = await sendGroupMessageMutation.mutateAsync({
        booking_id: selectedGroup.booking_id,
        content,
        type: getOutgoingMessageType(content),
        reply_to_id: replyTarget?.id ?? null,
      })

      setSelectedGroupId(result.conversation._id)
      setDraft("")
      setReplyTarget(null)
      emitTyping(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể gửi tin nhắn."
      toast.error(message)
    }
  }

  const handleDeleteDirectMessage = async (messageId: string) => {
    try {
      await deleteDirectMessageMutation.mutateAsync(messageId)
      if (selectedDirectId) {
        queryClient.setQueryData<DirectMessageListResult>(
          queryKeys.chat.directMessages(selectedDirectId, MESSAGE_PARAMS),
          (current) =>
            current
              ? {
                  ...current,
                  messages: current.messages.filter(
                    (message) => message._id !== messageId
                  ),
                }
              : current
        )
      }
      toast.success("Đã xóa tin nhắn.")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể xóa tin nhắn."
      toast.error(message)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background p-0 md:p-4">
      <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3 md:border-b-0 md:px-0 md:pt-0 md:pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tin nhắn</h1>
        </div>
        {/* <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={
              directConversationsQuery.isFetching ||
              groupConversationsQuery.isFetching
            }
          >
            {directConversationsQuery.isFetching ||
            groupConversationsQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div> */}
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden md:gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden border bg-card md:flex md:rounded-lg",
            mobileThreadOpen ? "hidden md:flex" : "flex"
          )}
        >
          <div className="border-b p-3">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
              <button
                type="button"
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                  mode === "direct"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setMode("direct")
                  setMobileThreadOpen(false)
                }}
              >
                <MessageCircle className="size-4" />
                Cá nhân
              </button>
              <button
                type="button"
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                  mode === "group"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  setMode("group")
                  setMobileThreadOpen(false)
                }}
              >
                <Users className="size-4" />
                Nhóm
              </button>
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Tìm cuộc trò chuyện"
              />
            </div>
            {mode === "direct" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full justify-start"
                onClick={() => {
                  setIsNewDirectOpen(true)
                  setSelectedDirectId(null)
                  setReceiverId("")
                  setMobileThreadOpen(true)
                }}
              >
                <Plus className="size-4" />
                Tin nhắn mới
              </Button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto">
            {mode === "direct" ? (
              <ConversationList
                type="direct"
                loading={directConversationsQuery.isLoading}
                conversations={filteredDirectConversations}
                selectedId={selectedDirectId}
                currentUserId={user?.id}
                onSelect={(id) => {
                  setIsNewDirectOpen(false)
                  setSelectedDirectId(id)
                  setMobileThreadOpen(true)
                }}
              />
            ) : (
              <ConversationList
                type="group"
                loading={groupConversationsQuery.isLoading}
                conversations={filteredGroupConversations}
                selectedId={selectedGroupId}
                currentUserId={user?.id}
                onSelect={(id) => {
                  setSelectedGroupId(id)
                  setMobileThreadOpen(true)
                }}
              />
            )}
          </div>
        </aside>

        <section
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden border bg-card md:flex md:rounded-lg",
            mobileThreadOpen ? "flex" : "hidden md:flex"
          )}
        >
          <div className="flex min-h-16 items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                onClick={() => setMobileThreadOpen(false)}
                aria-label="Quay lại danh sách"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <ThreadAvatar
                mode={mode}
                title={activeTitle}
                avatar={selectedDirect?.other_user?.avatar}
              />
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">
                  {activeTitle}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {activeSubtitle}
                </p>
              </div>
            </div>
            {activeConversationId ? (
              <Badge variant="outline">{activeMessages.length} tin nhắn</Badge>
            ) : (
              <Badge variant="outline">Chưa chọn</Badge>
            )}
          </div>

          <div
            ref={messageScrollerRef}
            className="flex-1 overflow-y-auto bg-muted/20 px-4 py-4"
          >
            <MessagePane
              mode={mode}
              loading={
                mode === "direct"
                  ? directMessagesQuery.isLoading
                  : groupMessagesQuery.isLoading
              }
              messages={activeMessages}
              currentUserId={user?.id}
              selectedConversationId={
                hasActiveThread ? (activeConversationId ?? "new") : null
              }
              directPeer={selectedDirect?.other_user}
              onReply={(message) =>
                setReplyTarget(getReplyTargetFromMessage(message))
              }
              onDeleteDirect={handleDeleteDirectMessage}
              deletingMessageId={
                deleteDirectMessageMutation.variables &&
                deleteDirectMessageMutation.isPending
                  ? deleteDirectMessageMutation.variables
                  : null
              }
            />
          </div>

          <div className="min-h-7 border-t bg-background px-4 py-1 text-xs text-muted-foreground">
            {activeTypingUser
              ? `${shortenId(activeTypingUser)} đang nhập...`
              : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3">
            {mode === "direct" && (isNewDirectOpen || !selectedDirect) ? (
              <div className="mb-2">
                <Input
                  value={receiverId}
                  onChange={(event) => setReceiverId(event.target.value)}
                  placeholder="ID người nhận"
                  disabled={isSending}
                />
              </div>
            ) : null}
            {replyTarget ? (
              <div className="mb-2 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <Reply className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Đang trả lời{" "}
                    {replyTarget.senderId === user?.id
                      ? "bạn"
                      : shortenId(replyTarget.senderId)}
                  </p>
                  <p className="truncate text-sm">{replyTarget.content}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setReplyTarget(null)}
                  aria-label="Bỏ trả lời"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={handleDraftChange}
                placeholder={
                  activeConversationId || mode === "direct"
                    ? "Nhập tin nhắn hoặc dán URL ảnh"
                    : "Chọn cuộc trò chuyện"
                }
                rows={1}
                disabled={isSending || (mode === "group" && !selectedGroup)}
                className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isSending || (!canSubmitDirect && !canSubmitGroup)}
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function ConversationList({
  type,
  loading,
  conversations,
  selectedId,
  currentUserId,
  onSelect,
}: {
  type: ChatMode
  loading: boolean
  conversations: ChatConversation[] | GroupChatConversation[]
  selectedId: string | null
  currentUserId?: string
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
        <Inbox className="size-9" />
        <p>Chưa có cuộc trò chuyện</p>
      </div>
    )
  }

  return (
    <div>
      {conversations.map((conversation) => {
        const isDirect = type === "direct"
        const directConversation = isDirect
          ? (conversation as ChatConversation)
          : null
        const groupConversation = isDirect
          ? null
          : (conversation as GroupChatConversation)
        const title = isDirect
          ? getDirectTitle(directConversation)
          : groupConversation?.name || "Nhóm trò chuyện"
        const subtitle = isDirect
          ? getDirectSubtitle(directConversation, currentUserId)
          : `Đơn ${shortenId(groupConversation?.booking_id)}`
        const lastMessage = isDirect
          ? getMessagePreview(directConversation?.last_message_data)
          : getMessagePreview(groupConversation?.last_message_data)
        const updatedAt = isDirect
          ? directConversation?.updated_at
          : groupConversation?.updated_at
        const unreadCount = isDirect
          ? directConversation?.unread_count
          : groupConversation?.unread_count
        const needsResponse =
          isDirect &&
          directConversation &&
          shouldHighlightDirectConversation(directConversation, currentUserId)

        return (
          <button
            key={conversation._id}
            type="button"
            className={cn(
              "flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-accent",
              selectedId === conversation._id && "bg-accent"
            )}
            onClick={() => onSelect(conversation._id)}
          >
            <ThreadAvatar
              mode={type}
              title={title}
              avatar={directConversation?.other_user?.avatar}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    needsResponse && "text-red-600"
                  )}
                >
                  {title}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatTime(updatedAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
              <p
                className={cn(
                  "mt-1 truncate text-xs text-muted-foreground",
                  needsResponse && "font-medium text-red-600"
                )}
              >
                {lastMessage}
              </p>
            </div>
            {unreadCount ? (
              <Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function ThreadAvatar({
  title,
  mode,
  avatar,
  className,
}: {
  title: string
  mode: ChatMode
  avatar?: string | null
  className?: string
}) {
  const initial =
    title.trim().charAt(0).toUpperCase() || (mode === "direct" ? "C" : "N")

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={title}
        className={cn("size-10 shrink-0 rounded-full object-cover", className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        mode === "direct"
          ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        className
      )}
    >
      {initial}
    </div>
  )
}

function MessagePane({
  mode,
  loading,
  messages,
  currentUserId,
  selectedConversationId,
  directPeer,
  onReply,
  onDeleteDirect,
  deletingMessageId,
}: {
  mode: ChatMode
  loading: boolean
  messages: Array<ChatMessage | GroupChatMessage>
  currentUserId?: string
  selectedConversationId: string | null
  directPeer?: ChatConversation["other_user"]
  onReply: (message: ChatMessage | GroupChatMessage) => void
  onDeleteDirect: (messageId: string) => void
  deletingMessageId: string | null
}) {
  if (!selectedConversationId) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <MessageCircle className="size-10" />
        <p>Chọn một cuộc trò chuyện để bắt đầu</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Inbox className="size-10" />
        <p>Chưa có tin nhắn trong cuộc trò chuyện này</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => {
        const mine = message.sender_id === currentUserId
        const groupMessage = isGroupMessage(message) ? message : null
        const directMessage = groupMessage ? null : (message as ChatMessage)
        const replyMessage = getMessageById(messages, message.reply_to_id)
        const groupReadCount =
          mine && groupMessage
            ? Math.max(groupMessage.read_by.length - 1, 0)
            : 0
        const senderName =
          mode === "direct"
            ? mine
              ? "Bạn"
              : directPeer?.full_name || directPeer?.email || "Người gửi"
            : mine
              ? "Bạn"
              : `Người dùng ${shortenId(message.sender_id)}`

        return (
          <div
            key={message._id}
            className={cn(
              "group/message flex items-end gap-2",
              mine ? "justify-end" : "justify-start"
            )}
          >
            {!mine ? (
              <ThreadAvatar
                mode={mode}
                title={senderName}
                avatar={mode === "direct" ? directPeer?.avatar : null}
                className="size-8"
              />
            ) : null}
            <div
              className={cn(
                "max-w-[min(78%,40rem)] rounded-lg px-3 py-2 shadow-xs",
                mine
                  ? "bg-primary text-primary-foreground"
                  : "border bg-background"
              )}
            >
              {mode === "group" && !mine ? (
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                  {senderName}
                </p>
              ) : null}
              {replyMessage ? (
                <div
                  className={cn(
                    "mb-2 rounded-md border-l-2 px-2 py-1 text-xs",
                    mine
                      ? "border-primary-foreground/50 bg-primary-foreground/10 text-primary-foreground/80"
                      : "border-primary/40 bg-muted/60 text-muted-foreground"
                  )}
                >
                  <p className="font-medium">
                    Trả lời{" "}
                    {replyMessage.sender_id === currentUserId
                      ? "bạn"
                      : shortenId(replyMessage.sender_id)}
                  </p>
                  <p className="line-clamp-2">
                    {getMessagePreview(replyMessage)}
                  </p>
                </div>
              ) : null}
              <MessageContent message={message} mine={mine} />
              <div
                className={cn(
                  "mt-1 flex items-center justify-end gap-2 text-[11px]",
                  mine ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                <span>{formatTime(message.created_at)}</span>
                {mine && directMessage ? (
                  <span className="flex items-center gap-1">
                    {directMessage.is_read ? (
                      <CheckCheck className="size-3" />
                    ) : (
                      <Check className="size-3" />
                    )}
                    {directMessage.is_read ? "Đã đọc" : "Đã gửi"}
                  </span>
                ) : null}
                {directMessage?.read_at ? (
                  <span>{formatTime(directMessage.read_at)}</span>
                ) : null}
                {groupReadCount > 0 ? (
                  <span>{groupReadCount} đã đọc</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover/message:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onReply(message)}
                aria-label="Trả lời"
              >
                <Reply className="size-4" />
              </Button>
              {mode === "direct" && mine ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600"
                  onClick={() => onDeleteDirect(message._id)}
                  disabled={deletingMessageId === message._id}
                  aria-label="Xóa tin nhắn"
                >
                  {deletingMessageId === message._id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MessageContent({
  message,
  mine,
}: {
  message: ChatMessage | GroupChatMessage
  mine: boolean
}) {
  if (message.is_deleted) {
    return (
      <p
        className={cn(
          "text-sm italic",
          mine ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
      >
        Tin nhắn đã xóa
      </p>
    )
  }

  if (message.type === "image") {
    return (
      <a
        href={message.content}
        target="_blank"
        rel="noreferrer"
        className="block overflow-hidden rounded-md"
      >
        <img
          src={message.content}
          alt="Ảnh trong tin nhắn"
          className="max-h-80 max-w-full rounded-md object-contain"
        />
      </a>
    )
  }

  return (
    <p className="text-sm leading-6 break-words whitespace-pre-wrap">
      {message.content}
    </p>
  )
}
