import type { ApiError } from "../axios/config";
import { getTranslationSync, formatMessage } from "./i18n-helper";
import { getNotificationApi } from "./notification.service";
import { resolveErrorMessage } from "./error-message-resolver";

export enum ErrorType {
  API = "api",
  NETWORK = "network",
  VALIDATION = "validation",
  UNAUTHORIZED = "unauthorized",
  FORBIDDEN = "forbidden",
  NOT_FOUND = "not_found",
  SERVER = "server",
  UNKNOWN = "unknown",
}

export enum ErrorCode {
  CSRF_TOKEN_MISSING = "CSRF_TOKEN_MISSING",
  CSRF_TOKEN_INVALID = "CSRF_TOKEN_INVALID",
}

export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

interface ErrorNotificationConfig {
  type: "error" | "warning" | "info";
  message: string;
  description?: string;
  duration?: number;
}

const NOTIFICATION_DURATION = 4.5;
const SERVER_ERROR_DURATION = 0;

export function getErrorType(status?: number): ErrorType {
  if (!status) return ErrorType.NETWORK;

  if (status === HttpStatus.UNAUTHORIZED) return ErrorType.UNAUTHORIZED;
  if (status === HttpStatus.FORBIDDEN) return ErrorType.FORBIDDEN;
  if (status === HttpStatus.NOT_FOUND) return ErrorType.NOT_FOUND;
  if (status === HttpStatus.UNPROCESSABLE_ENTITY) return ErrorType.VALIDATION;
  if (status === HttpStatus.TOO_MANY_REQUESTS) return ErrorType.API;
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) return ErrorType.SERVER;
  if (status >= HttpStatus.BAD_REQUEST) return ErrorType.API;

  return ErrorType.UNKNOWN;
}

export function getErrorMessage(error: ApiError): string {
  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return getTranslationSync("errors.network.timeout");
    }
    if (
      error.code === "ERR_NETWORK" ||
      error.message.includes("Network Error")
    ) {
      return getTranslationSync("errors.network.connection");
    }
    return getTranslationSync("errors.network.unknown");
  }

  const { data, status } = error.response;

  if (status === HttpStatus.FORBIDDEN && data?.error?.code) {
    const errorCode = data.error.code;
    if (errorCode === ErrorCode.CSRF_TOKEN_MISSING) {
      return getTranslationSync("errors.csrf.tokenMissing");
    }
    if (errorCode === ErrorCode.CSRF_TOKEN_INVALID) {
      return getTranslationSync("errors.csrf.tokenInvalid");
    }
  }

  if (data?.error?.message) {
    return data.error.message;
  }
  if (data?.message) {
    return data.message;
  }

  const statusKeys: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: "errors.http.400",
    [HttpStatus.UNAUTHORIZED]: "errors.http.401",
    [HttpStatus.FORBIDDEN]: "errors.http.403",
    [HttpStatus.NOT_FOUND]: "errors.http.404",
    [HttpStatus.UNPROCESSABLE_ENTITY]: "errors.http.422",
    [HttpStatus.TOO_MANY_REQUESTS]: "errors.http.429",
    [HttpStatus.INTERNAL_SERVER_ERROR]: "errors.http.500",
    [HttpStatus.BAD_GATEWAY]: "errors.http.502",
    [HttpStatus.SERVICE_UNAVAILABLE]: "errors.http.503",
  };

  const messageKey = statusKeys[status];
  if (messageKey) {
    return getTranslationSync(messageKey);
  }

  return formatMessage(getTranslationSync("errors.http.generic"), {
    status: String(status),
    message:
      error.response.statusText || getTranslationSync("errors.unknown.message"),
  });
}

export function getErrorDescription(error: ApiError): string | undefined {
  if (!error.response?.data?.error) return undefined;

  const errorData = error.response.data.error;

  if (errorData.details && Array.isArray(errorData.details)) {
    const title = getTranslationSync("errors.validation.details");
    const details = errorData.details
      .map(
        (detail: { field: string; message: string }) =>
          `• ${detail.field}: ${detail.message}`
      )
      .join("\n");
    return `${title}\n${details}`;
  }

  return errorData.stack && process.env.NODE_ENV === "development"
    ? errorData.stack
    : undefined;
}

export function showErrorNotification(
  error: ApiError,
  customMessage?: string
): void {
  const errorType = getErrorType(error.response?.status);

  if (errorType === ErrorType.UNAUTHORIZED) {
    return;
  }

  const resolution = resolveErrorMessage(error);
  const message = customMessage || resolution.message;
  let description = resolution.description || getErrorDescription(error);

  if (resolution.action) {
    description = description
      ? `${description}\n${resolution.action}`
      : resolution.action;
  }

  const config: ErrorNotificationConfig = {
    type: "error",
    message,
    description,
    duration:
      errorType === ErrorType.SERVER
        ? SERVER_ERROR_DURATION
        : NOTIFICATION_DURATION,
  };

  if (errorType === ErrorType.VALIDATION) {
    config.type = "warning";
  }

  if (
    error.response?.status === HttpStatus.FORBIDDEN &&
    error.response.data?.error?.code
  ) {
    const errorCode = error.response.data.error.code;
    if (
      errorCode === ErrorCode.CSRF_TOKEN_MISSING ||
      errorCode === ErrorCode.CSRF_TOKEN_INVALID
    ) {
      config.type = "warning";
      config.description = getTranslationSync("errors.csrf.description");
    }
  }

  if (error.response?.status === HttpStatus.TOO_MANY_REQUESTS) {
    config.type = "warning";
    const retryAfter =
      (error?.response?.headers as Record<string, string>)?.["retry-after"] ||
      (error?.response?.headers as Record<string, string>)?.["Retry-After"];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      const minutes = Math.ceil(seconds / 60);
      const retryMessage =
        minutes > 0
          ? formatMessage(
              getTranslationSync("errors.rateLimit.retryAfterMinutes"),
              { minutes }
            )
          : formatMessage(
              getTranslationSync("errors.rateLimit.retryAfterSeconds"),
              { seconds }
            );
      config.description = description
        ? `${description}\n${retryMessage}`
        : retryMessage;
    }
  }

  getNotificationApi().error({
    title: config.message,
    description: config.description,
    duration: config.duration,
    placement: "topRight",
  });
}

export function showSuccessNotification(
  message: string,
  description?: string
): void {
  getNotificationApi().success({
    title: message,
    description,
    duration: NOTIFICATION_DURATION,
    placement: "topRight",
  });
}

export function showWarningNotification(
  message: string,
  description?: string
): void {
  getNotificationApi().warning({
    title: message,
    description,
    duration: NOTIFICATION_DURATION,
    placement: "topRight",
  });
}

export function showInfoNotification(
  message: string,
  description?: string
): void {
  getNotificationApi().info({
    title: message,
    description,
    duration: NOTIFICATION_DURATION,
    placement: "topRight",
  });
}
