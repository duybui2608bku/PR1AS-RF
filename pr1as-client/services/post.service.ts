import { api } from "@/lib/axios"
import type {
  ApiResponse,
  CreatePostPayload,
  CursorPaginatedResponse,
  PostFeedParams,
  PostPublic,
  UpdatePostPayload,
} from "@/types"

export const postService = {
  createPost: async (payload: CreatePostPayload) => {
    const { data } = await api.post<ApiResponse<PostPublic>>("/posts", payload)
    return data.data
  },

  getPostById: async (id: string) => {
    const { data } = await api.get<ApiResponse<PostPublic>>(`/posts/${id}`)
    return data.data
  },

  listFeed: async (params: PostFeedParams = {}) => {
    const query = new URLSearchParams()
    if (params.cursor) query.set("cursor", params.cursor)
    if (params.limit) query.set("limit", String(params.limit))
    if (params.author_id) query.set("author_id", params.author_id)
    if (params.hashtag) query.set("hashtag", params.hashtag)

    const { data } = await api.get<ApiResponse<CursorPaginatedResponse<PostPublic>>>(
      `/posts?${query.toString()}`,
    )
    return data.data
  },

  updatePost: async (id: string, payload: UpdatePostPayload) => {
    const { data } = await api.patch<ApiResponse<PostPublic>>(`/posts/${id}`, payload)
    return data.data
  },

  deletePost: async (id: string) => {
    await api.delete(`/posts/${id}`)
  },
}
