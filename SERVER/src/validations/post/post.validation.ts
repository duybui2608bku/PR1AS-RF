import { z } from "zod";
import {
  POST_LIMITS,
  PostMediaType,
  PostVisibility,
} from "../../constants/post";
import { POST_MESSAGES } from "../../constants/messages";
import { config } from "../../config";

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

const mediaItemSchema = z.object({
  type: z.nativeEnum(PostMediaType),
  url: z
    .string()
    .trim()
    .url(POST_MESSAGES.INVALID_MEDIA_URL)
    .refine(isAllowedMediaUrl, {
      message: POST_MESSAGES.INVALID_MEDIA_HOST,
    }),
  sort_order: z.number().int().min(0).optional(),
  mime_type: z.string().trim().max(255).nullable().optional(),
  byte_size: z.number().int().min(0).nullable().optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  storage_key: z.string().trim().max(512).nullable().optional(),
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
