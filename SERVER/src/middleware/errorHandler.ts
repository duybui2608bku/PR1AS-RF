import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { config } from "../config";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/httpStatus";
import { AppError } from "../utils/AppError";
import { ErrorCode } from "../types/common/error.types";
import { ApiResponse } from "../utils/response";

/**
 * Global Error Handler Middleware
 * Xử lý tất cả errors và trả về JSON response chuẩn
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default values
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  let details: { field: string; message: string }[] | undefined;

  // Check if error is our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }

  // Log error
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode,
    code,
  });

  // Build response
  const response: ApiResponse = {
    success: false,
    statusCode,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(config.nodeEnv === "development" && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(AppError.notFound(`${ERROR_MESSAGES.NOT_FOUND}: ${req.originalUrl}`));
};

// Re-export for convenience
export { AppError } from "../utils/AppError";
