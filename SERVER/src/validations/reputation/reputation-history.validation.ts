import { z } from "zod";
import { VALIDATION_LIMITS } from "../../constants/validation";

export const reputationHistoryQuerySchema = z
  .object({
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
  })
  .transform((query) => ({
    ...query,
    skip: (query.page - 1) * query.limit,
  }));
