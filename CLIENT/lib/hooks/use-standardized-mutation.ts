"use client";

import { useMutation, UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { useErrorHandler } from "./use-error-handler";
import type { ApiError } from "../axios/config";

interface StandardizedMutationOptions<TData, TError = ApiError, TVariables = void, TContext = unknown> {
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
  customErrorMessage?: string;
  skipErrorNotification?: boolean;
}

export function useStandardizedMutation<
  TData = unknown,
  TError = ApiError,
  TVariables = void,
  TContext = unknown
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: StandardizedMutationOptions<TData, TError, TVariables, TContext> & Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn" | "onError">
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { handleError } = useErrorHandler();

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationFn,
    onError: (error, variables, context) => {
      if (!options?.skipErrorNotification) {
        handleError(error as unknown, options?.customErrorMessage);
      }
      if (options?.onError) {
        options.onError(error, variables, context);
      }
    },
  });
}
