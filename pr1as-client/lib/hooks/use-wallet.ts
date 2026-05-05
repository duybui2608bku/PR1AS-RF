"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/lib/store/auth-store"
import { walletService, type CreateDepositPayload } from "@/services/wallet.service"

export const WALLET_KEYS = {
  all: ["wallet"] as const,
  balance: () => [...WALLET_KEYS.all, "balance"] as const,
  transaction: (transactionId?: string) =>
    [...WALLET_KEYS.all, "transaction", transactionId] as const,
  deposits: (params?: { page?: number; limit?: number }) =>
    [...WALLET_KEYS.all, "deposits", params] as const,
}

export function useWalletBalance() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: WALLET_KEYS.balance(),
    queryFn: walletService.getBalance,
    enabled: isAuthenticated,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useDepositTransactions(params?: { page?: number; limit?: number }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: WALLET_KEYS.deposits(params),
    queryFn: () => walletService.getDepositTransactions(params),
    enabled: isAuthenticated,
    staleTime: 15_000,
  })
}

export function useWalletTransaction(transactionId?: string, enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: WALLET_KEYS.transaction(transactionId),
    queryFn: () => walletService.getTransaction(transactionId as string),
    enabled: Boolean(isAuthenticated && enabled && transactionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "pending" || !status ? 3_000 : false
    },
    staleTime: 0,
  })
}

export function useCreateDeposit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDepositPayload) => walletService.createDeposit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.all })
    },
  })
}
