import { z } from "zod"
import { FEED_CONSTANTS } from "../constants/feed.constants"

export type PostMediaType = "image" | "video"
export type PostVisibility = "public" | "private"

export interface PostAuthor {
  id: string
  full_name: string | null
  avatar: string | null
  has_worker_profile: boolean
}

export interface PostMedia {
  id: string
  type: PostMediaType
  url: string
  sort_order: number
  mime_type: string | null
  byte_size: number | null
  duration_seconds: number | null
}

export interface PostHashtag {
  slug: string
  display: string
}

export interface Post {
  id: string
  author: PostAuthor
  body: string
  media: PostMedia[]
  hashtags: PostHashtag[]
  visibility: PostVisibility
  created_at: string
  updated_at: string
}

export interface FeedPage {
  data: Post[]
  next_cursor: string | null
  has_more: boolean
}

export interface CommentAuthor {
  id: string
  full_name: string | null
  avatar: string | null
  has_worker_profile: boolean
}

/** Comment / reply phẳng (PATCH response, hoặc reply dưới thread) */
export interface CommentFlat {
  id: string
  post_id: string
  parent_comment_id: string | null
  author: CommentAuthor
  body: string
  created_at: string
  updated_at: string
}

/** Reply dưới comment gốc */
export type CommentReply = CommentFlat

/** Comment gốc — có replies (tối đa 1 cấp) */
export interface CommentThreadItem {
  id: string
  post_id: string
  parent_comment_id: null
  author: CommentAuthor
  body: string
  created_at: string
  updated_at: string
  replies: CommentReply[]
}

export interface CommentsPage {
  data: CommentThreadItem[]
  next_cursor: string | null
  has_more: boolean
}

export interface TrendingHashtagItem {
  slug: string
  display: string
  post_count: number
}

export interface TrendingHashtagsResponse {
  items: TrendingHashtagItem[]
}

export interface MyPostStats {
  published_posts_count: number
}

export interface CreatePostMediaInput {
  type: PostMediaType
  url: string
  sort_order?: number
  mime_type?: string | null
  byte_size?: number | null
  duration_seconds?: number | null
  storage_key?: string | null
}

export interface CreatePostInput {
  body: string
  media?: CreatePostMediaInput[]
  visibility?: PostVisibility
}

export interface UpdatePostInput {
  body?: string
  media?: CreatePostMediaInput[]
  visibility?: PostVisibility
}

export interface CreateCommentInput {
  body: string
  parent_comment_id?: string | null
}

const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  sort_order: z.number().int().min(0).optional(),
  mime_type: z.string().nullable().optional(),
  byte_size: z.number().int().min(0).nullable().optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  storage_key: z.string().nullable().optional(),
})

export const createPostBodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "required")
    .max(FEED_CONSTANTS.BODY_MAX_CHARS),
  media: z.array(mediaItemSchema).max(FEED_CONSTANTS.MEDIA_MAX_ITEMS).optional(),
  visibility: z.enum(["public", "private"]).optional(),
})

export const updatePostBodySchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1)
      .max(FEED_CONSTANTS.BODY_MAX_CHARS)
      .optional(),
    media: z.array(mediaItemSchema).max(FEED_CONSTANTS.MEDIA_MAX_ITEMS).optional(),
    visibility: z.enum(["public", "private"]).optional(),
  })
  .refine((v) => v.body !== undefined || v.media !== undefined || v.visibility !== undefined, {
    message: "atLeastOneField",
  })

export const createCommentBodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1)
    .max(FEED_CONSTANTS.COMMENT_MAX_CHARS),
  parent_comment_id: z.string().optional().nullable(),
})

export const updateCommentBodySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1)
    .max(FEED_CONSTANTS.COMMENT_MAX_CHARS),
})
