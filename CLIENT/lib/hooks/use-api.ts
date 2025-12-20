"use client";

import { useMutation, useQuery, useQueryClient, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import { api, extractData, type ApiResponse } from "../axios";
import type { AxiosError } from "axios";

/**
 * Generic API Query Hook
 */
export function useApiQuery<TData = unknown, TError = AxiosError<ApiResponse>>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<ApiResponse<TData>, TError>, "queryKey" | "queryFn">
) {
  return useQuery<ApiResponse<TData>, TError>({
    queryKey: key,
    queryFn: async () => {
      const response = await api.get<ApiResponse<TData>>(url);
      return response.data;
    },
    ...options,
  });
}

/**
 * Generic API Mutation Hook
 */
export function useApiMutation<TData = unknown, TVariables = unknown, TError = AxiosError<ApiResponse>>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: Omit<UseMutationOptions<ApiResponse<TData>, TError, TVariables>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<TData>, TError, TVariables>({
    mutationFn: async (variables) => {
      let response;
      switch (method) {
        case "POST":
          response = await api.post<ApiResponse<TData>>(url, variables);
          break;
        case "PUT":
          response = await api.put<ApiResponse<TData>>(url, variables);
          break;
        case "PATCH":
          response = await api.patch<ApiResponse<TData>>(url, variables);
          break;
        case "DELETE":
          response = await api.delete<ApiResponse<TData>>(url, { data: variables });
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries sau khi mutation thành công
      queryClient.invalidateQueries();
    },
    ...options,
  });
}

/**
 * Helper để extract data từ query result
 */
export function useApiQueryData<TData = unknown>(
  key: string[],
  url: string,
  options?: Omit<UseQueryOptions<ApiResponse<TData>, AxiosError<ApiResponse>>, "queryKey" | "queryFn">
) {
  const query = useApiQuery<TData>(key, url, options);
  return {
    ...query,
    data: query.data?.data,
  };
}

