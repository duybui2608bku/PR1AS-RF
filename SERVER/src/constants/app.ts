export const APP_CONSTANTS = {
  NAME: "PR1AS",
  ADMIN_CONTACT_EMAIL: "pr1as.connect@gmail.com",
  DEFAULT_EMAIL_FROM: "PR1AS <no-reply@example.com>",
  DEFAULT_EMAIL_SUBJECT: "PR1AS Notification",
} as const;

// Account-level login lockout. Defends against IP-rotated brute force where
// per-IP rate limits don't bite. Sliding-window in spirit but stored as a
// counter+lockUntil pair so we don't need a separate audit collection.
export const LOGIN_LOCKOUT = {
  MAX_FAILED_ATTEMPTS: 10,
  LOCK_DURATION_MINUTES: 30,
} as const;

// Refresh-token rotation grace. After a refresh rotates the token, the previous
// token stays valid for this short window so concurrent refreshes from sibling
// tabs/devices (all holding the same pre-rotation token, e.g. via the shared
// httpOnly cookie) succeed instead of being flagged as reuse and force-logged-out.
// Kept tight so a genuinely stolen, already-rotated token can't be replayed for long.
export const REFRESH_TOKEN = {
  REUSE_GRACE_MS: 15 * 1000,
} as const;

export const EMAIL_SUBJECTS = {
  PASSWORD_RESET: "Password Reset Request",
  EMAIL_VERIFICATION: "Email Verification",
  ACCOUNT_BANNED: "PR1AS Account Locked",
} as const;
