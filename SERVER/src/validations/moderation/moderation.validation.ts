import { z } from "zod";
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  RestrictionFeature,
  RestrictionStatus,
} from "../../constants/moderation";
import { VALIDATION_LIMITS } from "../../constants/validation";

export const blockUserSchema = z.object({
  blocked_user_id: z.string().min(1),
  block_profile: z.boolean().optional().default(false),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const reportPostSchema = z.object({
  post_id: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  description: z.string().trim().min(10).max(2000),
});

export const reportWorkerSchema = z.object({
  worker_id: z.string().min(1),
  booking_id: z.string().min(1).optional(),
  reason: z.nativeEnum(ReportReason),
  description: z.string().trim().min(10).max(2000),
  evidence_urls: z.array(z.string().url()).max(10).optional().default([]),
});

const paginationQuerySchema = {
  page: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(VALIDATION_LIMITS.PAGINATION_MAX_LIMIT)
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT),
};

export const reportQuerySchema = z
  .object({
    target_type: z.nativeEnum(ReportTargetType).optional(),
    status: z.nativeEnum(ReportStatus).optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    ...paginationQuerySchema,
  })
  .transform((query) => ({
    ...query,
    skip: (query.page - 1) * query.limit,
  }));

export const updateReportStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  admin_note: z.string().trim().max(2000).optional().nullable(),
});

export const createRestrictionSchema = z.object({
  user_id: z.string().min(1),
  feature: z.nativeEnum(RestrictionFeature),
  reason: z.string().trim().min(3).max(1000),
  ends_at: z.coerce.date().optional().nullable(),
  report_id: z.string().min(1).optional().nullable(),
});

export const restrictionQuerySchema = z
  .object({
    user_id: z.string().min(1).optional(),
    feature: z.nativeEnum(RestrictionFeature).optional(),
    status: z.nativeEnum(RestrictionStatus).optional(),
    ...paginationQuerySchema,
  })
  .transform((query) => ({
    ...query,
    skip: (query.page - 1) * query.limit,
  }));
