"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
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
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import Image from "next/image"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import * as React from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useUIStore } from "@/lib/store/ui-store"
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
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { getErrorMessage, localizeServerMessage } from "@/lib/utils/error-handler"
import { useChatSocket } from "@/lib/hooks/use-chat-socket"
import { getActiveRole } from "@/lib/auth/roles"
import { uploadImage } from "@/lib/utils/upload-image"
import { filterValidImageFiles } from "@/lib/utils/validate-upload"
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
import { useAuthStore, useHasHydrated } from "@/lib/store/auth-store"
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

type ChatTranslator = ReturnType<typeof useTranslations>

const useLocaleTag = () => {
  const locale = useLocale() as SupportedLocale
  return INTL_LOCALE_TAGS[locale] ?? "vi-VN"
}

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

const getDirectTitle = (
  t: ChatTranslator,
  conversation: ChatConversation | null | undefined
) => {
  return (
    conversation?.other_user?.full_name ||
    conversation?.other_user?.email ||
    t("directTitleFallback")
  )
}

const getDirectSubtitle = (
  t: ChatTranslator,
  conversation: ChatConversation | null | undefined,
  currentUserId: string | undefined
) => {
  return (
    conversation?.other_user?.email ||
    getOtherUserId(conversation, currentUserId) ||
    t("noReceiver")
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

const getMessagePreview = (
  t: ChatTranslator,
  message?: ChatMessage | GroupChatMessage | null
) => {
  if (!message) return t("noMessage")
  if (message.is_deleted) return t("messageDeleted")
  if (message.type === "image") return t("imageMessage")
  return message.content
}

const getMemberName = (
  t: ChatTranslator,
  member?: GroupChatMember | null
) => {
  return member?.full_name || member?.email || t("memberFallback")
}

const isAdminMember = (member?: GroupChatMember | null) => {
  return member?.roles.includes("admin") ?? false
}

const getGroupMemberNames = (
  t: ChatTranslator,
  conversation: GroupChatConversation | null | undefined,
  currentUserId?: string
) => {
  const members = conversation?.members_data ?? []
  const visibleMembers = members.filter(
    (member) => member._id !== currentUserId
  )

  if (visibleMembers.length === 0) {
    return t("memberCount", { count: conversation?.members.length ?? 0 })
  }

  return visibleMembers.map((member) => getMemberName(t, member)).join(", ")
}

const getGroupTitle = (
  t: ChatTranslator,
  conversation: GroupChatConversation | null | undefined
) => {
  if (!conversation) return t("groupTitleFallback")
  return conversation.name || `Booking ${shortenId(conversation.booking_id)}`
}

const getReplyTargetFromMessage = (
  t: ChatTranslator,
  message: ChatMessage | GroupChatMessage
): ReplyTarget => ({
  id: message._id,
  senderId: message.sender_id,
  content: getMessagePreview(t, message),
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

const formatTime = (value?: string | null, localeTag = "vi-VN") => {
  if (!value) return ""
  return new Intl.DateTimeFormat(localeTag, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

const shortenId = (value?: string | null) => {
  if (!value) return "-"
  return value.length > 10 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value
}

const formatDateTime = (value?: string | null, localeTag = "vi-VN") => {
  if (!value) return ""
  return new Intl.DateTimeFormat(localeTag, {
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
  const t = useTranslations("Chat")
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-sky-500",
        className
      )}
      title={t("adminVerifiedTitle")}
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
  title,
  variant = "standalone",
}: ChatPageProps) {
  const t = useTranslations("Chat")
  const localeTag = useLocaleTag()
  const headerTitle = title ?? t("title")
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useHasHydrated()
  const activeRole = getActiveRole(user)
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

  // Ẩn bottom nav khi đang trong 1 đoạn chat trên mobile
  const setHideBottomNav = useUIStore((s) => s.setHideBottomNav)
  React.useEffect(() => {
    setHideBottomNav(mobileThreadOpen)
    return () => setHideBottomNav(false) // reset khi rời trang chat
  }, [mobileThreadOpen, setHideBottomNav])

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
  const previousActiveRoleRef = React.useRef(activeRole)

  // Refs để socket event handlers luôn đọc giá trị mới nhất mà không cần
  // thêm vào dependency array → tránh detach/re-attach listeners khi conversation thay đổi
  const activeDirectIdRef = React.useRef<string | null>(null)
  const activeGroupIdRef = React.useRef<string | null>(null)
  const userIdRef = React.useRef<string | undefined>(undefined)

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

  // Cập nhật refs mỗi render để socket handlers luôn dùng giá trị hiện tại
  activeDirectIdRef.current = activeDirectId
  activeGroupIdRef.current = activeGroupId
  userIdRef.current = user?.id

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
      const title = getDirectTitle(t, conversation).toLowerCase()
      const subtitle = getDirectSubtitle(t, conversation, user?.id).toLowerCase()
      return title.includes(term) || subtitle.includes(term)
    })
  }, [directConversations, search, user?.id, t])

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
        ? t("newMessage")
        : getDirectTitle(t, selectedDirect)
      : getGroupTitle(t, selectedGroup)
  const activeSubtitle =
    mode === "direct"
      ? isDirectComposerOpen
        ? t("composerSubtitle")
        : getDirectSubtitle(t, selectedDirect, user?.id)
      : selectedGroup
        ? getGroupMemberNames(t, selectedGroup, user?.id)
        : t("noGroupSelected")
  const hasActiveThread = Boolean(activeConversationId || isDirectComposerOpen)
  const isActiveDirectAdmin = Boolean(
    mode === "direct" &&
      adminUserId &&
      (selectedDirect?.other_user?._id === adminUserId ||
        directReceiverId === adminUserId)
  )
  const selectedDirectBlocked = Boolean(selectedDirect?.other_user?.is_blocked)
  const selectedDirectBlockedMe = Boolean(selectedDirect?.other_user?.has_blocked_me)
  const selectedDirectUserBanned = selectedDirect?.other_user?.status === "banned"
  const directRoleBlockedReason =
    mode === "direct" &&
    activeRole === "worker" &&
    isDirectComposerOpen &&
    directReceiverId !== adminUserId
      ? t("workerCannotDirectChat")
      : null

  React.useEffect(() => {
    // Chờ Zustand hydrate từ sessionStorage trước khi redirect.
    // Trước hydration, isAuthenticated=false ngay cả với user đã đăng nhập → tránh redirect loop.
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [hasHydrated, isAuthenticated, router])

  React.useEffect(() => {
    if (previousActiveRoleRef.current === activeRole) return

    previousActiveRoleRef.current = activeRole
    queryClient.invalidateQueries({
      queryKey: queryKeys.chat.directConversationsRoot,
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.chat.directMessagesRoot,
    })
    setSelectedDirectId(null)
  }, [activeRole, queryClient])

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
          message.conversation_group_id === activeGroupIdRef.current &&
          message.sender_id !== userIdRef.current
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
        message.conversation_id === activeDirectIdRef.current &&
        message.receiver_id === userIdRef.current
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
      if (payload.user_id === userIdRef.current) return
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
      if (payload.user_id === userIdRef.current) return
      setTyping(
        `group:${payload.conversation_group_id}`,
        payload.user_id,
        payload.is_typing
      )
    }

    const handleSocketError = (payload: { message?: string } | Error) => {
      toast.error(
        localizeServerMessage(payload.message, t("connectError"))
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
  // activeDirectId, activeGroupId, user?.id đọc qua refs → không cần trong deps
  // Chỉ re-register listeners khi socket instance thay đổi
  }, [queryClient, setTyping, socket, t])

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
    // rAF gives the browser one extra layout pass so scrollHeight is accurate
    // after messages render (avoids premature scroll before DOM settles).
    const id = requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight
    })
    return () => cancelAnimationFrame(id)
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
      if (directRoleBlockedReason) {
        toast.error(directRoleBlockedReason)
        return
      }

      if (!directReceiverId) {
        toast.error(t("selectDirectBeforeSend"))
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
      toast.error(t("selectGroupBeforeSend"))
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
    if (!files.length) return
    const valid = filterValidImageFiles(files, (msg) => toast.error(msg))
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

    // Snapshot the draft + reply target so we can roll back if the send fails.
    // Optimistically clear the input now — feels snappier than waiting for the
    // round-trip to complete before the textarea clears.
    const previousDraft = draft
    const previousReplyTarget = replyTarget
    if (content) {
      setDraft("")
      setReplyTarget(null)
      emitTyping(false)
    }

    try {
      if (mode === "direct") {
        if (directRoleBlockedReason) {
          toast.error(directRoleBlockedReason)
          if (content) {
            setDraft(previousDraft)
            setReplyTarget(previousReplyTarget)
          }
          return
        }

        if (!directReceiverId) {
          toast.error(t("selectDirectBeforeSend"))
          if (content) {
            setDraft(previousDraft)
            setReplyTarget(previousReplyTarget)
          }
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
              reply_to_id: previousReplyTarget?.id ?? null,
            })
            setSelectedDirectId(result.conversation._id)
          }
          clearImagePreviews(toSend)
          setImagePreviews([])
          setIsUploadingImage(false)
        }

        if (content) {
          const result = await sendDirectMessageMutation.mutateAsync({
            receiver_id: directReceiverId,
            content,
            type: getOutgoingMessageType(content),
            reply_to_id: previousReplyTarget?.id ?? null,
          })
          setSelectedDirectId(result.conversation._id)
        }
        return
      }

      if (!selectedGroup?.booking_id) {
        toast.error(t("selectGroupBeforeSend"))
        if (content) {
          setDraft(previousDraft)
          setReplyTarget(previousReplyTarget)
        }
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
            reply_to_id: previousReplyTarget?.id ?? null,
          })
          setSelectedGroupId(result.conversation._id)
        }
        clearImagePreviews(toSend)
        setImagePreviews([])
        setIsUploadingImage(false)
      }

      if (content) {
        const result = await sendGroupMessageMutation.mutateAsync({
          booking_id: selectedGroup.booking_id,
          content,
          type: getOutgoingMessageType(content),
          reply_to_id: previousReplyTarget?.id ?? null,
        })
        setSelectedGroupId(result.conversation._id)
      }
    } catch (error) {
      setIsUploadingImage(false)
      // Restore the draft so the user doesn't have to retype after a send
      // failure (network drop, 4xx, blocked recipient, etc).
      if (content) {
        setDraft(previousDraft)
        setReplyTarget(previousReplyTarget)
      }
      toast.error(getErrorMessage(error, t("sendError")))
    }
  }

  const handleContactAdmin = React.useCallback(() => {
    if (!adminContact) {
      toast.error(t("adminNotFound"))
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
  }, [adminContact, directConversations, resetComposer, router, user?.id, t])

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
      toast.success(t("messageDeletedToast"))
    } catch (error) {
      toast.error(getErrorMessage(error, t("deleteError")))
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

  // Hiện spinner trong lúc Zustand đang hydrate từ sessionStorage.
  // Tránh redirect/render sai khi isAuthenticated vẫn còn là initial false.
  if (!hasHydrated || !isAuthenticated) {
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
      <div className="hidden shrink-0 flex-row justify-between gap-3 border-b px-4 py-3 md:flex md:border-b-0 md:px-0 md:pt-0 md:pb-4 lg:items-end">
        <div className="flex items-center gap-2">
          {showHomeButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              aria-label={t("home")}
            >
              <Home className="size-4" />
            </Button>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight">{headerTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden md:gap-4 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden border bg-card md:flex md:rounded-2xl",
            mobileThreadOpen ? "hidden md:flex" : "flex"
          )}
        >
          {/* Mobile-only header — visible when conversation list is shown */}
          <div className="flex shrink-0 items-center justify-between px-4 pt-safe pb-2 md:hidden">
            <div className="flex items-center gap-1">
              {showHomeButton ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-ml-2"
                  onClick={() => router.push("/")}
                  aria-label={t("home")}
                >
                  <ChevronLeft className="size-5" />
                </Button>
              ) : null}
              <h1 className="text-xl font-bold tracking-tight">{headerTitle}</h1>
            </div>
            <ThemeToggle />
          </div>
          <div className="border-b p-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors md:h-9",
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
                {t("tabDirect")}
              </button>
              <button
                type="button"
                className={cn(
                  "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors md:h-9",
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
                {t("tabGroup")}
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
                  {t("contactAdmin")}
                  <AdminVerifiedBadge />
                </span>
                <Badge
                  variant="secondary"
                  className="bg-sky-100 text-[10px] text-sky-800 dark:bg-sky-900 dark:text-sky-100"
                >
                  {t("support")}
                </Badge>
              </Button>
            ) : null}
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-xl bg-muted/60 pl-9 focus-visible:bg-background md:h-9 md:rounded-md md:bg-background"
                placeholder={t("searchPlaceholder")}
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
            "min-h-0 flex-1 flex-col overflow-hidden border bg-card md:flex md:rounded-2xl",
            mobileThreadOpen ? "flex" : "hidden md:flex"
          )}
        >
          <div className="flex min-h-14 items-center justify-between gap-2 border-b px-3 py-2 md:min-h-16 md:px-4 md:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 shrink-0 md:hidden"
                onClick={() => setMobileThreadOpen(false)}
                aria-label={t("backToList")}
              >
                <ArrowLeft className="size-5" />
              </Button>
              {mode === "direct" ? (
                <ThreadAvatar
                  mode={mode}
                  title={activeTitle}
                  avatar={selectedDirect?.other_user?.avatar}
                  highlight={isActiveDirectAdmin ? "admin" : undefined}
                  planCode={
                    selectedDirect?.other_user?.meta_data?.pricing_plan_code
                  }
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
                  {mode === "direct" && selectedDirectUserBanned ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                      <Ban className="size-3" />
                      {t("banned")}
                    </span>
                  ) : null}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {activeSubtitle}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              {mode === "direct" && directReceiverId && !isActiveDirectAdmin ? (
                <Button
                  type="button"
                  variant={selectedDirectBlocked ? "outline" : "ghost"}
                  size="icon"
                  className={cn(
                    "size-9 shrink-0",
                    selectedDirectBlocked &&
                      "text-destructive hover:text-destructive"
                  )}
                  disabled={
                    blockUserMutation.isPending || unblockUserMutation.isPending
                  }
                  onClick={() => {
                    if (selectedDirectBlocked) {
                      void handleUnblockUser()
                      return
                    }

                    setBlockDialogOpen(true)
                  }}
                  aria-label={
                    selectedDirectBlocked
                      ? t("unblockMessages")
                      : t("blockMessages")
                  }
                  title={
                    selectedDirectBlocked
                      ? t("unblockMessages")
                      : t("blockMessages")
                  }
                >
                  {blockUserMutation.isPending ||
                  unblockUserMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Ban className="size-4" />
                  )}
                </Button>
              ) : null}
              {!activeConversationId ? (
                <Badge variant="outline">{t("noneSelected")}</Badge>
              ) : null}
            </div>
          </div>

          <div
            ref={messageScrollerRef}
            className="scrollbar-none flex-1 overflow-y-auto bg-muted/20 px-3 py-4 md:px-4"
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
                setReplyTarget(getReplyTargetFromMessage(t, message))
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
              ? t("typing", { user: shortenId(activeTypingUser) })
              : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3 pb-safe">
            {directRoleBlockedReason ? (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {directRoleBlockedReason}
              </div>
            ) : null}
            {replyTarget ? (
              <div className="mb-2 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <Reply className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("replyingToLabel")}{" "}
                    {replyTarget.senderId === user?.id
                      ? t("you")
                      : mode === "direct"
                        ? selectedDirect?.other_user?.full_name ||
                          selectedDirect?.other_user?.email ||
                          t("sender")
                        : t("member")}
                  </p>
                  <p className="truncate text-sm">{replyTarget.content}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => setReplyTarget(null)}
                  aria-label={t("cancelReply")}
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
                      alt={t("imageAlt", { index: index + 1 })}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImagePreview(index)}
                      className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      aria-label={t("removeImage")}
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    isSending ||
                    isUploadingImage ||
                    Boolean(directRoleBlockedReason)
                  }
                  className="flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                  aria-label={t("addImage")}
                >
                  <ImagePlus className="size-5" />
                </button>
              </div>
            ) : null}
            {(selectedDirectBlocked || selectedDirectBlockedMe) ? (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
                {selectedDirectBlocked
                  ? t("youBlockedNotice")
                  : t("blockedByNotice")}
              </div>
            ) : null}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
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
                        Boolean(directRoleBlockedReason) ||
                        selectedDirectBlocked ||
                        selectedDirectBlockedMe ||
                        (mode === "direct" && !directReceiverId) ||
                        (mode === "group" && !selectedGroup)
                      }
                      aria-label={t("selectImage")}
                    >
                      <ImagePlus className="size-4" />
                    </Button>
                    <textarea
                      value={draft}
                      onChange={handleDraftChange}
                      onKeyDown={handleDraftKeyDown}
                      placeholder={
                        selectedDirectBlocked || selectedDirectBlockedMe
                          ? selectedDirectBlocked
                            ? t("blockedPlaceholder")
                            : t("blockedByPlaceholder")
                          : activeConversationId ||
                              (mode === "direct" && directReceiverId)
                            ? t("inputPlaceholder")
                            : t("selectConversation")
                      }
                      rows={1}
                      disabled={
                        isSending ||
                        Boolean(directRoleBlockedReason) ||
                        selectedDirectBlocked ||
                        selectedDirectBlockedMe ||
                        (mode === "direct" && !directReceiverId) ||
                        (mode === "group" && !selectedGroup)
                      }
                      className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-input bg-muted/50 px-4 py-2.5 text-sm shadow-none transition-colors outline-none placeholder:text-muted-foreground focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:min-h-10 md:rounded-md md:bg-background"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={
                        isSending ||
                        Boolean(directRoleBlockedReason) ||
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
                </TooltipTrigger>
                {(selectedDirectBlocked || selectedDirectBlockedMe) ? (
                  <TooltipContent side="top">
                    {selectedDirectBlocked
                      ? t("youBlockedTooltip")
                      : t("blockedByTooltip")}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </form>
        </section>
      </div>
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("blockDialogTitle")}</DialogTitle>
            <DialogDescription>{t("blockDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="block-profile"
              checked={blockProfile}
              onCheckedChange={(value) => setBlockProfile(Boolean(value))}
            />
            <Label htmlFor="block-profile" className="text-sm leading-5">
              {t("blockProfileLabel")}
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBlockDialogOpen(false)}
              disabled={blockUserMutation.isPending}
            >
              {t("cancel")}
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
              {t("block")}
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
  const t = useTranslations("Chat")
  const localeTag = useLocaleTag()
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-7" />
        </div>
        <p>{t("noConversations")}</p>
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
          ? getDirectTitle(t, directConversation)
          : getGroupTitle(t, groupConversation)
        const subtitle = isDirect
          ? getDirectSubtitle(t, directConversation, currentUserId)
          : getGroupMemberNames(t, groupConversation, currentUserId)
        const lastMessage = isDirect
          ? getMessagePreview(t, directConversation?.last_message_data)
          : getMessagePreview(t, groupConversation?.last_message_data)
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
        const isOtherUserBanned = isDirect && directConversation?.other_user?.status === "banned"

        return (
          <button
            key={conversation._id}
            type="button"
            className={cn(
              "flex w-full items-start gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-accent active:bg-accent/80 md:px-3 md:py-3",
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
                  {isOtherUserBanned ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                      <Ban className="size-2.5" />
                      {t("bannedShort")}
                    </span>
                  ) : null}
                </p>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatTime(updatedAt, localeTag)}
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
      <div className={cn("relative size-10 shrink-0 overflow-hidden rounded-full", ringClass, className)}>
        <Image
          src={avatar}
          alt={title}
          fill
          sizes="40px"
          className="object-cover"
        />
        {highlight === "admin" ? (
          <BadgeCheck className="absolute -right-0.5 -bottom-0.5 z-10 size-4 rounded-full fill-sky-500 text-white" />
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn("relative size-10 shrink-0", className)}>
      <div
        className={cn(
          "flex size-full items-center justify-center rounded-full text-sm font-semibold",
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
  const t = useTranslations("Chat")
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
        const name = getMemberName(t, member)

        return member.avatar ? (
          <div
            key={member._id}
            className={cn(
              "relative size-8 shrink-0 overflow-hidden rounded-full border-2 border-card",
              index > 0 && "-ml-4"
            )}
          >
            <Image
              src={member.avatar}
              alt={name}
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            key={member._id}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-card bg-amber-100 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200",
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
  const t = useTranslations("Chat")
  const localeTag = useLocaleTag()
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
            {formatDateTime(booking.schedule.start_time, localeTag)} -{" "}
            {formatDateTime(booking.schedule.end_time, localeTag)}
          </p>
        </div>
        <Badge variant="outline">{booking.status}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <p className="truncate">Client: {getMemberName(t, booking.client)}</p>
        <p className="truncate">Worker: {getMemberName(t, booking.worker)}</p>
      </div>
      {booking.dispute ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">
            {t("dispute", { reason: booking.dispute.reason })}
          </p>
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
  const t = useTranslations("Chat")
  const localeTag = useLocaleTag()
  const groupMemberMap = new Map(
    (groupConversation?.members_data ?? []).map((member) => [
      member._id,
      member,
    ])
  )

  // Lightbox state
  const imageMessages = React.useMemo(
    () => messages.filter((m) => m.type === "image" && !m.is_deleted),
    [messages]
  )
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null)
  const lightboxIndex = lightboxUrl
    ? imageMessages.findIndex((m) => m.content === lightboxUrl)
    : -1

  const openLightbox = React.useCallback((url: string) => setLightboxUrl(url), [])
  const closeLightbox = React.useCallback(() => setLightboxUrl(null), [])
  const gotoPrev = React.useCallback(() => {
    if (lightboxIndex > 0) setLightboxUrl(imageMessages[lightboxIndex - 1].content)
  }, [lightboxIndex, imageMessages])
  const gotoNext = React.useCallback(() => {
    if (lightboxIndex < imageMessages.length - 1)
      setLightboxUrl(imageMessages[lightboxIndex + 1].content)
  }, [lightboxIndex, imageMessages])

  // Mobile: Messenger-style context menu on long press
  type MessageSelection = {
    message: ChatMessage | GroupChatMessage
    rect: DOMRect
    mine: boolean
  }
  const [messageSelection, setMessageSelection] = React.useState<MessageSelection | null>(null)
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard navigation for lightbox — phải ở đây (trước early returns) để không vi phạm Rules of Hooks
  React.useEffect(() => {
    if (!lightboxUrl) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox()
      if (e.key === "ArrowLeft") gotoPrev()
      if (e.key === "ArrowRight") gotoNext()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxUrl, closeLightbox, gotoPrev, gotoNext])

  // Long press handlers — capture rect at fire time for accurate positioning
  const createLongPressHandlers = (
    msg: ChatMessage | GroupChatMessage,
    isMine: boolean
  ) => ({
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault()
      const target = e.currentTarget
      longPressTimerRef.current = setTimeout(() => {
        const rect = target.getBoundingClientRect()
        setMessageSelection({ message: msg, rect, mine: isMine })
      }, 500)
    },
    onTouchEnd: () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    },
    onTouchMove: () => {
      // Cancel if user is scrolling
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    },
  })

  if (!selectedConversationId) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <MessageCircle className="size-10" />
        <p>{t("selectConversationToStart")}</p>
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
        <p>{t("noMessagesInConversation")}</p>
      </div>
    )
  }

  return (
    <>
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
              ? t("youSender")
              : directPeer?.full_name || directPeer?.email || t("senderFallback")
            : mine
              ? t("youSender")
              : getMemberName(t, groupSender)

        return (
          <div
            key={message._id}
            {...createLongPressHandlers(message, mine)}
            className={cn(
              "group/message flex items-end gap-2 select-none",
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
                    {t("reply")}{" "}
                    {replyMessage.sender_id === currentUserId
                      ? t("you")
                      : mode === "direct"
                        ? directPeer?.full_name ||
                          directPeer?.email ||
                          t("sender")
                        : t("member")}
                  </p>
                  <p className="line-clamp-2">
                    {getMessagePreview(t, replyMessage)}
                  </p>
                </div>
              ) : null}
              <MessageContent message={message} mine={mine} onImageClick={openLightbox} />
              <div
                className={cn(
                  "mt-1 flex items-center justify-end gap-2 text-[11px]",
                  mine ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                <span>{formatTime(message.created_at, localeTag)}</span>
                {mine && directMessage ? (
                  <span className="flex items-center gap-1">
                    {directMessage.is_read ? (
                      <CheckCheck className="size-3" />
                    ) : (
                      <Check className="size-3" />
                    )}
                    {directMessage.is_read ? t("read") : t("sent")}
                  </span>
                ) : null}
                {directMessage?.read_at ? (
                  <span>{formatTime(directMessage.read_at, localeTag)}</span>
                ) : null}
                {groupReadCount > 0 ? (
                  <span>{t("readByCount", { count: groupReadCount })}</span>
                ) : null}
              </div>
            </div>
            {/* Action buttons — desktop hover only; mobile uses context overlay */}
            <div
              className="hidden shrink-0 items-center gap-1 opacity-0 transition-opacity md:flex md:group-hover/message:opacity-100"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onReply(message)}
                aria-label={t("reply")}
              >
                <Reply className="size-4" />
              </Button>
              {!message.is_deleted && message.type === "text" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content).catch(() => {})
                    toast.success(t("copied"))
                  }}
                  aria-label={t("copy")}
                >
                  <Copy className="size-4" />
                </Button>
              ) : null}
              {mode === "direct" && mine ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 dark:text-red-400"
                  onClick={() => onDeleteDirect(message._id)}
                  disabled={deletingMessageId === message._id}
                  aria-label={t("deleteMessage")}
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
    {/* Messenger-style context overlay (mobile only, rendered in portal) */}
    {messageSelection && typeof document !== "undefined"
      ? createPortal(
          <MessageContextOverlay
            selection={messageSelection}
            mode={mode}
            onReply={() => {
              onReply(messageSelection.message)
              setMessageSelection(null)
            }}
            onCopy={() => {
              navigator.clipboard.writeText(messageSelection.message.content).catch(() => {})
              toast.success(t("copied"))
              setMessageSelection(null)
            }}
            onDeleteDirect={() => {
              onDeleteDirect(messageSelection.message._id)
              setMessageSelection(null)
            }}
            onClose={() => setMessageSelection(null)}
            deletingMessageId={deletingMessageId}
          />,
          document.body
        )
      : null}
    {/* Image lightbox */}
    {lightboxUrl && typeof document !== "undefined"
      ? createPortal(
          <ImageLightbox
            url={lightboxUrl}
            index={lightboxIndex}
            total={imageMessages.length}
            onClose={closeLightbox}
            onPrev={lightboxIndex > 0 ? gotoPrev : undefined}
            onNext={lightboxIndex < imageMessages.length - 1 ? gotoNext : undefined}
          />,
          document.body
        )
      : null}
  </>
  )
}

function MessageContent({
  message,
  mine,
  onImageClick,
}: {
  message: ChatMessage | GroupChatMessage
  mine: boolean
  onImageClick?: (url: string) => void
}) {
  const t = useTranslations("Chat")
  if (message.is_deleted) {
    return (
      <p
        className={cn(
          "text-sm italic",
          mine ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
      >
        {t("messageDeleted")}
      </p>
    )
  }

  if (message.type === "image") {
    return (
      <button
        type="button"
        className="block overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onImageClick?.(message.content)}
        aria-label={t("viewImage")}
      >
        <Image
          src={message.content}
          width={640}
          height={480}
          alt={t("imageInMessage")}
          className="max-h-80 max-w-full rounded-md object-contain transition-opacity hover:opacity-90"
        />
      </button>
    )
  }

  return (
    <p className="text-sm leading-6 break-words whitespace-pre-wrap">
      {message.content}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Messenger-style context overlay (mobile only, rendered via portal)
// ---------------------------------------------------------------------------
function MessageContextOverlay({
  selection,
  mode,
  onReply,
  onCopy,
  onDeleteDirect,
  onClose,
  deletingMessageId,
}: {
  selection: {
    message: ChatMessage | GroupChatMessage
    rect: DOMRect
    mine: boolean
  }
  mode: ChatMode
  onReply: () => void
  onCopy: () => void
  onDeleteDirect: () => void
  onClose: () => void
  deletingMessageId: string | null
}) {
  const t = useTranslations("Chat")
  const { message, rect, mine } = selection
  const isDeleting = deletingMessageId === message._id
  const canDelete = mode === "direct" && mine
  const isTextMessage = message.type === "text" && !message.is_deleted

  // Calculate menu height to decide above/below placement
  const menuItemCount = 1 + (isTextMessage ? 1 : 0) + (canDelete ? 1 : 0) // Reply [+ Copy] [+ Delete]
  const ITEM_H = 52
  const menuHeight = menuItemCount * ITEM_H + 16
  const GAP = 10
  const screenH = typeof window !== "undefined" ? window.innerHeight : 800

  // Prefer below; fall back to above if not enough space
  const spaceBelow = screenH - rect.bottom
  const menuTop =
    spaceBelow >= menuHeight + GAP
      ? rect.bottom + GAP
      : Math.max(8, rect.top - GAP - menuHeight)

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Blurred dark backdrop */}
      <div
        className="absolute inset-0 animate-in fade-in-0 duration-200 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Message bubble — "floating" copy at original position */}
      <div
        className="pointer-events-none absolute left-0 right-0 animate-in fade-in-0 zoom-in-95 duration-150"
        style={{ top: rect.top }}
      >
        <div
          className={cn(
            "flex items-end gap-2 px-3",
            mine ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[min(78%,40rem)] rounded-lg px-3 py-2 shadow-2xl ring-2 ring-white/10",
              mine
                ? "bg-primary text-primary-foreground"
                : "border bg-background"
            )}
          >
            <MessageContent message={message} mine={mine} />
          </div>
        </div>
      </div>

      {/* Context action menu */}
      <div
        className={cn(
          "absolute z-10 min-w-[220px] overflow-hidden rounded-2xl shadow-2xl",
          "bg-zinc-800 dark:bg-zinc-900",
          "animate-in fade-in-0 slide-in-from-bottom-3 duration-200",
          mine ? "right-4" : "left-4"
        )}
        style={{ top: menuTop }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reply */}
        <button
          type="button"
          className="flex w-full items-center justify-between border-b border-zinc-700 px-5 py-3.5 text-left text-[15px] text-white active:bg-zinc-700/80"
          onClick={onReply}
        >
          <span>{t("reply")}</span>
          <Reply className="size-5 text-white/60" />
        </button>

        {/* Copy (text messages only) */}
        {isTextMessage ? (
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between px-5 py-3.5 text-left text-[15px] text-white active:bg-zinc-700/80",
              canDelete && "border-b border-zinc-700"
            )}
            onClick={onCopy}
          >
            <span>{t("copy")}</span>
            <Copy className="size-5 text-white/60" />
          </button>
        ) : null}

        {/* Delete (own messages in direct mode) */}
        {canDelete ? (
          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[15px] text-red-400 active:bg-zinc-700/80 disabled:opacity-50"
            onClick={onDeleteDirect}
            disabled={isDeleting}
          >
            <span>{t("deleteMessage")}</span>
            {isDeleting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Trash2 className="size-5" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Image lightbox popup
// ---------------------------------------------------------------------------
function ImageLightbox({
  url,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  url: string
  index: number
  total: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const t = useTranslations("Chat")
  const [scale, setScale] = React.useState(1)

  // Reset zoom when image changes
  React.useEffect(() => {
    setScale(1)
  }, [url])

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScale((s) => Math.min(s + 0.5, 4))
  }
  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setScale((s) => Math.max(s - 0.5, 0.5))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 text-white/80"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm">
          {total > 1 ? `${index + 1} / ${total}` : t("viewImage")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="flex size-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-30"
            aria-label={t("zoomOut")}
          >
            <ZoomOut className="size-5" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={scale >= 4}
            className="flex size-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-30"
            aria-label={t("zoomIn")}
          >
            <ZoomIn className="size-5" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-white/70 hover:bg-white/10"
            aria-label={t("openOriginalAria")}
          >
            {t("openOriginal")}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
            aria-label={t("close")}
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      {onPrev ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          aria-label={t("prevImage")}
        >
          <ChevronLeft className="size-6" />
        </button>
      ) : null}
      {onNext ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          aria-label={t("nextImage")}
        >
          <ChevronRight className="size-6" />
        </button>
      ) : null}

      {/* Image */}
      <div
        className="flex max-h-[85dvh] max-w-[90vw] items-center justify-center overflow-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: scale > 1 ? "grab" : "default" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={t("viewImage")}
          className="rounded-md object-contain transition-transform duration-200"
          style={{
            maxHeight: "85dvh",
            maxWidth: "90vw",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
