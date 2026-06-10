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
  meta_data?: {
    pricing_plan_code?: string | null
  }
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

export type ReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry"

export const REACTION_TYPES: ReactionType[] = [
  "like",
  "love",
  "haha",
  "wow",
  "sad",
  "angry",
]

export type ReactionTargetType = "post" | "comment"

export type ReactionSummaryPublic = {
  total: number
  counts: Partial<Record<ReactionType, number>>
  my_reaction: ReactionType | null
}

export type PostRegistrantWorker = {
  id: string
  full_name: string | null
  avatar: string | null
}

export type PostRegistrantPublic = {
  id: string
  worker: PostRegistrantWorker
  created_at: string
}

export type PostPublic = {
  id: string
  author: PostAuthor
  body: string
  media: PostMediaPublic[]
  hashtags: HashtagPublic[]
  visibility: PostVisibility
  comments_count: number
  comments_locked: boolean
  reactions: ReactionSummaryPublic
  registrations_count: number
  my_registration: boolean
  created_at: string
  updated_at: string
}

export type UpsertReactionPayload = {
  target_type: ReactionTargetType
  target_id: string
  type: ReactionType
}

export type RemoveReactionPayload = {
  target_type: ReactionTargetType
  target_id: string
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

// ─── Worker ───────────────────────────────────────────────────────────────────
export type WorkerGender = "MALE" | "FEMALE" | "OTHER"

export type WorkerExperience =
  | "LESS_THAN_1"
  | "ONE_TO_3"
  | "THREE_TO_5"
  | "FIVE_TO_10"
  | "MORE_THAN_10"

export interface WorkLocationRef {
  province_code: number
  ward_code?: number | null
  label_snapshot?: string
}

export const isProvinceLevelLocation = (ref: WorkLocationRef): boolean =>
  ref.ward_code == null

export type WorkerProfilePublic = {
  date_of_birth?: string | null
  gender?: WorkerGender
  height_cm?: number | null
  weight_kg?: number | null
  star_sign?: string | null
  lifestyle?: string | null
  hobbies?: string[]
  quote?: string | null
  introduction?: string | null
  gallery_urls?: string[]
  experience?: WorkerExperience
  title?: string | null
  work_locations?: WorkLocationRef[]
  coords?: {
    latitude: number | null
    longitude: number | null
  }
}

export type WorkerProfileUpdateInput = Omit<WorkerProfilePublic, "coords"> & {
  coords?: { latitude: number; longitude: number }
}

export type WorkerPricingUnit = "HOURLY" | "DAILY" | "MONTHLY"

export type WorkerPricingSlot = {
  unit: WorkerPricingUnit
  duration: number
  price: number
  currency?: string
}

export type WorkerServiceUpsertItem = {
  service_id: string
  pricing: WorkerPricingSlot[]
}

export type WorkerServiceUpsertPayload = {
  services: WorkerServiceUpsertItem[]
}

export type WorkerServicePricing = {
  unit: WorkerPricingUnit
  duration: number
  price: number
  currency: string
}

export type WorkerServiceItem = {
  _id: string
  service_id: string
  service_code: string
  pricing: WorkerServicePricing[]
  is_active: boolean
}

export type WorkerReviewStats = {
  total: number
  average: number
  distribution?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>
}

export type WorkerReviewItem = {
  id: string
  rating: number
  comment: string
  client: {
    id: string
    full_name: string | null
    avatar: string | null
    meta_data?: {
      pricing_plan_code?: string | null
    }
  }
  worker_reply: string | null
  worker_replied_at: string | null
  created_at: string
}

export type WorkerDetail = {
  user: {
    id: string
    full_name: string | null
    avatar: string | null
    email: string
    meta_data?: {
      pricing_plan_code?: string | null
      reputation_score?: number
    }
  }
  worker_profile: WorkerProfilePublic | null
  services?: WorkerServiceItem[]
  review_stats?: WorkerReviewStats
  reviews?: WorkerReviewItem[]
}

export type WorkerSuggestion = {
  id: string
  full_name: string | null
  avatar: string | null
  worker_profile: {
    title: string | null
    introduction: string | null
    gallery_urls: string[]
    work_locations: WorkLocationRef[]
  } | null
  matched_service: {
    id: string
    code: string
    name: {
      en?: string | null
      vi?: string | null
      zh?: string | null
      ko?: string | null
    }
    category: string
  }
  pricing: WorkerServicePricing | null
  review_stats: {
    total: number
    average: number
  }
  completed_bookings: number
  price_difference_percent: number | null
}

export type WorkerFavoriteService = {
  service_id: string
  service_code: string
  pricing: WorkerServicePricing[]
  service: {
    id: string
    code: string
    name: {
      en?: string | null
      vi?: string | null
      zh?: string | null
      ko?: string | null
    }
    category: string
  } | null
}

export type WorkerFavorite = {
  id: string
  favorited_at: string
  full_name: string | null
  avatar: string | null
  worker_profile: {
    title: string | null
    introduction: string | null
    gallery_urls: string[]
    work_locations: WorkLocationRef[]
  } | null
  services: WorkerFavoriteService[]
}

export type WorkerFavoriteMutationResult = {
  worker_id: string
  is_favorite: boolean
}

export type WorkerScheduleItem = {
  booking_id: string
  start_time: string
  end_time: string
  status: string
}

export type WorkerScheduleBlackoutItem = {
  blackout_id: string
  start_time: string
  end_time: string
  reason: string | null
}

export type WorkerScheduleResponse = {
  bookings: WorkerScheduleItem[]
  blackouts: WorkerScheduleBlackoutItem[]
}

export type WorkerBlackoutItem = {
  id: string
  start_time: string
  end_time: string
  reason: string | null
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

export type GroupChatMember = {
  _id: string
  full_name: string | null
  avatar: string | null
  email: string
  roles: string[]
}

export type GroupChatBooking = {
  _id: string
  service_code: string
  status: string
  schedule: {
    start_time: string
    end_time: string
    duration_hours: number
  }
  pricing: {
    unit: string
    quantity: number
  }
  client_id: string
  worker_id: string
  client?: GroupChatMember
  worker?: GroupChatMember
  dispute?: {
    reason: string
    description: string
    evidence_urls: string[]
    disputed_by: string
    disputed_at: string
    resolution: string | null
    resolution_notes: string
    resolved_by: string | null
    resolved_at: string | null
  } | null
  disputed_at: string | null
}

export type GroupConversationWithLastMessage = IConversationGroup & {
  last_message_data?: IMessageGroup
  unread_count?: number
  members_data?: GroupChatMember[]
  booking_data?: GroupChatBooking
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
