import { config } from "../config";

/**
 * Validate a media URL (image / video / audio / file message types).
 *
 * Hardening goals:
 *   - Only http(s) — blocks javascript:, data:, file:, blob: schemes that
 *     could be evaluated by a client renderer.
 *   - Hostname is ASCII (rejects IDN homograph attacks such as аpple.com).
 *   - When `config.media.allowedHosts` is configured, hostname must match
 *     (exact or subdomain of). Empty list means allow any http(s) host, which
 *     is acceptable for dev but should be locked down in prod via env.
 *   - Length cap to keep DB and indexes sane.
 */

const MAX_URL_LENGTH = 2048;
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const ASCII_HOSTNAME = /^[a-z0-9.-]+$/i;

const isHostAllowed = (hostname: string): boolean => {
  const allowed = config.media.allowedHosts;
  if (!allowed.length) return true;
  return allowed.some(
    (h) => hostname === h || hostname.endsWith(`.${h}`)
  );
};

export const isValidMediaUrl = (raw: unknown): raw is string => {
  if (typeof raw !== "string") return false;
  if (raw.length === 0 || raw.length > MAX_URL_LENGTH) return false;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) return false;
  // `URL` normalises IDN hosts to punycode (xn--…). Reject anything that
  // still contains non-ASCII — defends against homograph variants that slip
  // past punycode encoding (e.g. mixed-script labels).
  if (!ASCII_HOSTNAME.test(parsed.hostname)) return false;
  if (!isHostAllowed(parsed.hostname)) return false;

  return true;
};
