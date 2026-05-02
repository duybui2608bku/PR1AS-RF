"use client"

import { api, extractData } from "../axios/index"
import type { ApiResponse } from "../axios"
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints"
import type {
  CreatePostInput,
  FeedPage,
  Post,
  UpdatePostInput,
} from "../types/post"

export interface GetPostsParams {
  cursor?: string
  limit?: number
  author_id?: string
  hashtag?: string
}

export const postsApi = {
  getPosts: async (params?: GetPostsParams): Promise<FeedPage> => {
    const response = await api.get<ApiResponse<FeedPage>>(ApiEndpoint.POSTS, {
      params: {
        cursor: params?.cursor,
        limit: params?.limit ?? 10,
        author_id: params?.author_id,
        hashtag: params?.hashtag,
      },
    })
    return extractData(response)
  },

  getPostById: async (id: string): Promise<Post> => {
    const response = await api.get<ApiResponse<Post>>(
      buildEndpoint(ApiEndpoint.POSTS_BY_ID, { id })
    )
    return extractData(response)
  },

  createPost: async (input: CreatePostInput): Promise<Post> => {
    const response = await api.post<ApiResponse<Post>>(ApiEndpoint.POSTS, input)
    return extractData(response)
  },

  updatePost: async (id: string, input: UpdatePostInput): Promise<Post> => {
    const response = await api.patch<ApiResponse<Post>>(
      buildEndpoint(ApiEndpoint.POSTS_BY_ID, { id }),
      input
    )
    return extractData(response)
  },

  deletePost: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(
      buildEndpoint(ApiEndpoint.POSTS_BY_ID, { id })
    )
  },
}
