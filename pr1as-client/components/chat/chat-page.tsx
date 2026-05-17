"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  CheckCheck,
  Headset,
  Home,
  ImagePlus,
  Inbox,
  Loader2,
  MessageCircle,
  Reply,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react"
import Image from "next/image"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getPlanRingClass } from "@/lib/utils/plan"
import { getErrorMessage, localizeServerMessage } from "@/lib/utils/error-handler"
import { useChatSocket } from "@/lib/hooks/use-chat-socket"
import { uploadImage } from "@/lib/utils/upload-image"
import {
  useAdminContact,
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
import { useBlockUser, useUnblockUser } from "@/lib/hooks/use-moderation"
import { useMarkNotificationsByConversation } from "@/lib/hooks/use-notifications"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import type {
  ChatConversation,
  ChatMessage,
  DirectMessageListResult,
  GroupChatConversation,
  GroupChatMember,
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
  initialReceiverId?: string | null
  showHomeButton?: boolean
  title?: string
  variant?: "standalone" | "embedded"
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

const isDirectConversationWithUser = (
  conversation: ChatConversation,
  currentUserId: string | undefined,
  targetUserId: string
) => {
  if (!targetUserId) return false

  return (
    getOtherUserId(conversation, currentUserId) === targetUserId ||
    conversation.sender_id === targetUserId ||
    conversation.receiver_id === targetUserId ||
    conversation.other_user?._id === targetUserId
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

const getMemberName = (member?: GroupChatMember | null) => {
  return member?.full_name || member?.email || "Thành viên"
}

const isAdminMember = (member?: GroupChatMember | null) => {
  return member?.roles.includes("admin") ?? false
}

const getGroupMemberNames = (
  conversation: GroupChatConversation | null | undefined,
  currentUserId?: string
) => {
  const members = conversation?.members_data ?? []
  const visibleMembers = members.filter(
    (member) => member._id !== currentUserId
  )

  if (visibleMembers.length === 0) {
    return `${conversation?.members.length ?? 0} thành viên`
  }

  return visibleMembers.map(getMemberName).join(", ")
}

const getGroupTitle = (
  conversation: GroupChatConversation | null | undefined
) => {
  if (!conversation) return "Nhóm trò chuyện"
  return conversation.name || `Booking ${shortenId(conversation.booking_id)}`
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

const formatDateTime = (value?: string | null) => {
  if (!value) return ""
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function AdminVerifiedBadge({
  className,
  withLabel = false,
}: {
  className?: string
  withLabel?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-sky-500",
        className
      )}
      title="Tài khoản admin đã xác minh"
    >
      <BadgeCheck className="size-4 fill-sky-500 text-white" />
      {withLabel ? (
        <span className="text-[10px] font-semibold tracking-wide text-sky-600 uppercase">
          Admin
        </span>
      ) : null}
    </span>
  )
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
  initialReceiverId = null,
  showHomeButton = true,
  title = "Tin nhắn",
  variant = "standalone",
}: ChatPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const initialReceiverIdValue = initialReceiverId?.trim() ?? ""
  const shouldStartNewDirect = Boolean(
    initialReceiverIdValue &&
    initialMode === "direct" &&
    !initialDirectConversationId
  )
  const [mode, setMode] = React.useState<ChatMode>(initialMode)
  const [selectedDirectId, setSelectedDirectId] = React.useState<string | null>(
    initialDirectConversationId
  )
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(
    initialGroupConversationId
  )
  const [draft, setDraft] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [mobileThreadOpen, setMobileThreadOpen] = React.useState(
    Boolean(
      initialDirectConversationId ||
      initialGroupConversationId ||
      shouldStartNewDirect
    )
  )
  const [replyTarget, setReplyTarget] = React.useState<ReplyTarget | null>(null)
  const [typingByRoom, setTypingByRoom] = React.useState<
    Record<string, string>
  >({})
  const [isUploadingImage, setIsUploadingImage] = React.useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = React.useState(false)
  const [blockProfile, setBlockProfile] = React.useState(true)
  const [imagePreviews, setImagePreviews] = React.useState<
    { file: File; previewUrl: string }[]
  >([])
  const messageScrollerRef = React.useRef<HTMLDivElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const typingClearTimersRef = React.useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({})

  const isAdminUser = Boolean(user?.roles?.includes("admin"))

  const { socket } = useChatSocket()
  const directConversationsQuery = useDirectConversations(CONVERSATION_PARAMS)
  const groupConversationsQuery = useGroupConversations(CONVERSATION_PARAMS)
  const adminContactQuery = useAdminContact(!isAdminUser)
  const adminContact = adminContactQuery.data ?? null
  const adminUserId = adminContact?._id ?? null
  const directConversations = React.useMemo(
    () => directConversationsQuery.data?.conversations ?? [],
    [directConversationsQuery.data?.conversations]
  )
  const groupConversations = React.useMemo(
    () => groupConversationsQuery.data?.conversations ?? [],
    [groupConversationsQuery.data?.conversations]
  )

  const receiverParamTargetId =
    initialReceiverIdValue &&
    !initialDirectConversationId &&
    !initialGroupConversationId
      ? initialReceiverIdValue
      : ""
  const receiverParamConversation = React.useMemo(() => {
    if (!receiverParamTargetId) return undefined

    return directConversations.find((conversation) =>
      isDirectConversationWithUser(
        conversation,
        user?.id,
        receiverParamTargetId
      )
    )
  }, [directConversations, receiverParamTargetId, user?.id])
  const isReceiverParamNewDirect = Boolean(
    receiverParamTargetId && !receiverParamConversation && !selectedDirectId
  )
  const isDirectComposerOpen = isReceiverParamNewDirect

  const activeDirectId =
    selectedDirectId ??
    receiverParamConversation?._id ??
    (mode === "direct" && !isDirectComposerOpen
      ? (directConversations[0]?._id ?? null)
      : null)
  const activeGroupId =
    selectedGroupId ??
    (mode === "group" ? (groupConversations[0]?._id ?? null) : null)

  const selectedDirectFromList = isDirectComposerOpen
    ? undefined
    : directConversations.find(
        (conversation) => conversation._id === activeDirectId
      )
  const selectedGroupFromList = groupConversations.find(
    (conversation) => conversation._id === activeGroupId
  )
  const directConversationQuery = useDirectConversation(
    selectedDirectFromList || isDirectComposerOpen
      ? undefined
      : (activeDirectId ?? undefined)
  )
  const groupConversationQuery = useGroupConversation(
    selectedGroupFromList ? undefined : (activeGroupId ?? undefined)
  )
  const selectedDirect = isDirectComposerOpen
    ? null
    : (selectedDirectFromList ?? directConversationQuery.data ?? null)
  const selectedGroup =
    selectedGroupFromList ?? groupConversationQuery.data ?? null

  const directMessagesQuery = useDirectMessages(
    mode === "direct" && !isDirectComposerOpen
      ? (activeDirectId ?? undefined)
      : undefined,
    MESSAGE_PARAMS
  )
  const groupMessagesQuery = useGroupMessages(
    mode === "group" ? (activeGroupId ?? undefined) : undefined,
    MESSAGE_PARAMS
  )
  const directMessages = React.useMemo(
    () => directMessagesQuery.data?.messages ?? [],
    [directMessagesQuery.data?.messages]
  )
  const groupMessages = React.useMemo(
    () => groupMessagesQuery.data?.messages ?? [],
    [groupMessagesQuery.data?.messages]
  )
  const activeMessages = mode === "direct" ? directMessages : groupMessages
  const activeConversationId =
    mode === "direct" && !isDirectComposerOpen ? activeDirectId : activeGroupId

  const sendDirectMessageMutation = useSendDirectMessage()
  const sendGroupMessageMutation = useSendGroupMessage()
  const { mutate: markDirectMessagesReadMutation } = useMarkDirectMessagesRead()
  const { mutate: markGroupMessagesReadMutation } = useMarkGroupMessagesRead()
  const { mutate: markNotificationsByConversation } = useMarkNotificationsByConversation()
  const deleteDirectMessageMutation = useDeleteDirectMessage()
  const blockUserMutation = useBlockUser()
  const unblockUserMutation = useUnblockUser()

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
    : receiverParamTargetId
  const hasContent = Boolean(draft.trim()) || imagePreviews.length > 0
  const canSubmitDirect =
    mode === "direct" && Boolean(directReceiverId) && hasContent
  const canSubmitGroup =
    mode === "group" && Boolean(selectedGroup?.booking_id) && hasContent
  const isSending =
    sendDirectMessageMutation.isPending || sendGroupMessageMutation.isPending
  const activeTitle =
    mode === "direct"
      ? isDirectComposerOpen
        ? "Tin nhắn mới"
        : getDirectTitle(selectedDirect)
      : getGroupTitle(selectedGroup)
  const activeSubtitle =
    mode === "direct"
      ? isDirectComposerOpen
        ? "Bắt đầu trò chuyện với worker đã chọn"
        : getDirectSubtitle(selectedDirect, user?.id)
      : selectedGroup
        ? getGroupMemberNames(selectedGroup, user?.id)
        : "Chưa chọn nhóm"
  const hasActiveThread = Boolean(activeConversationId || isDirectComposerOpen)
  const isActiveDirectAdmin = Boolean(
    mode === "direct" &&
      adminUserId &&
      (selectedDirect?.other_user?._id === adminUserId ||
        directReceiverId === adminUserId)
  )
  const selectedDirectBlocked = Boolean(selectedDirect?.other_user?.is_blocked)
  const selectedDirectBlockedMe = Boolean(selectedDirect?.other_user?.has_blocked_me)

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  React.useEffect(() => {
    if (!socket || mode !== "direct" || !activeDirectId || isDirectComposerOpen)
      return
    socket.emit("join_conversation", { conversation_id: activeDirectId })

    return () => {
      socket.emit("leave_conversation", { conversation_id: activeDirectId })
    }
  }, [activeDirectId, isDirectComposerOpen, mode, socket])

  React.useEffect(() => {
    if (!socket || mode !== "group" || !activeGroupId) return
    socket.emit("join_group_conversation", {
      conversation_group_id: activeGroupId,
    })

    return () => {
      socket.emit("leave_group_conversation", {
        conversation_group_id: activeGroupId,
      })
    }
  }, [activeGroupId, mode, socket])

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
          message.conversation_group_id === activeGroupId &&
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
        message.conversation_id === activeDirectId &&
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
      toast.error(
        localizeServerMessage(payload.message, "Không thể kết nối trò chuyện.")
      )
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
  }, [activeDirectId, activeGroupId, queryClient, setTyping, socket, user?.id])

  React.useEffect(() => {
    const typingClearTimers = typingClearTimersRef.current

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }

      Object.values(typingClearTimers).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  React.useEffect(() => {
    const scroller = messageScrollerRef.current
    if (!scroller) return
    scroller.scrollTo({ top: scroller.scrollHeight })
  }, [activeMessages.length, activeDirectId, activeGroupId, mode])

  const notifSyncedDirectRef = React.useRef<string | null>(null)
  const notifSyncedGroupRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (
      mode !== "direct" ||
      isDirectComposerOpen ||
      !activeDirectId ||
      directMessages.length === 0
    )
      return

    const unreadIds = directMessages
      .filter((message) => message.receiver_id === user?.id && !message.is_read)
      .map((message) => message._id)

    if (unreadIds.length === 0) return

    if (socket?.connected) {
      socket.emit("mark_read", { conversation_id: activeDirectId })
    } else {
      markDirectMessagesReadMutation({ conversation_id: activeDirectId })
    }

    if (notifSyncedDirectRef.current !== activeDirectId) {
      notifSyncedDirectRef.current = activeDirectId
      markNotificationsByConversation({ conversation_id: activeDirectId })
    }
  }, [
    activeDirectId,
    directMessages,
    isDirectComposerOpen,
    markDirectMessagesReadMutation,
    markNotificationsByConversation,
    mode,
    socket,
    user?.id,
  ])

  React.useEffect(() => {
    if (mode !== "group" || !activeGroupId || groupMessages.length === 0) return

    const unreadIds = groupMessages
      .filter(
        (message) =>
          message.sender_id !== user?.id &&
          !message.read_by.some((read) => read.user_id === user?.id)
      )
      .map((message) => message._id)

    if (unreadIds.length === 0) return

    if (socket?.connected) {
      socket.emit("mark_group_read", { conversation_group_id: activeGroupId })
    } else {
      markGroupMessagesReadMutation({ conversation_group_id: activeGroupId })
    }

    if (notifSyncedGroupRef.current !== activeGroupId) {
      notifSyncedGroupRef.current = activeGroupId
      markNotificationsByConversation({ conversation_group_id: activeGroupId })
    }
  }, [
    activeGroupId,
    groupMessages,
    markGroupMessagesReadMutation,
    markNotificationsByConversation,
    mode,
    socket,
    user?.id,
  ])

  const emitTyping = React.useCallback(
    (isTypingNow: boolean) => {
      if (!socket) return

      if (mode === "direct" && activeDirectId && !isDirectComposerOpen) {
        socket.emit("typing", {
          conversation_id: activeDirectId,
          is_typing: isTypingNow,
        })
      }

      if (mode === "group" && activeGroupId) {
        socket.emit("group_typing", {
          conversation_group_id: activeGroupId,
          is_typing: isTypingNow,
        })
      }
    },
    [activeDirectId, activeGroupId, isDirectComposerOpen, mode, socket]
  )

  const resetComposer = React.useCallback(() => {
    setDraft("")
    setReplyTarget(null)
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }
    emitTyping(false)
  }, [emitTyping])

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

  const handleDraftKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return
    event.preventDefault()
    event.currentTarget.form?.requestSubmit()
  }

  const sendImageMessage = async (imageUrl: string) => {
    if (mode === "direct") {
      if (!directReceiverId) {
        toast.error("Chọn cuộc trò chuyện trước khi gửi.")
        return
      }

      const result = await sendDirectMessageMutation.mutateAsync({
        receiver_id: directReceiverId,
        content: imageUrl,
        type: "image",
        reply_to_id: replyTarget?.id ?? null,
      })

      setSelectedDirectId(result.conversation._id)
      setReplyTarget(null)
      return
    }

    if (!selectedGroup?.booking_id) {
      toast.error("Chọn nhóm trò chuyện trước khi gửi.")
      return
    }

    const result = await sendGroupMessageMutation.mutateAsync({
      booking_id: selectedGroup.booking_id,
      content: imageUrl,
      type: "image",
      reply_to_id: replyTarget?.id ?? null,
    })

    setSelectedGroupId(result.conversation._id)
    setReplyTarget(null)
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    const valid = files.filter((f) => f.type.startsWith("image/"))
    if (valid.length < files.length) toast.error("Chỉ hỗ trợ tệp ảnh.")
    if (!valid.length) return
    const newPreviews = valid.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const handleRemoveImagePreview = (index: number) => {
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const clearImagePreviews = (list: { previewUrl: string }[]) => {
    list.forEach((p) => URL.revokeObjectURL(p.previewUrl))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content && !imagePreviews.length) return

    try {
      if (mode === "direct") {
        if (!directReceiverId) {
          toast.error("Chọn cuộc trò chuyện trước khi gửi.")
          return
        }

        if (imagePreviews.length) {
          const toSend = [...imagePreviews]
          setIsUploadingImage(true)
          for (const preview of toSend) {
            const imageUrl = await uploadImage(preview.file)
            const result = await sendDirectMessageMutation.mutateAsync({
              receiver_id: directReceiverId,
              content: imageUrl,
              type: "image",
              reply_to_id: replyTarget?.id ?? null,
            })
            setSelectedDirectId(result.conversation._id)
          }
          clearImagePreviews(toSend)
          setImagePreviews([])
          setIsUploadingImage(false)
          setReplyTarget(null)
        }

        if (content) {
          const result = await sendDirectMessageMutation.mutateAsync({
            receiver_id: directReceiverId,
            content,
            type: getOutgoingMessageType(content),
            reply_to_id: replyTarget?.id ?? null,
          })
          setSelectedDirectId(result.conversation._id)
          setDraft("")
          setReplyTarget(null)
          emitTyping(false)
        }
        return
      }

      if (!selectedGroup?.booking_id) {
        toast.error("Chọn nhóm trò chuyện trước khi gửi.")
        return
      }

      if (imagePreviews.length) {
        const toSend = [...imagePreviews]
        setIsUploadingImage(true)
        for (const preview of toSend) {
          const imageUrl = await uploadImage(preview.file)
          const result = await sendGroupMessageMutation.mutateAsync({
            booking_id: selectedGroup.booking_id,
            content: imageUrl,
            type: "image",
            reply_to_id: replyTarget?.id ?? null,
          })
          setSelectedGroupId(result.conversation._id)
        }
        clearImagePreviews(toSend)
        setImagePreviews([])
        setIsUploadingImage(false)
        setReplyTarget(null)
      }

      if (content) {
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
      }
    } catch (error) {
      setIsUploadingImage(false)
      toast.error(getErrorMessage(error, "Không thể gửi tin nhắn."))
    }
  }

  const handleContactAdmin = React.useCallback(() => {
    if (!adminContact) {
      toast.error("Không tìm thấy admin để liên hệ.")
      return
    }

    if (adminContact._id === user?.id) return

    resetComposer()
    setMode("direct")
    setSearch("")

    const existing = directConversations.find((conversation) =>
      isDirectConversationWithUser(conversation, user?.id, adminContact._id)
    )

    if (existing) {
      setSelectedDirectId(existing._id)
      setMobileThreadOpen(true)
      router.replace(`/chat?conversation_id=${existing._id}`)
      return
    }

    setSelectedDirectId(null)
    setMobileThreadOpen(true)
    router.replace(`/chat?receiver_id=${adminContact._id}`)
  }, [adminContact, directConversations, resetComposer, router, user?.id])

  const handleDeleteDirectMessage = async (messageId: string) => {
    try {
      await deleteDirectMessageMutation.mutateAsync(messageId)
      if (activeDirectId) {
        queryClient.setQueryData<DirectMessageListResult>(
          queryKeys.chat.directMessages(activeDirectId, MESSAGE_PARAMS),
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
      toast.error(getErrorMessage(error, "Không thể xóa tin nhắn."))
    }
  }

  const handleBlockUser = async () => {
    if (!directReceiverId) return
    await blockUserMutation.mutateAsync({
      blocked_user_id: directReceiverId,
      block_profile: blockProfile,
    })
    setBlockDialogOpen(false)
  }

  const handleUnblockUser = async () => {
    if (!directReceiverId) return
    await unblockUserMutation.mutateAsync(directReceiverId)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-background p-0",
        variant === "embedded" ? "h-full min-h-0" : "h-svh md:p-4"
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b px-4 py-3 md:border-b-0 md:px-0 md:pt-0 md:pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          {showHomeButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              aria-label="Về trang chủ"
            >
              <Home className="size-4" />
            </Button>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
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
                  resetComposer()
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
                  resetComposer()
                  setMode("group")
                  setMobileThreadOpen(false)
                }}
              >
                <Users className="size-4" />
                Nhóm
              </button>
            </div>
            {!isAdminUser ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full justify-start gap-2 border-sky-300 bg-sky-50/60 text-sky-800 hover:bg-sky-100 hover:text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-900/40"
                onClick={handleContactAdmin}
                disabled={adminContactQuery.isLoading || !adminContact}
              >
                {adminContactQuery.isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Headset className="size-4 text-sky-600" />
                )}
                <span className="flex flex-1 items-center gap-1.5 text-left">
                  Liên hệ admin
                  <AdminVerifiedBadge />
                </span>
                <Badge
                  variant="secondary"
                  className="bg-sky-100 text-[10px] text-sky-800 dark:bg-sky-900 dark:text-sky-100"
                >
                  Hỗ trợ
                </Badge>
              </Button>
            ) : null}
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Tìm cuộc trò chuyện"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {mode === "direct" ? (
              <ConversationList
                type="direct"
                loading={directConversationsQuery.isLoading}
                conversations={filteredDirectConversations}
                selectedId={activeDirectId}
                currentUserId={user?.id}
                adminUserId={adminUserId}
                onSelect={(id) => {
                  resetComposer()
                  setSelectedDirectId(id)
                  setMobileThreadOpen(true)
                }}
              />
            ) : (
              <ConversationList
                type="group"
                loading={groupConversationsQuery.isLoading}
                conversations={filteredGroupConversations}
                selectedId={activeGroupId}
                currentUserId={user?.id}
                adminUserId={adminUserId}
                onSelect={(id) => {
                  resetComposer()
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
              {mode === "direct" ? (
                <ThreadAvatar
                  mode={mode}
                  title={activeTitle}
                  avatar={selectedDirect?.other_user?.avatar}
                  highlight={isActiveDirectAdmin ? "admin" : undefined}
                  planCode={selectedDirect?.other_user?.meta_data?.pricing_plan_code}
                />
              ) : (
                <GroupMemberAvatars members={selectedGroup?.members_data} />
              )}
              <div className="min-w-0">
                <h2
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 truncate text-base font-semibold",
                    isActiveDirectAdmin && "text-sky-700 dark:text-sky-300"
                  )}
                >
                  <span className="truncate">{activeTitle}</span>
                  {isActiveDirectAdmin ? (
                    <AdminVerifiedBadge withLabel />
                  ) : null}
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
            {mode === "group" && selectedGroup?.booking_data ? (
              <GroupBookingSummary conversation={selectedGroup} />
            ) : null}
            <MessagePane
              mode={mode}
              loading={
                mode === "direct"
                  ? directMessagesQuery.isLoading
                  : groupMessagesQuery.isLoading
              }
              messages={activeMessages}
              currentUserId={user?.id}
              adminUserId={adminUserId}
              selectedConversationId={
                hasActiveThread ? (activeConversationId ?? "new") : null
              }
              directPeer={selectedDirect?.other_user}
              groupConversation={selectedGroup}
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

          <div className="min-h-0 border-t bg-background px-4 text-xs text-muted-foreground">
            {activeTypingUser
              ? `${shortenId(activeTypingUser)} đang nhập...`
              : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3">
            {mode === "direct" && directReceiverId && !isActiveDirectAdmin ? (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {selectedDirectBlocked
                    ? "Ban da chan nguoi nay."
                    : selectedDirectBlockedMe
                      ? "Nguoi nay dang chan ban."
                      : "Quan ly an toan cho cuoc tro chuyen nay."}
                </span>
                {selectedDirectBlocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={unblockUserMutation.isPending}
                    onClick={() => void handleUnblockUser()}
                  >
                    <Ban className="size-4" />
                    Bo chan
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBlockDialogOpen(true)}
                  >
                    <Ban className="size-4" />
                    Chan
                  </Button>
                )}
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
                      : mode === "direct"
                        ? selectedDirect?.other_user?.full_name ||
                          selectedDirect?.other_user?.email ||
                          "người gửi"
                        : "thành viên"}
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
            {imagePreviews.length > 0 ? (
              <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={preview.previewUrl}
                    className="relative size-16 shrink-0 overflow-hidden rounded-md border"
                  >
                    <img
                      src={preview.previewUrl}
                      alt={`Ảnh ${index + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImagePreview(index)}
                      className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      aria-label="Xóa ảnh"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || isUploadingImage}
                  className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                  aria-label="Thêm ảnh"
                >
                  <ImagePlus className="size-5" />
                </button>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  isSending ||
                  isUploadingImage ||
                  selectedDirectBlocked ||
                  selectedDirectBlockedMe ||
                  (mode === "direct" && !directReceiverId) ||
                  (mode === "group" && !selectedGroup)
                }
                aria-label="Chọn ảnh"
              >
                <ImagePlus className="size-4" />
              </Button>
              <textarea
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleDraftKeyDown}
                placeholder={
                  activeConversationId ||
                  (mode === "direct" && directReceiverId)
                    ? "Nhập tin nhắn"
                    : "Chọn cuộc trò chuyện"
                }
                rows={1}
                disabled={
                  isSending ||
                  selectedDirectBlocked ||
                  selectedDirectBlockedMe ||
                  (mode === "direct" && !directReceiverId) ||
                  (mode === "group" && !selectedGroup)
                }
                className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={
                  isSending ||
                  selectedDirectBlocked ||
                  selectedDirectBlockedMe ||
                  isUploadingImage ||
                  (!canSubmitDirect && !canSubmitGroup)
                }
              >
                {isSending || isUploadingImage ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </form>
        </section>
      </div>
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chan nguoi dung nay?</DialogTitle>
            <DialogDescription>
              Ban se khong the gui hoac nhan tin nhan truc tiep voi nguoi nay.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="block-profile"
              checked={blockProfile}
              onCheckedChange={(value) => setBlockProfile(Boolean(value))}
            />
            <Label htmlFor="block-profile" className="text-sm leading-5">
              Chan luon profile va bai viet cua nguoi nay
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBlockDialogOpen(false)}
              disabled={blockUserMutation.isPending}
            >
              Huy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleBlockUser()}
              disabled={blockUserMutation.isPending}
            >
              {blockUserMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Chan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConversationList({
  type,
  loading,
  conversations,
  selectedId,
  currentUserId,
  adminUserId,
  onSelect,
}: {
  type: ChatMode
  loading: boolean
  conversations: ChatConversation[] | GroupChatConversation[]
  selectedId: string | null
  currentUserId?: string
  adminUserId?: string | null
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
          : getGroupTitle(groupConversation)
        const subtitle = isDirect
          ? getDirectSubtitle(directConversation, currentUserId)
          : getGroupMemberNames(groupConversation, currentUserId)
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
        const isAdminDirect = Boolean(
          isDirect &&
            adminUserId &&
            directConversation?.other_user?._id === adminUserId
        )

        return (
          <button
            key={conversation._id}
            type="button"
            className={cn(
              "flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-accent",
              selectedId === conversation._id && "bg-accent",
              isAdminDirect &&
                "border-l-2 border-l-sky-500 bg-sky-50/60 dark:bg-sky-950/30"
            )}
            onClick={() => onSelect(conversation._id)}
          >
            {isDirect ? (
              <ThreadAvatar
                mode={type}
                title={title}
                avatar={directConversation?.other_user?.avatar}
                highlight={isAdminDirect ? "admin" : undefined}
                planCode={directConversation?.other_user?.meta_data?.pricing_plan_code}
              />
            ) : (
              <GroupMemberAvatars members={groupConversation?.members_data} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "flex min-w-0 items-center gap-1 truncate text-sm font-medium",
                    needsResponse && "text-red-600 dark:text-red-400",
                    isAdminDirect && "text-sky-700 dark:text-sky-300"
                  )}
                >
                  <span className="truncate">{title}</span>
                  {isAdminDirect ? (
                    <AdminVerifiedBadge className="ml-0.5" />
                  ) : null}
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
                  needsResponse && "font-medium text-red-600 dark:text-red-400"
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
  highlight,
  planCode,
}: {
  title: string
  mode: ChatMode
  avatar?: string | null
  className?: string
  highlight?: "admin"
  planCode?: string | null
}) {
  const initial =
    title.trim().charAt(0).toUpperCase() || (mode === "direct" ? "C" : "N")
  const ringClass =
    highlight === "admin"
      ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-background"
      : getPlanRingClass(planCode)

  if (avatar) {
    return (
      <div className={cn("relative shrink-0", className)}>
        <Image
          src={avatar}
          alt={title}
          width={40}
          height={40}
          className={cn("size-10 rounded-full object-cover", ringClass)}
        />
        {highlight === "admin" ? (
          <BadgeCheck className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full fill-sky-500 text-white" />
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-full text-sm font-semibold",
          mode === "direct"
            ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
          ringClass
        )}
      >
        {initial}
      </div>
      {highlight === "admin" ? (
        <BadgeCheck className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full fill-sky-500 text-white" />
      ) : null}
    </div>
  )
}

function GroupMemberAvatars({ members }: { members?: GroupChatMember[] }) {
  const visibleMembers = (members ?? [])
    .filter((member) => !isAdminMember(member))
    .slice(0, 3)

  if (visibleMembers.length === 0) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
        N
      </div>
    )
  }

  return (
    <div className="flex size-10 shrink-0 items-center">
      {visibleMembers.map((member, index) => {
        const name = getMemberName(member)

        return member.avatar ? (
          <Image
            key={member._id}
            src={member.avatar}
            alt={name}
            width={32}
            height={32}
            className={cn(
              "size-8 rounded-full border-2 border-card object-cover",
              index > 0 && "-ml-4"
            )}
          />
        ) : (
          <div
            key={member._id}
            className={cn(
              "flex size-8 items-center justify-center rounded-full border-2 border-card bg-amber-100 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200",
              index > 0 && "-ml-4"
            )}
          >
            {name.trim().charAt(0).toUpperCase() || "N"}
          </div>
        )
      })}
    </div>
  )
}

function GroupBookingSummary({
  conversation,
}: {
  conversation: GroupChatConversation
}) {
  const booking = conversation.booking_data
  if (!booking) return null

  return (
    <div className="mb-4 rounded-lg border bg-background px-4 py-3 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            Booking {booking.service_code}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(booking.schedule.start_time)} -{" "}
            {formatDateTime(booking.schedule.end_time)}
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
          <p className="font-medium">Tranh chấp: {booking.dispute.reason}</p>
          <p className="mt-1 line-clamp-2">{booking.dispute.description}</p>
        </div>
      ) : null}
    </div>
  )
}

function MessagePane({
  mode,
  loading,
  messages,
  currentUserId,
  adminUserId,
  selectedConversationId,
  directPeer,
  groupConversation,
  onReply,
  onDeleteDirect,
  deletingMessageId,
}: {
  mode: ChatMode
  loading: boolean
  messages: Array<ChatMessage | GroupChatMessage>
  currentUserId?: string
  adminUserId?: string | null
  selectedConversationId: string | null
  directPeer?: ChatConversation["other_user"]
  groupConversation?: GroupChatConversation | null
  onReply: (message: ChatMessage | GroupChatMessage) => void
  onDeleteDirect: (messageId: string) => void
  deletingMessageId: string | null
}) {
  const groupMemberMap = new Map(
    (groupConversation?.members_data ?? []).map((member) => [
      member._id,
      member,
    ])
  )

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
        const groupSender = groupMessage
          ? groupMemberMap.get(groupMessage.sender_id)
          : undefined
        const groupSenderIsAdmin = isAdminMember(groupSender)
        const isDirectAdminPeer = Boolean(
          mode === "direct" &&
            !mine &&
            adminUserId &&
            (directPeer?._id === adminUserId ||
              message.sender_id === adminUserId)
        )
        const senderName =
          mode === "direct"
            ? mine
              ? "Bạn"
              : directPeer?.full_name || directPeer?.email || "Người gửi"
            : mine
              ? "Bạn"
              : getMemberName(groupSender)

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
                avatar={
                  mode === "direct" ? directPeer?.avatar : groupSender?.avatar
                }
                className="size-8"
                highlight={
                  isDirectAdminPeer || groupSenderIsAdmin ? "admin" : undefined
                }
                planCode={mode === "direct" ? directPeer?.meta_data?.pricing_plan_code : undefined}
              />
            ) : null}
            <div
              className={cn(
                "max-w-[min(78%,40rem)] rounded-lg px-3 py-2 shadow-xs",
                mine
                  ? "bg-primary text-primary-foreground"
                  : isDirectAdminPeer
                    ? "border border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100"
                    : groupSenderIsAdmin
                      ? "border border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                      : "border bg-background"
              )}
            >
              {mode === "direct" && isDirectAdminPeer ? (
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                  <span>{senderName}</span>
                  <AdminVerifiedBadge withLabel />
                </p>
              ) : null}
              {mode === "group" && !mine ? (
                <p
                  className={cn(
                    "mb-1 flex items-center gap-1.5 text-[11px] font-medium",
                    groupSenderIsAdmin
                      ? "text-amber-700 dark:text-amber-200"
                      : "text-muted-foreground"
                  )}
                >
                  <span>{senderName}</span>
                  {groupSenderIsAdmin ? <AdminVerifiedBadge withLabel /> : null}
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
                      : mode === "direct"
                        ? directPeer?.full_name ||
                          directPeer?.email ||
                          "người gửi"
                        : "thành viên"}
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
                  className="size-8 text-red-600 dark:text-red-400"
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
        <Image
          src={message.content}
          width={640}
          height={480}
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
