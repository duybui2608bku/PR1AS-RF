const ALLOWED_AVATAR_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_AVATAR_URL_LENGTH = 2048;

export function normalizeAvatarUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_AVATAR_URL_LENGTH) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!ALLOWED_AVATAR_PROTOCOLS.has(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
