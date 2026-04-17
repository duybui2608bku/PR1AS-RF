"use client";

import { useState, useCallback } from "react";
import { PAGINATION_DEFAULTS } from "@/app/constants/constants";

interface UsePaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
}

interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  handleTableChange: (newPage: number, newPageSize: number) => void;
  resetPage: () => void;
}

/**
 * Reusable pagination hook that replaces the duplicated pattern of
 * [page, setPage] + [limit, setLimit] + handleTableChange found
 * across worker/bookings, client/bookings, worker/wallet, admin/user, etc.
 */
export function usePagination(
  options?: UsePaginationOptions
): UsePaginationReturn {
  const defaultPage = options?.defaultPage ?? PAGINATION_DEFAULTS.PAGE;
  const defaultLimit = options?.defaultLimit ?? PAGINATION_DEFAULTS.LIMIT;

  const [page, setPage] = useState<number>(defaultPage);
  const [limit, setLimit] = useState<number>(defaultLimit);

  const handleTableChange = useCallback(
    (newPage: number, newPageSize: number): void => {
      setPage(newPage);
      setLimit(newPageSize);
    },
    []
  );

  const resetPage = useCallback((): void => {
    setPage(defaultPage);
  }, [defaultPage]);

  return {
    page,
    limit,
    setPage,
    setLimit,
    handleTableChange,
    resetPage,
  };
}
