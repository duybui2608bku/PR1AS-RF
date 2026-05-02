export enum PostVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum PostMediaType {
  IMAGE = "image",
  VIDEO = "video",
}

export const POST_LIMITS = {
  MIN_BODY_LENGTH: 1,
  MAX_BODY_LENGTH: 5000,
  MAX_MEDIA_PER_POST: 10,
  MAX_HASHTAGS_PER_POST: 10,
  FEED_DEFAULT_LIMIT: 10,
  FEED_MAX_LIMIT: 50,
  COMMENTS_DEFAULT_LIMIT: 20,
  COMMENTS_MAX_LIMIT: 100,
} as const;
