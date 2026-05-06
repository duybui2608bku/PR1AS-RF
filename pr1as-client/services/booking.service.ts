import { api } from "@/lib/axios"
import type {
  Booking,
  BookingListQuery,
  BookingListResponse,
  CancelBookingPayload,
  CreateDisputePayload,
} from "@/types/booking"

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

const emptyList: BookingListResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
}

const buildParams = (query: BookingListQuery): Record<string, string | number> => {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  }
  if (query.role) params.role = query.role
  if (query.status) params.status = query.status
  if (query.payment_status) params.payment_status = query.payment_status
  if (query.service_code) params.service_code = query.service_code
  if (query.start_date) params.start_date = query.start_date
  if (query.end_date) params.end_date = query.end_date
  return params
}

export const bookingService = {
  getMyBookings: async (query: BookingListQuery = {}) => {
    const response = await api.get<ApiResponse<BookingListResponse>>(
      "/bookings/my",
      { params: buildParams(query) },
    )
    return response.data.data ?? emptyList
  },

  getBookingById: async (id: string) => {
    const response = await api.get<ApiResponse<Booking>>(`/bookings/${id}`)
    return response.data.data
  },

  cancelBooking: async (id: string, payload: CancelBookingPayload) => {
    const response = await api.patch<ApiResponse<Booking>>(
      `/bookings/${id}/cancel`,
      payload,
    )
    return response.data.data
  },

  createDispute: async (id: string, payload: CreateDisputePayload) => {
    const response = await api.post<ApiResponse<Booking>>(
      `/bookings/${id}/dispute`,
      payload,
    )
    return response.data.data
  },
}
