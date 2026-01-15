import type { ApiError } from "../axios/config";
import { getTranslationSync, formatMessage } from "./i18n-helper";
import {
  AuthErrorCode,
  ChatErrorCode,
  WalletErrorCode,
  NetworkErrorCode,
  ValidationErrorCode,
  ServerErrorCode,
} from "../constants/error-codes";
import { HttpStatus } from "./error-handler";

interface ErrorResolution {
  message: string;
  action?: string;
  description?: string;
}

function resolveErrorByCode(errorCode: string, error: ApiError): ErrorResolution | null {
  const errorData = error.response?.data?.error;
  const details = errorData?.details;

  switch (errorCode) {
    case AuthErrorCode.INVALID_CREDENTIALS:
      return {
        message: getTranslationSync("errors.auth.invalidCredentials.message"),
        action: getTranslationSync("errors.auth.invalidCredentials.action"),
        description: getTranslationSync("errors.auth.invalidCredentials.description"),
      };

    case AuthErrorCode.EMAIL_NOT_VERIFIED:
      return {
        message: getTranslationSync("errors.auth.emailNotVerified.message"),
        action: getTranslationSync("errors.auth.emailNotVerified.action"),
        description: getTranslationSync("errors.auth.emailNotVerified.description"),
      };

    case AuthErrorCode.ACCOUNT_LOCKED:
      return {
        message: getTranslationSync("errors.auth.accountLocked.message"),
        action: getTranslationSync("errors.auth.accountLocked.action"),
        description: getTranslationSync("errors.auth.accountLocked.description"),
      };

    case ChatErrorCode.SEND_MESSAGE_FAILED:
      return {
        message: getTranslationSync("errors.chat.sendMessageFailed.message"),
        action: getTranslationSync("errors.chat.sendMessageFailed.action"),
        description: getTranslationSync("errors.chat.sendMessageFailed.description"),
      };

    case ChatErrorCode.DELETE_MESSAGE_FAILED:
      return {
        message: getTranslationSync("errors.chat.deleteMessageFailed.message"),
        action: getTranslationSync("errors.chat.deleteMessageFailed.action"),
        description: getTranslationSync("errors.chat.deleteMessageFailed.description"),
      };

    case WalletErrorCode.DEPOSIT_FAILED:
      return {
        message: getTranslationSync("errors.wallet.depositFailed.message"),
        action: getTranslationSync("errors.wallet.depositFailed.action"),
        description: getTranslationSync("errors.wallet.depositFailed.description"),
      };

    case WalletErrorCode.INSUFFICIENT_BALANCE:
      return {
        message: getTranslationSync("errors.wallet.insufficientBalance.message"),
        action: getTranslationSync("errors.wallet.insufficientBalance.action"),
        description: getTranslationSync("errors.wallet.insufficientBalance.description"),
      };

    case WalletErrorCode.INVALID_AMOUNT:
      const minAmount = details?.find((d) => d.field === "amount")?.message;
      return {
        message: getTranslationSync("errors.wallet.invalidAmount.message"),
        action: getTranslationSync("errors.wallet.invalidAmount.action"),
        description: minAmount
          ? formatMessage(getTranslationSync("errors.wallet.invalidAmount.description"), {
              details: minAmount,
            })
          : getTranslationSync("errors.wallet.invalidAmount.description"),
      };

    case WalletErrorCode.PAYMENT_GATEWAY_ERROR:
      return {
        message: getTranslationSync("errors.wallet.paymentGatewayError.message"),
        action: getTranslationSync("errors.wallet.paymentGatewayError.action"),
        description: getTranslationSync("errors.wallet.paymentGatewayError.description"),
      };

    case NetworkErrorCode.TIMEOUT:
      return {
        message: getTranslationSync("errors.network.timeout.message"),
        action: getTranslationSync("errors.network.timeout.action"),
        description: getTranslationSync("errors.network.timeout.description"),
      };

    case NetworkErrorCode.CONNECTION_FAILED:
      return {
        message: getTranslationSync("errors.network.connectionFailed.message"),
        action: getTranslationSync("errors.network.connectionFailed.action"),
        description: getTranslationSync("errors.network.connectionFailed.description"),
      };

    case ValidationErrorCode.REQUIRED_FIELD:
      const fieldName = details?.[0]?.field || "field";
      return {
        message: formatMessage(getTranslationSync("errors.validation.requiredField.message"), {
          field: fieldName,
        }),
        action: getTranslationSync("errors.validation.requiredField.action"),
        description: formatMessage(getTranslationSync("errors.validation.requiredField.description"), {
          field: fieldName,
        }),
      };

    case ServerErrorCode.INTERNAL_ERROR:
      return {
        message: getTranslationSync("errors.server.internalError.message"),
        action: getTranslationSync("errors.server.internalError.action"),
        description: getTranslationSync("errors.server.internalError.description"),
      };

    default:
      return null;
  }
}

export function resolveErrorMessage(error: ApiError): ErrorResolution {
  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return resolveErrorByCode(NetworkErrorCode.TIMEOUT, error) || {
        message: getTranslationSync("errors.network.timeout"),
        action: getTranslationSync("errors.network.timeout.action"),
      };
    }
    if (error.code === "ERR_NETWORK" || error.message.includes("Network Error")) {
      return resolveErrorByCode(NetworkErrorCode.CONNECTION_FAILED, error) || {
        message: getTranslationSync("errors.network.connection"),
        action: getTranslationSync("errors.network.connectionFailed.action"),
      };
    }
    return {
      message: getTranslationSync("errors.network.unknown"),
      action: getTranslationSync("errors.network.unknown.action"),
    };
  }

  const { data, status } = error.response;
  const errorCode = data?.error?.code;

  if (errorCode) {
    const resolved = resolveErrorByCode(errorCode, error);
    if (resolved) {
      return resolved;
    }
  }

  if (data?.error?.message) {
    return {
      message: data.error.message,
      action: getTranslationSync("errors.generic.action"),
    };
  }

  if (data?.message) {
    return {
      message: data.message,
      action: getTranslationSync("errors.generic.action"),
    };
  }

  const statusMessages: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: "errors.http.400.message",
    [HttpStatus.UNAUTHORIZED]: "errors.http.401.message",
    [HttpStatus.FORBIDDEN]: "errors.http.403.message",
    [HttpStatus.NOT_FOUND]: "errors.http.404.message",
    [HttpStatus.UNPROCESSABLE_ENTITY]: "errors.http.422.message",
    [HttpStatus.TOO_MANY_REQUESTS]: "errors.http.429.message",
    [HttpStatus.INTERNAL_SERVER_ERROR]: "errors.http.500.message",
    [HttpStatus.BAD_GATEWAY]: "errors.http.502.message",
    [HttpStatus.SERVICE_UNAVAILABLE]: "errors.http.503.message",
  };

  const messageKey = statusMessages[status];
  if (messageKey) {
    return {
      message: getTranslationSync(messageKey),
      action: getTranslationSync("errors.http.action"),
      description: getTranslationSync(`${messageKey}.description`),
    };
  }

  return {
    message: formatMessage(getTranslationSync("errors.http.generic"), {
      status: String(status),
      message: error.response.statusText || getTranslationSync("errors.unknown.message"),
    }),
    action: getTranslationSync("errors.generic.action"),
  };
}
