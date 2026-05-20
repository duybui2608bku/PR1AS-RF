/**
 * Lightweight server-side text sanitiser for user-generated plain-text fields
 * such as chat messages, comments and post bodies. The frontend never renders
 * these via dangerouslySetInnerHTML, but this guards against:
 *   - Future regressions where a developer pipes content through innerHTML.
 *   - Non-web clients (mobile, third-party integrations) with weaker escaping.
 *   - Content surfacing inside HTML attributes (title, aria-label, etc.).
 *
 * Strategy:
 *   1. Strip every HTML tag — chat/comments are plain text by design.
 *   2. Strip control characters that have no display purpose
 *      (keeps \t \n \r so multi-line messages still work).
 *   3. Normalise CRLF to LF and trim.
 */

const TAG_PATTERN = /<\/?[a-zA-Z][^>]*>/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export const sanitizePlainText = (input: string): string => {
  if (typeof input !== "string") return "";
  return input
    .replace(TAG_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n/g, "\n")
    .trim();
};

/**
 * Sanitise then enforce a length envelope. Returns "" when the cleaned value
 * is empty so callers can reject the request with a 400.
 */
export const sanitizeMessageContent = (
  input: string,
  maxLength = 4000
): string => {
  const cleaned = sanitizePlainText(input);
  if (cleaned.length === 0) return "";
  if (cleaned.length > maxLength) return cleaned.slice(0, maxLength);
  return cleaned;
};
