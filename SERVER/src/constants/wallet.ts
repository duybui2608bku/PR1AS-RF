export enum TransactionType {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
  PAYMENT = "payment",
  REFUND = "refund",
}

export enum TransactionStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum PaymentGateway {
  VNPAY = "vnpay",
}

export enum DateRangePreset {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_7_DAYS = "last_7_days",
  LAST_14_DAYS = "last_14_days",
  THIS_MONTH = "this_month",
}

export const TOP_USERS_LIMIT = 5 as const;

export const WALLET_LIMITS = {
  MIN_DEPOSIT_AMOUNT: 100,
  MAX_DEPOSIT_AMOUNT: 50000000,
  MIN_WITHDRAW_AMOUNT: 10000,
  MAX_WITHDRAW_AMOUNT: 50000000,
  MIN_BALANCE: 0,
} as const;

export const VNPAY_CONSTANTS = {
  CURRENCY_CODE: "VND",
  LOCALE: "vn",
  ORDER_TYPE: "other",
  ORDER_INFO_PREFIX: "NAP TIEN VAO TAI KHOAN",
} as const;

export enum VNPayResponseCode {
  SUCCESS = "00",
}

export const DATE_RANGE_OFFSETS = {
  YESTERDAY_DAYS: 1,
  LAST_7_DAYS_OFFSET: 6,
  LAST_14_DAYS_OFFSET: 13,
} as const;

export const DATE_UNITS = {
  DAY: "day",
  MONTH: "month",
} as const;

export const TRANSACTION_DESCRIPTIONS = {
  DEPOSIT_PREFIX: "Deposit",
  REFUND_PREFIX: "Refund for cancelled booking",
  HOLD_BALANCE_PREFIX: "Hold balance for booking",
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
} as const;
