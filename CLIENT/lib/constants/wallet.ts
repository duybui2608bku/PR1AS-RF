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

export const WALLET_LIMITS = {
  MIN_DEPOSIT_AMOUNT: 100,
  MAX_DEPOSIT_AMOUNT: 50000000,
  MIN_WITHDRAW_AMOUNT: 10000,
  MAX_WITHDRAW_AMOUNT: 50000000,
  MIN_BALANCE: 0,
} as const;

export const DEPOSIT_AMOUNT_PRESETS = [
  50000, 100000, 200000, 500000, 1000000, 2000000, 5000000,
] as const;

import { TagColor } from "./theme.constants";

export enum StatusTagColor {
  PENDING = TagColor.ORANGE,
  SUCCESS = TagColor.GREEN,
  FAILED = TagColor.RED,
  CANCELLED = TagColor.DEFAULT,
  DEFAULT = TagColor.DEFAULT,
}

export enum TableColumnWidth {
  AMOUNT = 150,
  STATUS = 120,
  CREATED_AT = 180,
}

export enum TableColumnKey {
  AMOUNT = "amount",
  STATUS = "status",
  DESCRIPTION = "description",
  CREATED_AT = "created_at",
}

export const EMPTY_PLACEHOLDER = "-" as const;