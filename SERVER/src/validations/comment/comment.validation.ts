import { z } from "zod";
import { Types } from "mongoose";
import { COMMENT_LIMITS } from "../../constants/comment";
import { POST_LIMITS } from "../../constants/post";
import { COMMENT_MESSAGES } from "../../constants/messages";

const objectIdString = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId",
});

export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(COMMENT_LIMITS.MIN_BODY_LENGTH, COMMENT_MESSAGES.INVALID_BODY_LENGTH)
    .max(COMMENT_LIMITS.MAX_BODY_LENGTH, COMMENT_MESSAGES.INVALID_BODY_LENGTH),
  parent_comment_id: objectIdString.nullable().optional(),
});

export const updateCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(COMMENT_LIMITS.MIN_BODY_LENGTH, COMMENT_MESSAGES.INVALID_BODY_LENGTH)
    .max(COMMENT_LIMITS.MAX_BODY_LENGTH, COMMENT_MESSAGES.INVALID_BODY_LENGTH),
});

export const getCommentsQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : POST_LIMITS.COMMENTS_DEFAULT_LIMIT
    )
    .pipe(
      z.number().int().positive().min(1).max(POST_LIMITS.COMMENTS_MAX_LIMIT)
    ),
});

export type CreateCommentSchemaType = z.infer<typeof createCommentSchema>;
export type UpdateCommentSchemaType = z.infer<typeof updateCommentSchema>;
export type GetCommentsQuerySchemaType = z.infer<typeof getCommentsQuerySchema>;
