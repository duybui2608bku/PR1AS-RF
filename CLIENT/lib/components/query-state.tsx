"use client";

import React, { memo } from "react";
import { Spin, Alert, Typography } from "antd";
import type { AxiosError } from "axios";
import type { ApiResponse } from "../axios";
import { useI18n } from "../hooks/use-i18n";
import { LoadingSize } from "../constants/ui.constants";

const { Text } = Typography;

export interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: AxiosError<ApiResponse> | Error | null;
  data?: unknown;
  loadingText?: string;
  errorTitle?: string;
  errorMessage?: string;
  emptyMessage?: string;
  showEmpty?: boolean;
  children?: React.ReactNode;
  className?: string;
  loadingSize?: LoadingSize;
}

function QueryStateComponent({
  isLoading,
  isError,
  error,
  data,
  loadingText,
  errorTitle,
  errorMessage,
  emptyMessage,
  showEmpty = false,
  children,
  className,
  loadingSize = LoadingSize.LARGE,
}: QueryStateProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className={className || "query-state-loading"}>
        <Spin size={loadingSize} />
        {loadingText && <Text type="secondary">{loadingText}</Text>}
      </div>
    );
  }

  if (isError) {
    const errorMsg =
      errorMessage ||
      (error && "response" in error
        ? error.response?.data?.message
        : error?.message) ||
      t("common.error.message") ||
      "An error occurred";

    const errorTitleText =
      errorTitle || t("common.error.title") || "Error";

    return (
      <div className={className || "query-state-error"}>
        <Alert
          message={errorTitleText}
          description={errorMsg}
          type="error"
          showIcon
        />
      </div>
    );
  }

  if (showEmpty && !data) {
    return (
      <div className={className || "query-state-empty"}>
        <Alert
          message={emptyMessage || t("common.empty.message") || "No data found"}
          type="info"
          showIcon
        />
      </div>
    );
  }

  return <>{children}</>;
}

export const QueryState = memo(QueryStateComponent);
