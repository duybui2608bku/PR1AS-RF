"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  showErrorNotification,
  showSuccessNotification,
  showWarningNotification,
  showInfoNotification,
  type ApiError,
} from "../utils/error-handler";

export function useErrorHandler() {
  const { t } = useTranslation();

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      if (error && typeof error === "object" && "response" in error) {
        showErrorNotification(error as ApiError, customMessage);
      } else if (error instanceof Error) {
        showErrorNotification(
          {
            message: error.message,
            response: undefined,
          } as ApiError,
          customMessage || error.message
        );
      } else {
        const defaultMessage = t("errors.unknown.message");
        showErrorNotification(
          {
            message: defaultMessage,
            response: undefined,
          } as ApiError,
          customMessage || defaultMessage
        );
      }
    },
    [t]
  );

  const handleSuccess = useCallback((message: string, description?: string) => {
    showSuccessNotification(message, description);
  }, []);

  const handleWarning = useCallback((message: string, description?: string) => {
    showWarningNotification(message, description);
  }, []);

  const handleInfo = useCallback((message: string, description?: string) => {
    showInfoNotification(message, description);
  }, []);

  return {
    handleError,
    handleSuccess,
    handleWarning,
    handleInfo,
  };
}
