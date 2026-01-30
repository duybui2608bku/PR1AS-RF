import { z } from "zod";
import { Types } from "mongoose";
import {
  BookingStatus,
  BookingPaymentStatus,
  CancellationReason,
  CancelledBy,
  BOOKING_LIMITS,
  BOOKING_FEE,
} from "../../constants/booking";
import { PricingUnit } from "../../types/worker/worker-service";
import { BOOKING_MESSAGES } from "../../constants/messages";

const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId format",
  })
  .transform((val) => new Types.ObjectId(val));

const dateSchema = z
  .union([z.string().datetime(), z.date(), z.string()])
  .transform((val) => {
    if (typeof val === "string") {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      return date;
    }
    return val;
  });

const scheduleSchema = z
  .object({
    start_time: dateSchema,
    end_time: dateSchema,
  })
  .refine((data) => data.start_time < data.end_time, {
    message: BOOKING_MESSAGES.INVALID_SCHEDULE,
    path: ["end_time"],
  })
  .refine(
    (data) => {
      const now = new Date();
      const minAdvanceTime = new Date(
        now.getTime() + BOOKING_LIMITS.MIN_ADVANCE_HOURS * 60 * 60 * 1000
      );
      return data.start_time >= minAdvanceTime;
    },
    {
      message: BOOKING_MESSAGES.INVALID_SCHEDULE_ADVANCE,
      path: ["start_time"],
    }
  )
  .refine(
    (data) => {
      const now = new Date();
      const maxAdvanceTime = new Date(
        now.getTime() + BOOKING_LIMITS.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000
      );
      return data.start_time <= maxAdvanceTime;
    },
    {
      message: BOOKING_MESSAGES.INVALID_SCHEDULE_MAX_ADVANCE,
      path: ["start_time"],
    }
  )
  .transform((data) => {
    const durationMs = data.end_time.getTime() - data.start_time.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    return {
      ...data,
      duration_hours: Math.round(durationHours * 10) / 10,
    };
  })
  .refine(
    (data) =>
      data.duration_hours >= BOOKING_LIMITS.MIN_DURATION_HOURS &&
      data.duration_hours <= BOOKING_LIMITS.MAX_DURATION_HOURS,
    {
      message: BOOKING_MESSAGES.INVALID_DURATION,
      path: ["duration_hours"],
    }
  );

const pricingSchema = z
  .object({
    unit: z.nativeEnum(PricingUnit),
    unit_price: z.number().positive().min(0.01),
    quantity: z.number().int().positive().min(1),
    currency: z
      .string()
      .default("VND")
      .transform((val) => val.toUpperCase().trim()),
  })
  .transform((data) => {
    const subtotal = data.unit_price * data.quantity;
    const platformFee =
      Math.round(((subtotal * BOOKING_FEE.PLATFORM_FEE_PERCENT) / 100) * 100) /
      100;
    const totalAmount = subtotal + platformFee;
    const workerPayout = subtotal - platformFee;
    return {
      ...data,
      subtotal: Math.round(subtotal * 100) / 100,
      platform_fee: platformFee,
      total_amount: Math.round(totalAmount * 100) / 100,
      worker_payout: Math.round(workerPayout * 100) / 100,
    };
  });

export const createBookingSchema = z.object({
  worker_id: objectIdSchema,
  client_id: objectIdSchema,
  worker_service_id: objectIdSchema,
  service_id: objectIdSchema,
  service_code: z
    .string()
    .trim()
    .min(1)
    .transform((val) => val.toUpperCase()),
  schedule: scheduleSchema,
  pricing: pricingSchema,
  client_notes: z.string().trim().max(1000).optional().default(""),
});

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  worker_response: z.string().trim().max(1000).optional(),
});

export const cancelBookingSchema = z.object({
  cancelled_by: z.nativeEnum(CancelledBy),
  reason: z.nativeEnum(CancellationReason),
  notes: z.string().trim().max(500).optional().default(""),
});

export const cancelBookingReasonSchema = z.object({
  reason: z.nativeEnum(CancellationReason),
  notes: z.string().trim().max(500).optional().default(""),
});

export const updateBookingSchema = z
  .object({
    schedule: scheduleSchema.optional(),
    pricing: pricingSchema.optional(),
    client_notes: z.string().trim().max(1000).optional(),
    worker_response: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => {
      return (
        data.schedule !== undefined ||
        data.pricing !== undefined ||
        data.client_notes !== undefined ||
        data.worker_response !== undefined
      );
    },
    {
      message: "At least one field must be provided for update",
    }
  );

export const getBookingsQuerySchema = z.object({
  client_id: objectIdSchema.optional(),
  worker_id: objectIdSchema.optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  payment_status: z.nativeEnum(BookingPaymentStatus).optional(),
  service_code: z.string().optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive().min(1).max(100)),
});

export type CreateBookingSchemaType = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusSchemaType = z.infer<
  typeof updateBookingStatusSchema
>;
export type CancelBookingSchemaType = z.infer<typeof cancelBookingSchema>;
export type CancelBookingReasonSchemaType = z.infer<
  typeof cancelBookingReasonSchema
>;
export type UpdateBookingSchemaType = z.infer<typeof updateBookingSchema>;
export type GetBookingsQuerySchemaType = z.infer<typeof getBookingsQuerySchema>;
