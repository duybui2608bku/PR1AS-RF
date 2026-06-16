import { api } from "@/lib/axios"
import type {
  CreateWorkerQuestionPayload,
  WorkerQuestionListResponse,
  WorkerQuestionView,
} from "@/types/worker-question"

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

const emptyList: WorkerQuestionListResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
}

export const workerQuestionService = {
  getWorkerQuestions: async (
    workerId: string,
    params: { page?: number; limit?: number } = {}
  ) => {
    const response = await api.get<ApiResponse<WorkerQuestionListResponse>>(
      `/worker-questions/worker/${workerId}`,
      { params: { page: params.page ?? 1, limit: params.limit ?? 20 } }
    )
    return response.data.data ?? emptyList
  },

  createWorkerQuestion: async (payload: CreateWorkerQuestionPayload) => {
    const response = await api.post<ApiResponse<{ id: string }>>(
      "/worker-questions",
      payload
    )
    return response.data.data
  },

  answerWorkerQuestion: async (questionId: string, answer: string) => {
    const response = await api.post<ApiResponse<WorkerQuestionView>>(
      `/worker-questions/${questionId}/answer`,
      { answer }
    )
    return response.data.data
  },
}
