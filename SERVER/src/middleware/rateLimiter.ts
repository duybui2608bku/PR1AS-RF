import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { AUTH_MESSAGES } from "../constants/messages";
import { AppError } from "../utils/AppError";
import { HTTP_STATUS } from "../constants/httpStatus";
import { ErrorCode } from "../types/common/error.types";
import { TIME_IN_MS, RATE_LIMIT_WINDOWS } from "../constants/time";

export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.AUTH_MINUTES * TIME_IN_MS.MINUTE,
  max: 5,
  message: AUTH_MESSAGES.RATE_LIMIT_AUTH_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (
    _req: Request, // eslint-disable-line @typescript-eslint/no-unused-vars
    _res: Response // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => {
    throw new AppError(
      AUTH_MESSAGES.RATE_LIMIT_AUTH_EXCEEDED,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  },
});

export const refreshTokenLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.REFRESH_TOKEN_HOURS * TIME_IN_MS.HOUR,
  max: 10,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (
      (req as { user?: { sub?: string } }).user?.sub || req.ip || "unknown"
    );
  },
  handler: (
    _req: Request, // eslint-disable-line @typescript-eslint/no-unused-vars
    _res: Response // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => {
    throw new AppError(
      AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  },
});

export const emailActionLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOWS.EMAIL_ACTION_HOURS * TIME_IN_MS.HOUR,
  max: 3,
  message: AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (
    _req: Request, // eslint-disable-line @typescript-eslint/no-unused-vars
    _res: Response // eslint-disable-line @typescript-eslint/no-unused-vars
  ) => {
    throw new AppError(
      AUTH_MESSAGES.RATE_LIMIT_EXCEEDED,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
  },
});
