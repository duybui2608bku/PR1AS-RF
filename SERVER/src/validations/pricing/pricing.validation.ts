import { z } from "zod";
import { Types } from "mongoose";
import { PricingPlanCode } from "../../constants/pricing";

const nullablePositiveInt = z.union([z.number().int().positive(), z.null()]);

const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format",
});

export const pricingPlanFeaturesSchema = z.object({
  messaging_enabled: z.boolean(),
  messaging_max_recipients: nullablePositiveInt,
  create_job_enabled: z.boolean(),
  create_job_limit: nullablePositiveInt,
  boost_profile_enabled: z.boolean(),
  boost_profile_monthly_limit: z.union([z.number().int().min(0), z.null()]),
  ads_enabled: z.boolean(),
});

export const createPricingPackageSchema = z.object({
  package_code: z.nativeEnum(PricingPlanCode),
  display_name: z.string().trim().min(1).max(100),
  is_active: z.boolean().optional().default(true),
  features: pricingPlanFeaturesSchema,
});

export const updatePricingPackageSchema = z
  .object({
    display_name: z.string().trim().min(1).max(100).optional(),
    is_active: z.boolean().optional(),
    features: pricingPlanFeaturesSchema.optional(),
  })
  .refine(
    (value) =>
      value.display_name !== undefined ||
      value.is_active !== undefined ||
      value.features !== undefined,
    {
      message: "At least one field must be provided for update",
    }
  );

export const pricingPackageIdParamSchema = z.object({
  id: objectIdSchema,
});

export const upgradePricingSchema = z.object({
  target_plan_code: z.nativeEnum(PricingPlanCode),
  duration_months: z.number().int().min(1).max(24).default(1),
  idempotency_key: z.string().trim().min(8).max(128).optional(),
});
