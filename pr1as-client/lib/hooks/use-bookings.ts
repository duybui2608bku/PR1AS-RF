"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  bookingService,
  type WorkerBookingScheduleQuery,
} from "@/services/booking.service"
import type {
  AdminBookingAnalyticsQuery,
  BookingListQuery,
  CancelBookingPayload,
  CreateBookingPayload,
  CreateGuestBookingPayload,
  CreateDisputePayload,
  UpdateBookingPayload,
  UpdateBookingStatusPayload,
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

export function useWorkerBookingSchedule(query: WorkerBookingScheduleQuery) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.bookings.schedule(query as Record<string, unknown>),
    queryFn: () => bookingService.getMyWorkerBookingSchedule(query),
    enabled: Boolean(isAuthenticated && query.start_date && query.end_date),
    staleTime: 30_000,
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

export function useAdminBookingAnalytics(query: AdminBookingAnalyticsQuery) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.bookings.adminAnalytics(
      query as Record<string, unknown>
    ),
    queryFn: () => bookingService.getAdminBookingAnalytics(query),
    enabled: isAuthenticated,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBookingPayload) =>
      bookingService.createBooking(payload),
    onSuccess: () => {
      toast.success("Đã tạo booking. Vui lòng chờ worker xác nhận.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể tạo booking."))
    },
  })
}

export function useCreateGuestBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateGuestBookingPayload) =>
      bookingService.createGuestBooking(payload),
    onSuccess: () => {
      toast.success("Đã tạo quick booking. Vui lòng chờ worker xác nhận.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể tạo quick booking."))
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: CancelBookingPayload
    }) => bookingService.cancelBooking(id, payload),
    onSuccess: () => {
      toast.success("Đã hủy booking.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể hủy booking."))
    },
  })
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateBookingStatusPayload
    }) => bookingService.updateBookingStatus(id, payload),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái booking.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật booking."))
    },
  })
}

export function useUpdateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateBookingPayload
    }) => bookingService.updateBooking(id, payload),
    onSuccess: () => {
      toast.success("Đã cập nhật booking.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật booking."))
    },
  })
}

export function useCreateDispute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: CreateDisputePayload
    }) => bookingService.createDispute(id, payload),
    onSuccess: () => {
      toast.success("Đã gửi khiếu nại.")
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể gửi khiếu nại."))
    },
  })
}
