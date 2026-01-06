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
  ORDER_INFO_PREFIX: "Nap tien vao tai khoan",
} as const;
