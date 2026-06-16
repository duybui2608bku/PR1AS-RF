export type WorkerQuestionVisibility = "public" | "private"

export interface WorkerQuestionView {
  id: string
  visibility: WorkerQuestionVisibility
  asker_nickname: string | null
  question: string
  answer: string | null
  answered_at: string | null
  is_answered: boolean
  is_masked: boolean
  can_answer: boolean
  created_at: string
}

export interface WorkerQuestionPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface WorkerQuestionListResponse {
  data: WorkerQuestionView[]
  pagination: WorkerQuestionPagination
}

export interface CreateWorkerQuestionPayload {
  worker_id: string
  question: string
  visibility: WorkerQuestionVisibility
  nickname?: string
  email?: string
}
