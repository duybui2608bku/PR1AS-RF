"use client"

import { api, extractData } from "../axios/index"
import type { ApiResponse } from "../axios"
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints"
import type {
  CommentFlat,
  CommentsPage,
  CommentThreadItem,
  CreateCommentInput,
} from "../types/post"

export interface GetCommentsParams {
  cursor?: string
  limit?: number
}

export const commentsApi = {
  getComments: async (
    postId: string,
    params?: GetCommentsParams
  ): Promise<CommentsPage> => {
    const response = await api.get<ApiResponse<CommentsPage>>(
      buildEndpoint(ApiEndpoint.POSTS_COMMENTS, { postId }),
      {
        params: {
          cursor: params?.cursor,
          limit: params?.limit ?? 20,
        },
      }
    )
    return extractData(response)
  },

  createComment: async (
    postId: string,
    input: CreateCommentInput
  ): Promise<CommentThreadItem> => {
    const response = await api.post<ApiResponse<CommentThreadItem>>(
      buildEndpoint(ApiEndpoint.POSTS_COMMENTS, { postId }),
      input
    )
    return extractData(response)
  },

  updateComment: async (
    commentId: string,
    body: string
  ): Promise<CommentFlat> => {
    const response = await api.patch<ApiResponse<CommentFlat>>(
      buildEndpoint(ApiEndpoint.COMMENTS_BY_ID, { id: commentId }),
      { body }
    )
    return extractData(response)
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete<ApiResponse<null>>(
      buildEndpoint(ApiEndpoint.COMMENTS_BY_ID, { id: commentId })
    )
  },
}
