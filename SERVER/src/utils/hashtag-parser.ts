import { HASHTAG_LIMITS, HASHTAG_REGEX } from "../constants/hashtag";

export interface ParsedHashtag {
  slug: string;
  display: string;
}

/**
 * Normalize a raw hashtag token into a deterministic slug.
 *
 * Steps:
 * 1. NFC-normalize so visually identical Unicode sequences hash equally.
 * 2. Lowercase to make slugs case-insensitive (e.g. `#PetCare` == `#petcare`).
 * 3. Trim & collapse whitespace to underscore. We deliberately keep diacritics
 *    so Vietnamese hashtags like `#chămsócthúcưng` group correctly.
 */
export const normalizeHashtagSlug = (raw: string): string => {
  return raw.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "_");
};

/**
 * Extract unique hashtags from free-text body. Caps to MAX_PER_POST and
 * deduplicates by slug while preserving the first-seen display form.
 */
export const parseHashtags = (body: string): ParsedHashtag[] => {
  if (!body) return [];

  const seen = new Map<string, ParsedHashtag>();
  HASHTAG_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = HASHTAG_REGEX.exec(body)) !== null) {
    const display = match[1];
    if (!display || display.length > HASHTAG_LIMITS.MAX_LENGTH) continue;

    const slug = normalizeHashtagSlug(display);
    if (!slug) continue;

    if (!seen.has(slug)) {
      seen.set(slug, { slug, display: display.normalize("NFC") });
    }

    if (seen.size >= HASHTAG_LIMITS.MAX_PER_POST) {
      break;
    }
  }

  return Array.from(seen.values());
};
