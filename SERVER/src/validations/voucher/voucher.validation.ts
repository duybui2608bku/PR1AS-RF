import { z } from "zod";
import { Types } from "mongoose";
import { PricingPlanCode } from "../../constants/pricing";

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format",
});

const voucherPlanCodeSchema = z
  .nativeEnum(PricingPlanCode)
  .refine((v) => v !== PricingPlanCode.STANDARD, {
    message: "Voucher plan must be a paid plan",
  });

const voucherCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .regex(/^[A-Za-z0-9-]+$/, {
    message: "Code may only contain letters, numbers and dashes",
  });

export const createVouchersSchema = z
  .object({
    plan_code: voucherPlanCodeSchema,
    duration_months: z.number().int().min(1).max(24).default(1),
    max_uses: z.number().int().min(1).max(100000).default(1),
    quantity: z.number().int().min(1).max(100).default(1),
    code: voucherCodeSchema.optional(),
    expires_at: z.coerce.date().nullable().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => !value.code || value.quantity === 1, {
    message: "A custom code can only be used when quantity is 1",
    path: ["code"],
  });

export const updateVoucherSchema = z
  .object({
    is_active: z.boolean().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    expires_at: z.coerce.date().nullable().optional(),
    max_uses: z.number().int().min(1).max(100000).optional(),
  })
  .refine(
    (value) =>
      value.is_active !== undefined ||
      value.note !== undefined ||
      value.expires_at !== undefined ||
      value.max_uses !== undefined,
    {
      message: "At least one field must be provided for update",
    }
  );

export const listVouchersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(64).optional(),
  plan_code: voucherPlanCodeSchema.optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const voucherIdParamSchema = z.object({
  id: objectIdSchema,
});

export const redeemVoucherSchema = z.object({
  code: z.string().trim().min(4).max(64),
});
