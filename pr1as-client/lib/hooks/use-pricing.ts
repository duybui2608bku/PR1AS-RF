"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import {
  pricingService,
  type PricingMeResponse,
  type UpgradePricingPayload,
  type PricingPackage,
  type PricingPackagePayload,
  type UpdatePricingPackagePayload,
} from "@/services/pricing.service"

export const PRICING_KEYS = {
  all: ["pricing"] as const,
  me: () => [...PRICING_KEYS.all, "me"] as const,
  publicPackages: () => [...PRICING_KEYS.all, "packages"] as const,
  adminPackages: () => [...PRICING_KEYS.all, "packages", "admin"] as const,
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
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (payload: UpgradePricingPayload) => pricingService.upgrade(payload),
    onSuccess: (data) => {
      if (data) {
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          setUser({
            ...currentUser,
            pricing_plan_code: data.plan_code,
            pricing_started_at: data.started_at,
            pricing_expires_at: data.expires_at,
          })
        }
        queryClient.setQueryData(PRICING_KEYS.me(), data)
      }
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      queryClient.invalidateQueries({ queryKey: ["wallet"] })
    },
  })
}

export function useAdminPricingPackages() {
  return useQuery<PricingPackage[]>({
    queryKey: PRICING_KEYS.adminPackages(),
    queryFn: pricingService.getAdminPackages,
    staleTime: 30_000,
  })
}

export function useCreatePricingPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PricingPackagePayload) =>
      pricingService.createPackage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.adminPackages() })
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.publicPackages() })
    },
  })
}

export function useUpdatePricingPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdatePricingPackagePayload
    }) => pricingService.updatePackage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.adminPackages() })
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.publicPackages() })
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.me() })
    },
  })
}

export function useDeletePricingPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => pricingService.deletePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.adminPackages() })
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.publicPackages() })
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.me() })
    },
  })
}
