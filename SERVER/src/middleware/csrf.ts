import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AppError } from "../utils/AppError";
import { ErrorCode } from "../types/common/error.types";
import { config } from "../config";
import { TIME_IN_MS, TOKEN_EXPIRY } from "../constants/time";
import { CSRF_CONSTANTS } from "../constants/csrf";
import { CSRF_MESSAGES } from "../constants/messages";

export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const csrfToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.method === "GET") {
    const token = generateCsrfToken();

    res.cookie(CSRF_CONSTANTS.COOKIE_NAME, token, {
      httpOnly: false,
      secure: config.nodeEnv === "production",
      sameSite: config.nodeEnv === "production" ? "strict" : "lax",
      maxAge: TOKEN_EXPIRY.CSRF_TOKEN_HOURS * TIME_IN_MS.HOUR,
      path: "/",
    });

    res.setHeader(CSRF_CONSTANTS.HEADER_NAME, token);
  }

  next();
};

export const validateCsrf = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  if (config.nodeEnv === "development") {
    const headerToken =
      req.headers[CSRF_CONSTANTS.HEADER_NAME_LOWER] ||
      req.headers[CSRF_CONSTANTS.HEADER_NAME_XSRF];
    const cookieToken = req.cookies?.[CSRF_CONSTANTS.COOKIE_NAME];
    if (!headerToken && !cookieToken) {
      return next();
    }
  }

  const headerToken =
    req.headers[CSRF_CONSTANTS.HEADER_NAME_LOWER] ||
    req.headers[CSRF_CONSTANTS.HEADER_NAME_XSRF];

  const cookieToken = req.cookies?.[CSRF_CONSTANTS.COOKIE_NAME];

  if (!headerToken || !cookieToken) {
    return next(
      AppError.forbidden(
        CSRF_MESSAGES.TOKEN_MISSING,
        ErrorCode.CSRF_TOKEN_MISSING
      )
    );
  }

  if (headerToken !== cookieToken) {
    return next(
      AppError.forbidden(
        CSRF_MESSAGES.TOKEN_MISMATCH,
        ErrorCode.CSRF_TOKEN_INVALID
      )
    );
  }

  next();
};

export const validateOrigin = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  const allowedOrigins = Array.isArray(config.corsOrigin)
    ? config.corsOrigin
    : typeof config.corsOrigin === "function"
      ? []
      : [config.corsOrigin];

  if (typeof config.corsOrigin === "function") {
    return next();
  }

  if (origin) {
    const originUrl = new URL(origin);
    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === "string") {
        const allowedUrl = new URL(allowed);
        return originUrl.origin === allowedUrl.origin;
      }
      return false;
    });

    if (!isAllowed) {
      return next(
        AppError.forbidden(
          CSRF_MESSAGES.INVALID_ORIGIN,
          ErrorCode.INVALID_ORIGIN
        )
      );
    }
  }

  if (!origin && referer) {
    try {
      const refererUrl = new URL(referer);
      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          const allowedUrl = new URL(allowed);
          return refererUrl.origin === allowedUrl.origin;
        }
        return false;
      });

      if (!isAllowed) {
        return next(
          AppError.forbidden(
            CSRF_MESSAGES.INVALID_REFERER,
            ErrorCode.INVALID_REFERER
          )
        );
      }
    } catch {
      return next(
        AppError.forbidden(
          CSRF_MESSAGES.INVALID_REFERER_FORMAT,
          ErrorCode.INVALID_REFERER
        )
      );
    }
  }

  if (config.nodeEnv === "development" && !origin && !referer) {
    return next();
  }

  if (config.nodeEnv === "production" && !origin && !referer) {
    return next(
      AppError.forbidden(CSRF_MESSAGES.MISSING_ORIGIN, ErrorCode.MISSING_ORIGIN)
    );
  }

  next();
};

export const csrfProtection = [validateOrigin, validateCsrf];
