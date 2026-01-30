import { BookingStatus, BookingPaymentStatus, PricingUnit } from "@/lib/types/booking";
import type { TFunction } from "i18next";
import { TagColor } from "@/lib/constants/theme.constants";

export const BOOKING_CONSTANTS = {
  MIN_ADVANCE_HOURS: 2,
  MAX_ADVANCE_DAYS: 30,
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  PLATFORM_FEE_PERCENT: 2,
} as const;

export const BOOKING_TIME_SLOTS = {
  START_HOUR: 8,
  END_HOUR: 22,
  SLOT_DURATION_MINUTES: 30,
} as const;

export enum CancelledBy {
  CLIENT = "client",
  WORKER = "worker",
}

export enum CancellationReason {
  CLIENT_REQUEST = "client_request",
  WORKER_UNAVAILABLE = "worker_unavailable",
  SCHEDULE_CONFLICT = "schedule_conflict",
  EMERGENCY = "emergency",
  PAYMENT_FAILED = "payment_failed",
  POLICY_VIOLATION = "policy_violation",
  OTHER = "other",
}

export enum WorkerActionType {
  CONFIRM = "confirm",
  REJECT = "reject",
  START = "start",
  COMPLETE = "complete",
  CANCEL = "cancel",
}

export enum BookingTableColumnWidth {
  SERVICE_CODE = 150,
  WORKER = 150,
  CLIENT = 150,
  SCHEDULE = 200,
  AMOUNT = 150,
  STATUS = 120,
  PAYMENT_STATUS = 200,
  CREATED_AT = 180,
  ACTIONS = 200,
}

export enum BookingTableColumnKey {
  SERVICE_CODE = "service_code",
  WORKER = "worker_id",
  CLIENT = "client_id",
  SCHEDULE = "schedule",
  AMOUNT = "amount",
  STATUS = "status",
  PAYMENT_STATUS = "payment_status",
  CREATED_AT = "created_at",
  ACTIONS = "actions",
}

export const getBookingStatusTagColor = (status: BookingStatus): string => {
  const colorMap: Record<BookingStatus, TagColor> = {
    [BookingStatus.PENDING]: TagColor.ORANGE,
    [BookingStatus.CONFIRMED]: TagColor.BLUE,
    [BookingStatus.IN_PROGRESS]: TagColor.PURPLE,
    [BookingStatus.COMPLETED]: TagColor.GREEN,
    [BookingStatus.CANCELLED]: TagColor.DEFAULT,
    [BookingStatus.REJECTED]: TagColor.RED,
    [BookingStatus.DISPUTED]: TagColor.VOLCANO,
  };
  return colorMap[status] || TagColor.DEFAULT;
};

export const getPaymentStatusTagColor = (status: BookingPaymentStatus): string => {
  const colorMap: Record<BookingPaymentStatus, TagColor> = {
    [BookingPaymentStatus.PENDING]: TagColor.ORANGE,
    [BookingPaymentStatus.PAID]: TagColor.GREEN,
    [BookingPaymentStatus.PARTIALLY_REFUNDED]: TagColor.BLUE,
    [BookingPaymentStatus.REFUNDED]: TagColor.DEFAULT,
  };
  return colorMap[status] || TagColor.DEFAULT;
};

export const getPricingUnitLabel = (unit: PricingUnit, t: TFunction): string => {
  const unitMap: Record<PricingUnit, string> = {
    [PricingUnit.HOURLY]: t("booking.pricing.hourly"),
    [PricingUnit.DAILY]: t("booking.pricing.daily"),
    [PricingUnit.MONTHLY]: t("booking.pricing.monthly"),
  };
  return unitMap[unit] || unit;
};
