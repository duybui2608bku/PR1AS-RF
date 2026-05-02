import { z } from "zod";
import { HASHTAG_LIMITS, TRENDING_WINDOW_KEYS } from "../../constants/hashtag";

export const trendingQuerySchema = z.object({
  window: z
    .string()
    .optional()
    .transform((val) => (val ?? "24h") as (typeof TRENDING_WINDOW_KEYS)[number])
    .pipe(z.enum(TRENDING_WINDOW_KEYS as [string, ...string[]])),
  limit: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : HASHTAG_LIMITS.TRENDING_DEFAULT_LIMIT
    )
    .pipe(
      z.number().int().positive().min(1).max(HASHTAG_LIMITS.TRENDING_MAX_LIMIT)
    ),
});

export type TrendingQuerySchemaType = z.infer<typeof trendingQuerySchema>;
