"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { workerQuestionService } from "@/services/worker-question.service"
import type { CreateWorkerQuestionPayload } from "@/types/worker-question"

export const WORKER_QUESTIONS_PAGE_SIZE = 5

export function useWorkerQuestions(workerId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.workerQuestions.byWorker(workerId),
    queryFn: ({ pageParam }) =>
      workerQuestionService.getWorkerQuestions(workerId, {
        page: pageParam,
        limit: WORKER_QUESTIONS_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: Boolean(workerId) && enabled,
    staleTime: 30_000,
  })
}

export function useAskWorkerQuestion(workerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateWorkerQuestionPayload) =>
      workerQuestionService.createWorkerQuestion(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workerQuestions.byWorker(workerId),
      })
    },
  })
}

export function useAnswerWorkerQuestion(workerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      questionId,
      answer,
    }: {
      questionId: string
      answer: string
    }) => workerQuestionService.answerWorkerQuestion(questionId, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workerQuestions.byWorker(workerId),
      })
    },
  })
}
