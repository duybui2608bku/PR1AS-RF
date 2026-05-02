export const HASHTAG_LIMITS = {
  MAX_PER_POST: 10,
  MAX_LENGTH: 50,
  TRENDING_DEFAULT_LIMIT: 10,
  TRENDING_MAX_LIMIT: 50,
} as const;

export const TRENDING_WINDOW_HOURS = {
  "24h": 24,
  "7d": 24 * 7,
} as const;

export type TrendingWindowKey = keyof typeof TRENDING_WINDOW_HOURS;

export const TRENDING_WINDOW_KEYS: TrendingWindowKey[] = ["24h", "7d"];

/**
 * Match `#tag` token where tag is unicode letters/digits/underscore.
 * Anchored at string start or after a whitespace char to avoid matching
 * `#fragment` portions of URLs (basic anti-noise — not foolproof).
 *
 * The trailing negative lookahead `(?![\p{L}\p{N}_])` ensures we capture the
 * FULL token. Without it, `{1,50}` would truncate an overlength tag to its
 * first 50 chars instead of rejecting it.
 */
export const HASHTAG_REGEX =
  /(?:^|\s)#([\p{L}\p{N}_]{1,50})(?![\p{L}\p{N}_])/gu;
