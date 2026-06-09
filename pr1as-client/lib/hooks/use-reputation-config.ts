"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  reputationConfigService,
  type ReputationConfigKey,
  type UpdateReputationConfigInput,
} from "@/services/reputation-config.service"

export function useReputationConfigs() {
  return useQuery({
    queryKey: queryKeys.reputationConfig.all,
    queryFn: reputationConfigService.getAll,
    staleTime: 60_000,
  })
}

export function useUpdateReputationConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      key,
      ...changes
    }: { key: ReputationConfigKey } & UpdateReputationConfigInput) =>
      reputationConfigService.update(key, changes),
    onSuccess: () => {
      toast.success("Đã cập nhật cấu hình.")
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reputationConfig.all,
      })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật cấu hình."))
    },
  })
}
