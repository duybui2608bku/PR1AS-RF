import mongoose from "mongoose";
import { z } from "zod";
import { PricingUnit } from "../../types/worker/worker-service";

const objectIdSchema = z
  .string({ required_error: "service_id is required" })
  .trim()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "service_id must be a valid ObjectId",
  });

const numberFromString = (schema: z.ZodNumber) =>
  z.preprocess((val) => {
    if (typeof val === "string" && val.trim() !== "") {
      const parsed = Number(val);
      return Number.isNaN(parsed) ? val : parsed;
    }
    return val;
  }, schema);

const pricingSchema = z
  .object({
    unit: z.nativeEnum(PricingUnit, {
      errorMap: () => ({
        message: `unit must be one of: ${Object.values(PricingUnit).join(", ")}`,
      }),
    }),
    duration: numberFromString(
      z
        .number({
          invalid_type_error: "duration must be a number",
          required_error: "duration is required",
        })
        .int({ message: "duration must be an integer" })
        .min(1, { message: "duration must be at least 1" })
    ),
    price: numberFromString(
      z
        .number({
          invalid_type_error: "price must be a number",
          required_error: "price is required",
        })
        .gt(0, { message: "price must be greater than 0" })
    ),
    currency: z
      .string({ invalid_type_error: "currency must be a string" })
      .trim()
      .min(3, { message: "currency must be a 3-letter code" })
      .max(3, { message: "currency must be a 3-letter code" })
      .optional()
      .transform((val) => (val ? val.toUpperCase() : "USD")),
  })
  .strict();

export const createWorkerServicesSchema = z
  .object({
    services: z
      .array(
        z
          .object({
            service_id: objectIdSchema,
            pricing: z
              .array(pricingSchema)
              .min(1, { message: "pricing must contain at least 1 item" }),
          })
          .strict()
      )
      .min(1, { message: "services must contain at least 1 item" })
      .max(20, { message: "services cannot exceed 20 items" }),
  })
  .strict();

export const updateWorkerServiceSchema = z
  .object({
    pricing: z
      .array(pricingSchema)
      .min(1, { message: "pricing must contain at least 1 item" })
      .optional(),
    is_active: z
      .boolean({
        invalid_type_error: "is_active must be a boolean",
      })
      .optional(),
  })
  .refine(
    (data) => typeof data.is_active !== "undefined" || data.pricing,
    {
      message: "At least one of pricing or is_active must be provided",
      path: ["pricing"],
    }
  );

export type CreateWorkerServicesBody = z.infer<
  typeof createWorkerServicesSchema
>;

export type UpdateWorkerServiceBody = z.infer<
  typeof updateWorkerServiceSchema
>;

