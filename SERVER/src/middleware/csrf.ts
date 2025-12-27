import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AppError } from "../utils/AppError";
import { ErrorCode } from "../types/common/error.types";
import { config } from "../config";
import { TIME_IN_MS, TOKEN_EXPIRY } from "../constants/time";

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

    res.cookie("XSRF-TOKEN", token, {
      httpOnly: false,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
      maxAge: TOKEN_EXPIRY.CSRF_TOKEN_HOURS * TIME_IN_MS.HOUR,
      path: "/",
    });

    res.setHeader("X-CSRF-Token", token);
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

  const headerToken =
    req.headers["x-csrf-token"] || req.headers["x-xsrf-token"];

  const cookieToken = req.cookies?.["XSRF-TOKEN"];

  if (!headerToken || !cookieToken) {
    return next(
      AppError.forbidden(
        "CSRF token missing",
        ErrorCode.CSRF_TOKEN_MISSING
      )
    );
  }

  if (headerToken !== cookieToken) {
    return next(
      AppError.forbidden(
        "CSRF token mismatch",
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
          "Invalid origin",
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
            "Invalid referer",
            ErrorCode.INVALID_REFERER
          )
        );
      }
    } catch {
      return next(
        AppError.forbidden(
          "Invalid referer format",
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
      AppError.forbidden(
        "Origin or Referer header required",
        ErrorCode.MISSING_ORIGIN
      )
    );
  }

  next();
};

export const csrfProtection = [validateOrigin, validateCsrf];

