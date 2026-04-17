export const BOOKING_QUERY_KEYS = {
  CLIENT_BOOKINGS: "client-bookings",
  WORKER_BOOKINGS: "worker-bookings",
  ALL_SERVICES: "all-services",
} as const;

export const FILTER_VALUE_ALL = "all" as const;

export enum BookingPageConfig {
  REFRESH_MESSAGE_DURATION_SECONDS = 3,
}
