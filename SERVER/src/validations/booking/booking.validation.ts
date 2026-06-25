import { z } from "zod";
import { Types } from "mongoose";
import {
  BookingStatus,
  CancellationReason,
  BOOKING_LIMITS,
  DisputeReason,
  DisputeResolution,
} from "../../constants/booking";
import { PricingUnit } from "../../types/worker/worker-service";
import { BOOKING_MESSAGES } from "../../constants/messages";

const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId format",
  })
  .transform((val) => new Types.ObjectId(val));

const dateSchema = z.coerce.date();

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
  });

const pricingSchema = z.object({
  unit: z.nativeEnum(PricingUnit),
  quantity: z.number().int().positive().min(1),
});

const guestContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().default(""),
});

export const createBookingSchema = z.object({
  worker_id: objectIdSchema,
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

export const createGuestBookingSchema = z.object({
  guest_contact: guestContactSchema,
  guest_locale: z.enum(["vi", "en", "ko", "zh"]).optional(),
  worker_id: objectIdSchema,
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

export const guestBookingLookupQuerySchema = z.object({
  public_ref: z.string().trim().min(1).max(64),
  email: z.string().trim().email().max(255),
});

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  worker_response: z.string().trim().max(1000).optional(),
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
    (data) =>
      data.schedule !== undefined ||
      data.pricing !== undefined ||
      data.client_notes !== undefined ||
      data.worker_response !== undefined,
    { message: "At least one field must be provided for update" }
  );

export const getBookingsQuerySchema = z.object({
  client_id: objectIdSchema.optional(),
  worker_id: objectIdSchema.optional(),
  role: z.enum(["client", "worker"]).optional(),
  status: z.nativeEnum(BookingStatus).optional(),
  service_code: z.string().optional(),
  search: z.string().trim().max(200).optional(),
  is_guest: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === "true" || value === true) return true;
      if (value === "false" || value === false) return false;
      return undefined;
    }),
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

export const adminBookingAnalyticsQuerySchema = z
  .object({
    start_date: dateSchema.optional(),
    end_date: dateSchema.optional(),
    recent_limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().positive().min(1).max(50)),
  })
  .refine(
    (data) =>
      !data.start_date || !data.end_date || data.start_date <= data.end_date,
    {
      message: "start_date must be before or equal to end_date",
      path: ["end_date"],
    }
  );

export const createDisputeSchema = z.object({
  reason: z.nativeEnum(DisputeReason),
  description: z.string().trim().min(10).max(2000),
  evidence_urls: z.array(z.string().url()).max(10).optional().default([]),
});

export const resolveDisputeSchema = z.object({
  resolution: z.nativeEnum(DisputeResolution),
  resolution_notes: z.string().trim().min(1).max(2000),
});

export type CreateBookingSchemaType = z.infer<typeof createBookingSchema>;
export type CreateGuestBookingSchemaType = z.infer<
  typeof createGuestBookingSchema
>;
export type GuestBookingLookupQuerySchemaType = z.infer<
  typeof guestBookingLookupQuerySchema
>;
export type UpdateBookingStatusSchemaType = z.infer<typeof updateBookingStatusSchema>;
export type CancelBookingReasonSchemaType = z.infer<typeof cancelBookingReasonSchema>;
export type UpdateBookingSchemaType = z.infer<typeof updateBookingSchema>;
export type GetBookingsQuerySchemaType = z.infer<typeof getBookingsQuerySchema>;
export type AdminBookingAnalyticsQuerySchemaType = z.infer<
  typeof adminBookingAnalyticsQuerySchema
>;
export type CreateDisputeSchemaType = z.infer<typeof createDisputeSchema>;
export type ResolveDisputeSchemaType = z.infer<typeof resolveDisputeSchema>;
