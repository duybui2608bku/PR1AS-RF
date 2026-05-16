"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { workerProfileService } from "@/services/worker-profile.service"
import { useAuthStore } from "@/lib/store/auth-store"
import type { WorkerProfileUpdateInput, WorkerServiceUpsertPayload } from "@/types"

export function useMyWorkerServices() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.workers.myServices,
    queryFn: async () => {
      try {
        return await workerProfileService.getMyWorkerServices()
      } catch {
        return []
      }
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  })
}

export function useUpdateWorkerProfile() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const userId = useAuthStore((s) => s.user?.id)

  return useMutation({
    mutationFn: (payload: WorkerProfileUpdateInput) =>
      workerProfileService.updateWorkerProfile(payload),
    onSuccess: (data) => {
      if (!data?.user) return
      setUser(data.user)
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      const id = data.user.id ?? userId
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.workers.detail(id) })
      }
    },
  })
}

export function useUpsertWorkerServices() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  return useMutation({
    mutationFn: (payload: WorkerServiceUpsertPayload) =>
      workerProfileService.upsertWorkerServices(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.myServices })
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.workers.detail(userId) })
      }
    },
  })
}
