import { z } from "zod";

import {
  TransactionType,
  TransactionStatus,
  WALLET_LIMITS,
  DateRangePreset,
  SePayTransferType,
} from "../../constants/wallet";

import { WALLET_MESSAGES } from "../../constants/messages";

export const createDepositSchema = z.object({
  amount: z
    .number()
    .int()
    .min(
      WALLET_LIMITS.MIN_DEPOSIT_AMOUNT,
      WALLET_MESSAGES.DEPOSIT_AMOUNT_TOO_LOW
    )
    .max(
      WALLET_LIMITS.MAX_DEPOSIT_AMOUNT,
      WALLET_MESSAGES.DEPOSIT_AMOUNT_TOO_HIGH
    ),
});

export const transactionHistoryQuerySchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  status: z.nativeEnum(TransactionStatus).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  user_id: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const sePayWebhookSchema = z.object({
  id: z.coerce.number().int().positive(),
  gateway: z.string().min(1),
  transactionDate: z.string().min(1),
  accountNumber: z.string().min(1),
  code: z.string().nullable().optional().default(null),
  content: z.string().default(""),
  transferType: z.nativeEnum(SePayTransferType),
  transferAmount: z.coerce.number().int().nonnegative(),
  accumulated: z.coerce.number().nonnegative(),
  subAccount: z.string().nullable().optional().default(null),
  referenceCode: z.string().min(1),
  description: z.string().default(""),
});

export const dateRangeQuerySchema = z.object({
  date_range: z.nativeEnum(DateRangePreset),
});

export type CreateDepositSchemaType = z.infer<typeof createDepositSchema>;

export type TransactionHistoryQuerySchemaType = z.infer<
  typeof transactionHistoryQuerySchema
>;

export type DateRangeQuerySchemaType = z.infer<typeof dateRangeQuerySchema>;

export type SePayWebhookSchemaType = z.infer<typeof sePayWebhookSchema>;
