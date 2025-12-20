"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider với cấu hình tối ưu
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: thời gian data được coi là "fresh" (5 phút)
            staleTime: 1000 * 60 * 5,
            // Cache time: thời gian data được giữ trong cache sau khi không còn component nào sử dụng (10 phút)
            gcTime: 1000 * 60 * 10,
            // Retry: số lần retry khi request thất bại
            retry: 1,
            // Refetch on window focus: tự động refetch khi user quay lại tab
            refetchOnWindowFocus: false,
            // Refetch on reconnect: tự động refetch khi mạng kết nối lại
            refetchOnReconnect: true,
            // Refetch on mount: tự động refetch khi component mount
            refetchOnMount: true,
          },
          mutations: {
            // Retry mutations khi thất bại
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query Devtools - chỉ hiển thị trong development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
