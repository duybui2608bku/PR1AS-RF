export type Paginated<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type ApiResponse<T> = {
  data: T
  message?: string
  success: boolean
}

export type Nullable<T> = T | null
export type Maybe<T> = T | null | undefined

// ─── Cursor Pagination ────────────────────────────────────────────────────────
export type CursorPaginatedResponse<T> = {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

// ─── Hashtag ──────────────────────────────────────────────────────────────────
export type HashtagPublic = {
  slug: string
  display: string
}

export type TrendingHashtag = {
  slug: string
  display: string
  post_count: number
}

// ─── Post ─────────────────────────────────────────────────────────────────────
export type PostVisibility = "public" | "private"

export type PostAuthor = {
  id: string
  full_name: string | null
  avatar: string | null
  has_worker_profile: boolean
}

export type PostMediaPublic = {
  id: string
  type: "image" | "video"
  url: string
  sort_order: number
  mime_type: string | null
  byte_size: number | null
  duration_seconds: number | null
}

export type PostPublic = {
  id: string
  author: PostAuthor
  body: string
  media: PostMediaPublic[]
  hashtags: HashtagPublic[]
  visibility: PostVisibility
  created_at: string
  updated_at: string
}

export type CreatePostPayload = {
  body: string
  visibility?: PostVisibility
  media?: {
    type: "image" | "video"
    url: string
    sort_order?: number
    mime_type?: string
    byte_size?: number
    duration_seconds?: number
    storage_key?: string
  }[]
}

export type UpdatePostPayload = Partial<CreatePostPayload>

export type PostFeedParams = {
  cursor?: string
  limit?: number
  author_id?: string
  hashtag?: string
}

export type CommentAuthor = {
  id: string
  full_name: string | null
  avatar: string | null
  has_worker_profile: boolean
}

export type CommentPublic = {
  id: string
  post_id: string
  parent_comment_id: string | null
  author: CommentAuthor
  body: string
  created_at: string
  updated_at: string
}

export type CommentThreadItem = CommentPublic & {
  parent_comment_id: null
  replies: CommentPublic[]
}

export type CreatedComment = CommentPublic & {
  replies: CommentPublic[]
}

export type CommentsPage = {
  data: CommentThreadItem[]
  next_cursor: string | null
  has_more: boolean
}

export type CreateCommentPayload = {
  body: string
  parent_comment_id?: string | null
}

export type UpdateCommentPayload = {
  body: string
}

export type CommentListParams = {
  cursor?: string
  limit?: number
}

// ─── Group Chat ───────────────────────────────────────────────────────────────
export type MessageType = "text" | "image" | "file"

export type IMessageGroupReadBy = {
  user_id: string
  read_at: string
}

export type IMessageGroup = {
  _id: string
  conversation_group_id: string
  sender_id: string
  type: MessageType
  content: string
  read_by: IMessageGroupReadBy[]
  is_deleted: boolean
  reply_to_id: string | null
  created_at: string
  updated_at: string
}

export type IConversationGroup = {
  _id: string
  booking_id: string
  name: string
  members: string[]
  last_message: string | null
  created_at: string
  updated_at: string
}

export type GroupConversationWithLastMessage = IConversationGroup & {
  last_message_data?: IMessageGroup
  unread_count?: number
}

export type GroupConversationsResponse = {
  conversations: GroupConversationWithLastMessage[]
  total: number
  page: number
  limit: number
}

export type GroupMessagesResponse = {
  messages: IMessageGroup[]
  total: number
  page: number
  limit: number
}

export type SendGroupMessagePayload = {
  booking_id: string
  type: MessageType
  content: string
  reply_to_id?: string | null
}

export type SendGroupMessageResponse = {
  message: IMessageGroup
  conversation: IConversationGroup
}
