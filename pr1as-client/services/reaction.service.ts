import { api } from "@/lib/axios"
import type {
  ApiResponse,
  ReactionSummaryPublic,
  ReactionTargetType,
  RemoveReactionPayload,
  UpsertReactionPayload,
} from "@/types"

export const reactionService = {
  upsert: async (payload: UpsertReactionPayload) => {
    const { data } = await api.post<ApiResponse<ReactionSummaryPublic>>(
      `/reactions`,
      payload,
    )
    return data.data
  },

  remove: async (payload: RemoveReactionPayload) => {
    const { data } = await api.delete<ApiResponse<ReactionSummaryPublic>>(
      `/reactions`,
      { data: payload },
    )
    return data.data
  },

  getSummary: async (target_type: ReactionTargetType, target_id: string) => {
    const { data } = await api.get<ApiResponse<ReactionSummaryPublic>>(
      `/reactions/summary`,
      { params: { target_type, target_id } },
    )
    return data.data
  },
}
