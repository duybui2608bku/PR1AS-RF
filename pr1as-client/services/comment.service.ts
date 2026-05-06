import { api } from "@/lib/axios"
import type {
  ApiResponse,
  CommentListParams,
  CommentPublic,
  CommentsPage,
  CreatedComment,
  CreateCommentPayload,
  UpdateCommentPayload,
} from "@/types"

export const commentService = {
  listByPost: async (postId: string, params: CommentListParams = {}) => {
    const query = new URLSearchParams()
    if (params.cursor) query.set("cursor", params.cursor)
    if (params.limit) query.set("limit", String(params.limit))

    const suffix = query.toString() ? `?${query.toString()}` : ""
    const { data } = await api.get<ApiResponse<CommentsPage>>(
      `/posts/${postId}/comments${suffix}`,
    )
    return data.data
  },

  create: async (postId: string, payload: CreateCommentPayload) => {
    const { data } = await api.post<ApiResponse<CreatedComment>>(
      `/posts/${postId}/comments`,
      payload,
    )
    return data.data
  },

  update: async (commentId: string, payload: UpdateCommentPayload) => {
    const { data } = await api.patch<ApiResponse<CommentPublic>>(
      `/comments/${commentId}`,
      payload,
    )
    return data.data
  },

  delete: async (commentId: string) => {
    await api.delete<ApiResponse<null>>(`/comments/${commentId}`)
  },
}
