export const APP_CONSTANTS = {
  NAME: "PR1AS",
  ADMIN_CONTACT_EMAIL: "pr1as.connect@gmail.com",
  DEFAULT_EMAIL_FROM: "PR1AS <no-reply@example.com>",
  DEFAULT_EMAIL_SUBJECT: "PR1AS Notification",
} as const;

export const EMAIL_SUBJECTS = {
  PASSWORD_RESET: "Password Reset Request",
  EMAIL_VERIFICATION: "Email Verification",
  ACCOUNT_BANNED: "PR1AS Account Locked",
} as const;
