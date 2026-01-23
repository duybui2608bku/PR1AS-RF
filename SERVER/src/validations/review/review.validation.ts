import { z } from "zod";
import { Types } from "mongoose";
import {
  ReviewStatus,
  ReviewType,
  REVIEW_LIMITS,
} from "../../constants/review";
import { REVIEW_MESSAGES } from "../../constants/messages";
import { VALIDATION_LIMITS } from "../../constants/validation";

const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId format",
  })
  .transform((val) => new Types.ObjectId(val));

const ratingSchema = z
  .number()
  .int()
  .min(REVIEW_LIMITS.MIN_RATING, REVIEW_MESSAGES.INVALID_RATING)
  .max(REVIEW_LIMITS.MAX_RATING, REVIEW_MESSAGES.INVALID_RATING);

const ratingDetailsSchema = z.object({
  professionalism: ratingSchema,
  punctuality: ratingSchema,
  communication: ratingSchema,
  service_quality: ratingSchema,
});

export const createReviewSchema = z
  .object({
    booking_id: objectIdSchema,
    worker_id: objectIdSchema,
    client_id: objectIdSchema,
    review_type: z.nativeEnum(ReviewType),
    rating: ratingSchema,
    rating_details: ratingDetailsSchema,
    comment: z
      .string()
      .trim()
      .min(
        REVIEW_LIMITS.MIN_COMMENT_LENGTH,
        REVIEW_MESSAGES.INVALID_COMMENT_LENGTH
      )
      .max(
        REVIEW_LIMITS.MAX_COMMENT_LENGTH,
        REVIEW_MESSAGES.INVALID_COMMENT_LENGTH
      ),
  })
  .refine(
    (data) => {
      const averageRating =
        (data.rating_details.professionalism +
          data.rating_details.punctuality +
          data.rating_details.communication +
          data.rating_details.service_quality) /
        REVIEW_LIMITS.RATING_DETAILS_COUNT;
      return Math.abs(averageRating - data.rating) <= 1;
    },
    {
      message: REVIEW_MESSAGES.RATING_MUST_BE_CONSISTENT_WITH_RATING_DETAILS,
      path: ["rating"],
    }
  );

export const updateReviewSchema = z
  .object({
    rating: ratingSchema.optional(),
    rating_details: ratingDetailsSchema.optional(),
    comment: z
      .string()
      .trim()
      .min(
        REVIEW_LIMITS.MIN_COMMENT_LENGTH,
        REVIEW_MESSAGES.INVALID_COMMENT_LENGTH
      )
      .max(
        REVIEW_LIMITS.MAX_COMMENT_LENGTH,
        REVIEW_MESSAGES.INVALID_COMMENT_LENGTH
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.rating && data.rating_details) {
        const averageRating =
          (data.rating_details.professionalism +
            data.rating_details.punctuality +
            data.rating_details.communication +
            data.rating_details.service_quality) /
          REVIEW_LIMITS.RATING_DETAILS_COUNT;
        return Math.abs(averageRating - data.rating) <= 1;
      }
      return true;
    },
    {
      message: REVIEW_MESSAGES.RATING_MUST_BE_CONSISTENT_WITH_RATING_DETAILS,
      path: ["rating"],
    }
  )
  .refine(
    (data) => {
      return (
        data.rating !== undefined ||
        data.rating_details !== undefined ||
        data.comment !== undefined
      );
    },
    {
      message: REVIEW_MESSAGES.AT_LEAST_ONE_FIELD_MUST_BE_PROVIDED_FOR_UPDATE,
    }
  );

export const replyReviewSchema = z.object({
  reply: z
    .string()
    .trim()
    .min(1)
    .max(REVIEW_LIMITS.MAX_REPLY_LENGTH, REVIEW_MESSAGES.INVALID_REPLY_LENGTH),
});

export const getReviewsQuerySchema = z.object({
  worker_id: z.string().optional(),
  client_id: z.string().optional(),
  booking_id: z.string().optional(),
  review_type: z.nativeEnum(ReviewType).optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
  min_rating: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(
      z
        .number()
        .min(REVIEW_LIMITS.MIN_RATING)
        .max(REVIEW_LIMITS.MAX_RATING)
        .optional()
    ),
  max_rating: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(
      z
        .number()
        .min(REVIEW_LIMITS.MIN_RATING)
        .max(REVIEW_LIMITS.MAX_RATING)
        .optional()
    ),
  is_visible: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return undefined;
    }),
  page: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE
    )
    .pipe(z.number().int().positive().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT
    )
    .pipe(
      z.number().int().positive().min(1).max(VALIDATION_LIMITS.PAGINATION_MAX_LIMIT)
    ),
});

export type CreateReviewSchemaType = z.infer<typeof createReviewSchema>;
export type UpdateReviewSchemaType = z.infer<typeof updateReviewSchema>;
export type ReplyReviewSchemaType = z.infer<typeof replyReviewSchema>;
export type GetReviewsQuerySchemaType = z.infer<typeof getReviewsQuerySchema>;
