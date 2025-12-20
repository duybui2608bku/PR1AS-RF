"use client";

import { AntdProvider } from "./antd-provider";
import { QueryProvider } from "./query-provider";
import { I18nProvider } from "./i18n-provider";
import { ErrorBoundary } from "../components/error-boundary";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root Providers - Kết hợp tất cả providers
 * Thứ tự quan trọng: ErrorBoundary > I18nProvider > QueryProvider > AntdProvider
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <QueryProvider>
          <AntdProvider>{children}</AntdProvider>
        </QueryProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
