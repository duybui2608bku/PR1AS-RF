const DEV_FALLBACK_SECRET = "pr1as-dev-only-not-for-production"

/**
 * Resolves the JWT signing secret used to verify access tokens at the edge.
 *
 * This MUST be the same value as the backend's `JWT_SECRET` — the Next layer and
 * the API sign/verify the same tokens. In production we fail hard when it is
 * missing instead of falling back to a dev secret: with the wrong secret every
 * `jwtVerify` returns null, so all tokens look invalid and authenticated users
 * are trapped in a redirect loop to /login. A loud 500 surfaces the
 * misconfiguration immediately; a silent dev fallback hides it as an outage.
 *
 * Call this OUTSIDE the try/catch that wraps `jwtVerify`, so the thrown config
 * error propagates (→ 500) rather than being swallowed as "token invalid".
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET is not set. It is required in production and must match the backend's JWT_SECRET.",
      )
    }
    return new TextEncoder().encode(DEV_FALLBACK_SECRET)
  }
  return new TextEncoder().encode(secret)
}
