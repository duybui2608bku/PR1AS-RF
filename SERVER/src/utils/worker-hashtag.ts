import { WORKER_SERVICE_HASHTAG_LIMITS } from "../constants/worker-service";

export const normalizeHashtag = (raw: string): string | null => {
  const cleaned = raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleaned) {
    return null;
  }
  if (cleaned.length > WORKER_SERVICE_HASHTAG_LIMITS.MAX_LENGTH) {
    return null;
  }
  return cleaned;
};

export const normalizeHashtags = (raw: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    const normalized = normalizeHashtag(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= WORKER_SERVICE_HASHTAG_LIMITS.MAX_PER_SERVICE) {
      break;
    }
  }

  return result;
};
