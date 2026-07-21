import { api } from "@/lib/axios"
import type {
  AdminBookingAnalytics,
  AdminBookingAnalyticsQuery,
  Booking,
  BookingClientProfile,
  BookingListQuery,
  BookingListResponse,
  CancelBookingPayload,
  CreateBookingPayload,
  CreateGuestBookingPayload,
  CreateDisputePayload,
  GuestBookingLookupQuery,
  UpdateBookingPayload,
  UpdateBookingStatusPayload,
} from "@/types/booking"

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

export type WorkerBookingScheduleQuery = {
  start_date: string
  end_date: string
}

const SCHEDULE_PAGE_SIZE = 100

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

const buildParams = (
  query: BookingListQuery
): Record<string, string | number> => {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    limit: query.limit ?? 10,
  }
  if (query.role) params.role = query.role
  if (query.status) params.status = query.status
  if (query.service_code) params.service_code = query.service_code
  if (query.start_date) params.start_date = query.start_date
  if (query.end_date) params.end_date = query.end_date
  return params
}

const getMyBookings = async (query: BookingListQuery = {}) => {
  const response = await api.get<ApiResponse<BookingListResponse>>(
    "/bookings/my",
    { params: buildParams(query) }
  )
  return response.data.data ?? emptyList
}

export const bookingService = {
  createBooking: async (payload: CreateBookingPayload) => {
    const response = await api.post<ApiResponse<Booking>>("/bookings", payload)
    return response.data.data
  },

  createGuestBooking: async (payload: CreateGuestBookingPayload) => {
    const response = await api.post<ApiResponse<Booking>>(
      "/bookings/quickbook",
      payload
    )
    return response.data.data
  },

  getMyBookings,

  getAdminBookingAnalytics: async (params: AdminBookingAnalyticsQuery = {}) => {
    const query = new URLSearchParams()
    if (params.start_date) query.set("start_date", params.start_date)
    if (params.end_date) query.set("end_date", params.end_date)
    if (params.recent_limit) {
      query.set("recent_limit", String(params.recent_limit))
    }

    const response = await api.get<ApiResponse<AdminBookingAnalytics>>(
      `/bookings/admin/analytics?${query.toString()}`
    )
    return response.data.data
  },

  getMyWorkerBookingSchedule: async (query: WorkerBookingScheduleQuery) => {
    const response = await api.get<ApiResponse<BookingListResponse>>(
      "/bookings/my",
      {
        params: {
          role: "worker",
          page: 1,
          limit: SCHEDULE_PAGE_SIZE,
          start_date: query.start_date,
          end_date: query.end_date,
        },
      }
    )

    return response.data.data?.data ?? []
  },

  getBookingById: async (id: string) => {
    const response = await api.get<ApiResponse<Booking>>(`/bookings/${id}`)
    return response.data.data
  },

  lookupGuestBooking: async (query: GuestBookingLookupQuery) => {
    const params = new URLSearchParams()
    params.set("public_ref", query.public_ref)
    params.set("email", query.email)

    const response = await api.get<ApiResponse<Booking>>(
      `/bookings/lookup?${params.toString()}`
    )
    return response.data.data
  },

  cancelBooking: async (id: string, payload: CancelBookingPayload) => {
    const response = await api.patch<ApiResponse<Booking>>(
      `/bookings/${id}/cancel`,
      payload
    )
    return response.data.data
  },

  updateBookingStatus: async (
    id: string,
    payload: UpdateBookingStatusPayload
  ) => {
    const response = await api.patch<ApiResponse<Booking>>(
      `/bookings/${id}/status`,
      payload
    )
    return response.data.data
  },

  updateBooking: async (id: string, payload: UpdateBookingPayload) => {
    const response = await api.patch<ApiResponse<Booking>>(
      `/bookings/${id}`,
      payload
    )
    return response.data.data
  },

  createDispute: async (id: string, payload: CreateDisputePayload) => {
    const response = await api.post<ApiResponse<Booking>>(
      `/bookings/${id}/dispute`,
      payload
    )
    return response.data.data
  },

  getBookingClientProfile: async (
    bookingId: string
  ): Promise<BookingClientProfile> => {
    const response = await api.get<ApiResponse<BookingClientProfile>>(
      `/bookings/${bookingId}/client-profile`
    )
    if (!response.data.data) {
      throw new Error("Missing client profile in response")
    }
    return response.data.data
  },
}
