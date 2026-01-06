import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { config } from "../config";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/httpStatus";
import { AppError } from "../utils/AppError";
import { ErrorCode } from "../types/common/error.types";
import { ApiResponse } from "../utils/response";
import { getMessageKey } from "../utils/message-mapper";
import { t, getLocaleFromHeader } from "../utils/i18n";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
): void => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message: string = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  let details: { field: string; message: string }[] | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }

  const errorLog: Record<string, unknown> = {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
    code,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent"),
    timestamp: new Date().toISOString(),
  };

  const authReq = req as { user?: { sub?: string } };
  if (authReq.user?.sub) {
    errorLog.userId = authReq.user.sub;
  }

  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) delete sanitizedBody.password;
    if (sanitizedBody.token) delete sanitizedBody.token;
    if (sanitizedBody.refreshToken) delete sanitizedBody.refreshToken;
    if (sanitizedBody.password_reset_token)
      delete sanitizedBody.password_reset_token;
    if (sanitizedBody.email_verification_token)
      delete sanitizedBody.email_verification_token;
    errorLog.body = sanitizedBody;
  }

  logger.error(errorLog);

  // Get locale from Accept-Language header
  const acceptLanguage = req.get("accept-language");
  const locale = getLocaleFromHeader(acceptLanguage);

  // Translate message
  const messageKey = getMessageKey(message);
  const translatedMessage = t(messageKey, locale);

  // Translate details if present
  let translatedDetails = details;
  if (details && details.length > 0) {
    translatedDetails = details.map((detail) => ({
      field: detail.field,
      message: t(getMessageKey(detail.message), locale),
    }));
  }

  const response: ApiResponse = {
    success: false,
    statusCode,
    error: {
      code,
      message: translatedMessage,
      ...(translatedDetails && { details: translatedDetails }),
      ...(config.nodeEnv === "development" && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(AppError.notFound(`${ERROR_MESSAGES.NOT_FOUND}: ${req.originalUrl}`));
};

export { AppError } from "../utils/AppError";
