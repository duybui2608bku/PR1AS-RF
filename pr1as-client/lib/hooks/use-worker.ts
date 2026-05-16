"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { workerService } from "@/services/worker.service"
import type { WorkerFavorite } from "@/types"

export function useWorkerDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.workers.detail(id ?? ""),
    queryFn: () => workerService.getWorkerById(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useWorkerSchedule(
  id: string | undefined,
  params: { start_date: string; end_date: string }
) {
  return useQuery({
    queryKey: queryKeys.workers.schedule(id ?? "", params),
    queryFn: () => workerService.getWorkerSchedule(id as string, params),
    enabled: Boolean(id && params.start_date && params.end_date),
    staleTime: 30_000,
  })
}

export function useWorkerSuggestions(id?: string, limit = 4) {
  return useQuery({
    queryKey: queryKeys.workers.suggestions(id ?? "", limit),
    queryFn: () => workerService.getWorkerSuggestions(id as string, limit),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useFavoriteWorkerIds() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.workers.favoriteIds,
    queryFn: workerService.getFavoriteWorkerIds,
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useFavoriteWorkers() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.workers.favorites,
    queryFn: workerService.getFavoriteWorkers,
    enabled: isAuthenticated,
    staleTime: 60_000,
  })
}

export function useToggleFavoriteWorker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { workerId: string; favorite: boolean }) =>
      input.favorite
        ? workerService.addFavoriteWorker(input.workerId)
        : workerService.removeFavoriteWorker(input.workerId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.workers.favoriteIds,
      })

      const previousIds =
        queryClient.getQueryData<string[]>(queryKeys.workers.favoriteIds) ?? []
      const previousFavorites = queryClient.getQueryData<WorkerFavorite[]>(
        queryKeys.workers.favorites
      )
      const nextIds = input.favorite
        ? Array.from(new Set([...previousIds, input.workerId]))
        : previousIds.filter((id) => id !== input.workerId)

      queryClient.setQueryData(queryKeys.workers.favoriteIds, nextIds)

      if (!input.favorite) {
        queryClient.setQueryData<WorkerFavorite[]>(
          queryKeys.workers.favorites,
          (previous) =>
            previous?.filter((worker) => worker.id !== input.workerId) ?? []
        )
      }

      return { previousIds, previousFavorites }
    },
    onError: (_error, _input, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(
          queryKeys.workers.favoriteIds,
          context.previousIds
        )
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          queryKeys.workers.favorites,
          context.previousFavorites
        )
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workers.favoriteIds,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workers.favorites,
      })
    },
  })
}
