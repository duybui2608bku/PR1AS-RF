"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { bookingService } from "@/services/booking.service"
import type {
  BookingListQuery,
  CancelBookingPayload,
  CreateDisputePayload,
} from "@/types/booking"

export function useMyBookings(query: BookingListQuery) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.bookings.list(query as Record<string, unknown>),
    queryFn: () => bookingService.getMyBookings(query),
    enabled: isAuthenticated,
    staleTime: 15_000,
  })
}

export function useBookingDetail(id?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.bookings.detail(id ?? ""),
    queryFn: () => bookingService.getBookingById(id as string),
    enabled: Boolean(isAuthenticated && id),
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelBookingPayload }) =>
      bookingService.cancelBooking(id, payload),
    onSuccess: () => {
      toast.success("Đã hủy booking.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể hủy booking."))
    },
  })
}

export function useCreateDispute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateDisputePayload }) =>
      bookingService.createDispute(id, payload),
    onSuccess: () => {
      toast.success("Đã gửi khiếu nại.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể gửi khiếu nại."))
    },
  })
}
