import { notification } from "antd";
import type { ApiError } from "../axios";
import { getTranslationSync, formatMessage } from "./i18n-helper";

/**
 * Loại lỗi
 */
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

/**
 * Cấu hình thông báo lỗi
 */
interface ErrorNotificationConfig {
  type: "error" | "warning" | "info";
  message: string;
  description?: string;
  duration?: number;
}

/**
 * Xác định loại lỗi từ status code
 */
export function getErrorType(status?: number): ErrorType {
  if (!status) return ErrorType.NETWORK;

  if (status === 401) return ErrorType.UNAUTHORIZED;
  if (status === 403) return ErrorType.FORBIDDEN;
  if (status === 404) return ErrorType.NOT_FOUND;
  if (status === 422) return ErrorType.VALIDATION;
  if (status >= 500) return ErrorType.SERVER;
  if (status >= 400) return ErrorType.API;

  return ErrorType.UNKNOWN;
}

/**
 * Lấy thông điệp lỗi từ error response với i18n
 */
export function getErrorMessage(error: ApiError): string {
  // Lỗi không có response (network error, timeout, etc.)
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

  // Lấy message từ response data (nếu có)
  if (data?.error?.message) {
    return data.error.message;
  }
  if (data?.message) {
    return data.message;
  }

  // Message mặc định theo status code với i18n
  const statusKeys: Record<number, string> = {
    400: "errors.http.400",
    401: "errors.http.401",
    403: "errors.http.403",
    404: "errors.http.404",
    422: "errors.http.422",
    500: "errors.http.500",
    502: "errors.http.502",
    503: "errors.http.503",
  };

  const messageKey = statusKeys[status];
  if (messageKey) {
    return getTranslationSync(messageKey);
  }

  // Fallback cho các status code khác
  return formatMessage(getTranslationSync("errors.http.generic"), {
    status: String(status),
    message: error.response.statusText || getTranslationSync("errors.unknown.message"),
  });
}

/**
 * Lấy mô tả chi tiết lỗi (validation errors, etc.) với i18n
 */
export function getErrorDescription(error: ApiError): string | undefined {
  if (!error.response?.data?.error) return undefined;

  const errorData = error.response.data.error;

  // Nếu có validation errors, hiển thị chi tiết
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

/**
 * Hiển thị notification lỗi
 */
export function showErrorNotification(
  error: ApiError,
  customMessage?: string
): void {
  const errorType = getErrorType(error.response?.status);
  const message = customMessage || getErrorMessage(error);
  const description = getErrorDescription(error);

  // Không hiển thị notification cho lỗi 401 (đã xử lý trong interceptor)
  if (errorType === ErrorType.UNAUTHORIZED) {
    return;
  }

  // Cấu hình notification theo loại lỗi
  const config: ErrorNotificationConfig = {
    type: "error",
    message,
    description,
    duration: errorType === ErrorType.SERVER ? 0 : 4.5, // Server errors không tự đóng
  };

  // Validation errors có thể dùng warning
  if (errorType === ErrorType.VALIDATION) {
    config.type = "warning";
  }

  notification.error({
    message: config.message,
    description: config.description,
    duration: config.duration,
    placement: "topRight",
  });
}

/**
 * Hiển thị notification thành công
 */
export function showSuccessNotification(
  message: string,
  description?: string
): void {
  notification.success({
    message,
    description,
    duration: 4.5,
    placement: "topRight",
  });
}

/**
 * Hiển thị notification cảnh báo
 */
export function showWarningNotification(
  message: string,
  description?: string
): void {
  notification.warning({
    message,
    description,
    duration: 4.5,
    placement: "topRight",
  });
}

/**
 * Hiển thị notification thông tin
 */
export function showInfoNotification(
  message: string,
  description?: string
): void {
  notification.info({
    message,
    description,
    duration: 4.5,
    placement: "topRight",
  });
}
