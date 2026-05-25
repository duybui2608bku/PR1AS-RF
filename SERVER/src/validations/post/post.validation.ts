import { z } from "zod";
import {
  POST_LIMITS,
  PostMediaType,
  PostVisibility,
} from "../../constants/post";
import { POST_MESSAGES } from "../../constants/messages";
import { config } from "../../config";

// Hard caps on user-supplied media metadata. Without these, a client can lie
// about byte_size / duration_seconds and slip oversize or excessively long
// assets past server checks (CDN bandwidth abuse, autoplay loops, billing).
// mime_type is also constrained to a whitelist that must agree with the
// declared media `type` — claiming an MP4 is an image (or vice versa) would
// let a caller bypass type-specific limits downstream.
const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;
const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
] as const;
const MAX_IMAGE_BYTE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTE_SIZE = 200 * 1024 * 1024; // 200 MB
const MAX_VIDEO_DURATION_SECONDS = 600; // 10 min

const isAllowedMediaUrl = (raw: string): boolean => {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    const allowedHosts = config.media.allowedHosts;
    if (allowedHosts.length === 0) {
      // No whitelist configured -> dev convenience: allow any https URL.
      return url.protocol === "https:";
    }
    return allowedHosts.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
};

const mediaItemSchema = z
  .object({
    type: z.nativeEnum(PostMediaType),
    url: z
      .string()
      .trim()
      .url(POST_MESSAGES.INVALID_MEDIA_URL)
      .refine(isAllowedMediaUrl, {
        message: POST_MESSAGES.INVALID_MEDIA_HOST,
      }),
    sort_order: z.number().int().min(0).optional(),
    mime_type: z.string().trim().toLowerCase().max(255).nullable().optional(),
    byte_size: z.number().int().min(0).nullable().optional(),
    duration_seconds: z.number().int().min(0).nullable().optional(),
    storage_key: z.string().trim().max(512).nullable().optional(),
  })
  .superRefine((item, ctx) => {
    if (item.type === PostMediaType.IMAGE) {
      if (
        item.mime_type != null &&
        !ALLOWED_IMAGE_MIME_TYPES.includes(
          item.mime_type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mime_type"],
          message: "mime_type does not match an allowed image type",
        });
      }
      if (item.byte_size != null && item.byte_size > MAX_IMAGE_BYTE_SIZE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["byte_size"],
          message: `byte_size exceeds image limit (${MAX_IMAGE_BYTE_SIZE} bytes)`,
        });
      }
      if (item.duration_seconds != null && item.duration_seconds !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["duration_seconds"],
          message: "duration_seconds must be 0 or null for image media",
        });
      }
      return;
    }

    if (item.type === PostMediaType.VIDEO) {
      if (
        item.mime_type != null &&
        !ALLOWED_VIDEO_MIME_TYPES.includes(
          item.mime_type as (typeof ALLOWED_VIDEO_MIME_TYPES)[number]
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mime_type"],
          message: "mime_type does not match an allowed video type",
        });
      }
      if (item.byte_size != null && item.byte_size > MAX_VIDEO_BYTE_SIZE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["byte_size"],
          message: `byte_size exceeds video limit (${MAX_VIDEO_BYTE_SIZE} bytes)`,
        });
      }
      if (
        item.duration_seconds != null &&
        item.duration_seconds > MAX_VIDEO_DURATION_SECONDS
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["duration_seconds"],
          message: `duration_seconds exceeds limit (${MAX_VIDEO_DURATION_SECONDS}s)`,
        });
      }
    }
  });

export const createPostSchema = z.object({
  body: z
    .string()
    .trim()
    .min(POST_LIMITS.MIN_BODY_LENGTH, POST_MESSAGES.INVALID_BODY_LENGTH)
    .max(POST_LIMITS.MAX_BODY_LENGTH, POST_MESSAGES.INVALID_BODY_LENGTH),
  media: z
    .array(mediaItemSchema)
    .max(POST_LIMITS.MAX_MEDIA_PER_POST, POST_MESSAGES.TOO_MANY_MEDIA)
    .optional()
    .default([]),
  visibility: z.nativeEnum(PostVisibility).optional(),
});

export const updatePostSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(POST_LIMITS.MIN_BODY_LENGTH, POST_MESSAGES.INVALID_BODY_LENGTH)
      .max(POST_LIMITS.MAX_BODY_LENGTH, POST_MESSAGES.INVALID_BODY_LENGTH)
      .optional(),
    media: z
      .array(mediaItemSchema)
      .max(POST_LIMITS.MAX_MEDIA_PER_POST, POST_MESSAGES.TOO_MANY_MEDIA)
      .optional(),
    visibility: z.nativeEnum(PostVisibility).optional(),
  })
  .refine(
    (data) =>
      data.body !== undefined ||
      data.media !== undefined ||
      data.visibility !== undefined,
    { message: POST_MESSAGES.AT_LEAST_ONE_FIELD_REQUIRED }
  );

export const setCommentsLockSchema = z.object({
  locked: z.boolean(),
});

export const getPostsQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : POST_LIMITS.FEED_DEFAULT_LIMIT
    )
    .pipe(z.number().int().positive().min(1).max(POST_LIMITS.FEED_MAX_LIMIT)),
  author_id: z.string().trim().min(1).optional(),
  hashtag: z.string().trim().min(1).max(50).optional(),
});

export type CreatePostSchemaType = z.infer<typeof createPostSchema>;
export type UpdatePostSchemaType = z.infer<typeof updatePostSchema>;
export type GetPostsQuerySchemaType = z.infer<typeof getPostsQuerySchema>;
export type SetCommentsLockSchemaType = z.infer<typeof setCommentsLockSchema>;
