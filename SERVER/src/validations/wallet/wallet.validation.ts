import { z } from "zod";

import {
  TransactionType,
  TransactionStatus,
  WALLET_LIMITS,
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

  user_id: z.string().optional(),

  page: z.coerce.number().int().positive().optional(),

  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type CreateDepositSchemaType = z.infer<typeof createDepositSchema>;

export type TransactionHistoryQuerySchemaType = z.infer<
  typeof transactionHistoryQuerySchema
>;

