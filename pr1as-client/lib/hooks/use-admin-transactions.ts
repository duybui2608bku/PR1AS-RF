"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { adminWalletService, type AdminTransactionParams } from "@/services/admin-wallet.service"

export function useAdminTransactions(params: AdminTransactionParams = {}) {
  return useQuery({
    queryKey: queryKeys.transactions.adminList(params as Record<string, unknown>),
    queryFn: () => adminWalletService.getTransactions(params),
    placeholderData: (prev) => prev,
  })
}

export function useAdminTransactionStats(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.transactions.adminStats(params as Record<string, unknown>),
    queryFn: () => adminWalletService.getStats(params),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
