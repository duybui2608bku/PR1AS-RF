import { z } from "zod";
import { FeedbackStatus, FeedbackType } from "../../constants/feedback";
import { VALIDATION_LIMITS } from "../../constants/validation";

export const createFeedbackSchema = z.object({
  type: z.nativeEnum(FeedbackType),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(5000),
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

export const feedbackQuerySchema = z
  .object({
    type: z.nativeEnum(FeedbackType).optional(),
    status: z.nativeEnum(FeedbackStatus).optional(),
    ...paginationQuerySchema,
  })
  .transform((query) => ({
    ...query,
    skip: (query.page - 1) * query.limit,
  }));

export const updateFeedbackStatusSchema = z.object({
  status: z.nativeEnum(FeedbackStatus),
  admin_note: z.string().trim().max(2000).optional().nullable(),
});
