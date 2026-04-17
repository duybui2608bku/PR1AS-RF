"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import type {
  CreateBookingInput,
  Booking,
  BookingQuery,
  BookingListResponse,
  DisputeReason,
  DisputeResolution,
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

  /**
   * Cancel a booking. Server determines cancelled_by from auth token role.
   */
  cancelBooking: async (
    bookingId: string,
    reason: string,
    notes?: string
  ): Promise<Booking> => {
    const response = await api.patch<ApiResponse<Booking>>(
      buildEndpoint(ApiEndpoint.BOOKINGS_BY_ID_CANCEL, { id: bookingId }),
      { reason, notes }
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

  /**
   * Client opens a dispute on a booking that is IN_PROGRESS.
   */
  createDispute: async (
    bookingId: string,
    reason: DisputeReason,
    description: string,
    evidenceUrls?: string[]
  ): Promise<Booking> => {
    const response = await api.post<ApiResponse<Booking>>(
      buildEndpoint(ApiEndpoint.BOOKINGS_BY_ID_DISPUTE, { id: bookingId }),
      { reason, description, evidence_urls: evidenceUrls || [] }
    );
    return extractData(response);
  },

  /**
   * Admin resolves a dispute.
   */
  resolveDispute: async (
    bookingId: string,
    resolution: DisputeResolution,
    resolutionNotes: string,
    refundAmount?: number
  ): Promise<Booking> => {
    const response = await api.patch<ApiResponse<Booking>>(
      buildEndpoint(ApiEndpoint.BOOKINGS_BY_ID_DISPUTE_RESOLVE, {
        id: bookingId,
      }),
      { resolution, resolution_notes: resolutionNotes, refund_amount: refundAmount }
    );
    return extractData(response);
  },
};

