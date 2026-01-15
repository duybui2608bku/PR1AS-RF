"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import type {
  CreateBookingInput,
  Booking,
  BookingQuery,
  BookingListResponse,
} from "../types/booking";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";

export const bookingApi = {
  createBooking: async (data: CreateBookingInput): Promise<Booking> => {
    const response = await api.post<ApiResponse<Booking>>(
      ApiEndpoint.BOOKINGS,
      data
    );
    return extractData(response);
  },

  getBookingById: async (bookingId: string): Promise<Booking> => {
    const response = await api.get<ApiResponse<Booking>>(
      buildEndpoint(ApiEndpoint.BOOKINGS_BY_ID, { id: bookingId })
    );
    return extractData(response);
  },

  getMyBookings: async (query?: BookingQuery): Promise<BookingListResponse> => {
    const response = await api.get<ApiResponse<BookingListResponse>>(
      ApiEndpoint.BOOKINGS_MY,
      { params: query }
    );
    return extractData(response);
  },

  getAllBookings: async (query?: BookingQuery): Promise<BookingListResponse> => {
    const response = await api.get<ApiResponse<BookingListResponse>>(
      ApiEndpoint.BOOKINGS_ALL,
      { params: query }
    );
    return extractData(response);
  },

  updateBookingStatus: async (
    bookingId: string,
    status: string,
    workerResponse?: string
  ): Promise<Booking> => {
    const response = await api.patch<ApiResponse<Booking>>(
      buildEndpoint(ApiEndpoint.BOOKINGS_BY_ID_STATUS, { id: bookingId }),
      { status, worker_response: workerResponse }
    );
    return extractData(response);
  },

  cancelBooking: async (
    bookingId: string,
    cancelledBy: string,
    reason: string,
    notes?: string
  ): Promise<Booking> => {
    const response = await api.patch<ApiResponse<Booking>>(
      buildEndpoint(ApiEndpoint.BOOKINGS_BY_ID_CANCEL, { id: bookingId }),
      { cancelled_by: cancelledBy, reason, notes }
    );
    return extractData(response);
  },

  updateBooking: async (
    bookingId: string,
    data: Partial<CreateBookingInput>
  ): Promise<Booking> => {
    const response = await api.patch<ApiResponse<Booking>>(
      buildEndpoint(ApiEndpoint.BOOKINGS_BY_ID, { id: bookingId }),
      data
    );
    return extractData(response);
  },
};
