"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import {
  pricingService,
  type PricingMeResponse,
  type UpgradePricingPayload,
} from "@/services/pricing.service"

export const PRICING_KEYS = {
  all: ["pricing"] as const,
  me: () => [...PRICING_KEYS.all, "me"] as const,
}

export function useMyPricing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery<PricingMeResponse | undefined>({
    queryKey: PRICING_KEYS.me(),
    queryFn: pricingService.getMyPricing,
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useUpgradePricing() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (payload: UpgradePricingPayload) => pricingService.upgrade(payload),
    onSuccess: (data) => {
      if (data && user && token) {
        setAuth({
          user: {
            ...user,
            pricing_plan_code: data.plan_code,
            pricing_started_at: data.started_at,
            pricing_expires_at: data.expires_at,
          },
          token,
        })
      }
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      queryClient.invalidateQueries({ queryKey: ["wallet"] })
    },
  })
}
