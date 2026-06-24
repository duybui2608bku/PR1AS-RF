import rateLimit from "express-rate-limit";
import { Request } from "express";
import crypto from "crypto";
import { AUTH_MESSAGES } from "../constants/messages";
import { AppError } from "../utils/AppError";
import { HTTP_STATUS } from "../constants/httpStatus";
import { ErrorCode } from "../types/common/error.types";
import { TIME_IN_MS, RATE_LIMIT_WINDOWS } from "../constants/time";

const createRateLimitHandler = (message: string) => (): never => {
  throw new AppError(
    message,
    HTTP_STATUS.TOO_MANY_REQUESTS,
    ErrorCode.RATE_LIMIT_EXCEEDED
  );
};

const userOrIpKey = (req: Request): string =>
  (req as { user?: { sub?: string } }).user?.sub || req.ip || "unknown";

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.AUTH_MINUTES * TIME_IN_MS.MINUTE,
  max: 5,
  message: AUTH_MESSAGES.RATE_LIMIT_AUTH_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_AUTH_EXCEEDED),
});

export const refreshTokenLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.REFRESH_TOKEN_HOURS * TIME_IN_MS.HOUR,
  max: 10,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

export const postCreateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.POST_CREATE_MINUTES * TIME_IN_MS.MINUTE,
  max: 30,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

// `getAdminContact` returns the admin user that a regular user can DM. Without
// throttling, any authenticated user can poll the endpoint to spam-create DM
// conversations with admin. Per-user key (falls back to IP for anonymous, which
// shouldn't happen here because the route is behind `authenticate`).
export const adminContactLimiter = rateLimit({
  windowMs: 5 * TIME_IN_MS.MINUTE,
  max: 10,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

// Complaint group creation opens an admin-facing conversation. Keep this much
// stricter than read/chat endpoints so one account cannot flood admin queues.
export const groupComplaintLimiter = rateLimit({
  windowMs: 60 * TIME_IN_MS.MINUTE,
  max: 5,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

export const bookingCreateLimiter = rateLimit({
  windowMs: 60 * TIME_IN_MS.MINUTE,
  max: 20,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

export const guestBookingCreateLimiter = rateLimit({
  windowMs: 60 * TIME_IN_MS.MINUTE,
  max: 8,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => `guest:${req.ip ?? "unknown"}`,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

// Chat send endpoints (1:1 and group). Per-user ceiling that comfortably
// covers a fast human conversation but blocks scripted flooding. 60/minute =
// average 1 message/second, more than enough for real chat bursts.
export const chatSendLimiter = rateLimit({
  windowMs: TIME_IN_MS.MINUTE,
  max: 60,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

// "Ask the Worker" question submissions. Public endpoint that triggers an email
// to the worker, so it must resist guest spam. Keyed per-user, falling back to IP
// for anonymous askers (the common case here).
export const questionCreateLimiter = rateLimit({
  windowMs: 60 * TIME_IN_MS.MINUTE,
  max: 10,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

export const emailActionLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.EMAIL_ACTION_HOURS * TIME_IN_MS.HOUR,
  max: 3,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

// Two-layer rate limit for token-consuming endpoints (reset-password,
// verify-email). Both run on the same request and either can reject it.
//
// Layer 1 — per-IP: prevents an attacker on one host from sweeping many
//   stolen/leaked tokens. Quota is generous (50/hour) so that NATed networks
//   (offices, schools, mobile carriers) where many real users share an IP
//   are not falsely throttled.
//
// Layer 2 — per-token: prevents brute-forcing the bits of a *specific* token
//   even if the attacker rotates their IP via proxies. The key is the SHA-256
//   hash of the token in req.body so the rate-limit store never holds raw
//   secrets. Quota is tight (5/hour) — a real user only consumes 1.
//
// If the request has no token in the body (malformed), the per-token limiter
// falls back to IP-keying so it still applies.
export const tokenActionLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.EMAIL_ACTION_HOURS * TIME_IN_MS.HOUR,
  max: 50,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);

export const tokenAttemptLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.EMAIL_ACTION_HOURS * TIME_IN_MS.HOUR,
  max: 5,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string => {
    const token = (req.body as { token?: unknown } | undefined)?.token;
    if (typeof token === "string" && token.length > 0) {
      return `token:${hashToken(token)}`;
    }
    return `ip:${req.ip ?? "unknown"}`;
  },
  handler: createRateLimitHandler(AUTH_MESSAGES.RATE_LIMIT_EXCEEDED),
});
