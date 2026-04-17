"use client";

import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import { api, extractData, type ApiResponse } from "../axios";
import type { AxiosError } from "axios";


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


export function useApiMutation<TData = unknown, TVariables = unknown, TError = AxiosError<ApiResponse>>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: Omit<UseMutationOptions<ApiResponse<TData>, TError, TVariables>, "mutationFn">
) {
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
    ...options,
  });
}


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

