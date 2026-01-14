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
