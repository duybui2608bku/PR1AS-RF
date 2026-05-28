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

export const EMAIL_SUBJECTS = {
  PASSWORD_RESET: "Password Reset Request",
  EMAIL_VERIFICATION: "Email Verification",
  ACCOUNT_BANNED: "PR1AS Account Locked",
} as const;
