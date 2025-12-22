import { ErrorCode, ValidationErrorDetail } from "../types/common/error.types";
import { HTTP_STATUS } from "../constants/httpStatus";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: ValidationErrorDetail[];

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(
    message: string,
    details?: ValidationErrorDetail[]
  ): AppError {
    return new AppError(
      message,
      HTTP_STATUS.BAD_REQUEST,
      ErrorCode.VALIDATION_ERROR,
      details
    );
  }

  static unauthorized(message: string = "Unauthorized access"): AppError {
    return new AppError(
      message,
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.UNAUTHORIZED
    );
  }

  static forbidden(message: string = "Forbidden"): AppError {
    return new AppError(message, HTTP_STATUS.FORBIDDEN, ErrorCode.FORBIDDEN);
  }

  static notFound(message: string = "Not found"): AppError {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, ErrorCode.NOT_FOUND);
  }

  static conflict(
    message: string,
    code: ErrorCode = ErrorCode.EMAIL_EXISTS
  ): AppError {
    return new AppError(message, HTTP_STATUS.CONFLICT, code);
  }

  static internal(message: string = "Internal server error"): AppError {
    return new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}
