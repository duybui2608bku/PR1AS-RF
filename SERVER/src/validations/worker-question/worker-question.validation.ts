import { z } from "zod";
import { Types } from "mongoose";
import {
  WorkerQuestionVisibility,
  WORKER_QUESTION_LIMITS,
} from "../../constants/worker-question";

const objectIdSchema = z
  .string()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId format",
  })
  .transform((val) => new Types.ObjectId(val));

export const createWorkerQuestionSchema = z.object({
  worker_id: objectIdSchema,
  question: z
    .string()
    .trim()
    .min(WORKER_QUESTION_LIMITS.MIN_QUESTION_LENGTH)
    .max(WORKER_QUESTION_LIMITS.MAX_QUESTION_LENGTH),
  visibility: z
    .nativeEnum(WorkerQuestionVisibility)
    .default(WorkerQuestionVisibility.PUBLIC),
  nickname: z
    .string()
    .trim()
    .max(WORKER_QUESTION_LIMITS.MAX_NICKNAME_LENGTH)
    .optional(),
  // Required only for guests; enforced in the service against the resolved user.
  email: z.string().trim().email().optional(),
});

export const answerWorkerQuestionSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(WORKER_QUESTION_LIMITS.MIN_ANSWER_LENGTH)
    .max(WORKER_QUESTION_LIMITS.MAX_ANSWER_LENGTH),
});

export const listWorkerQuestionsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : WORKER_QUESTION_LIMITS.DEFAULT_PAGE
    )
    .pipe(z.number().int().positive().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) =>
      val ? parseInt(val, 10) : WORKER_QUESTION_LIMITS.DEFAULT_LIMIT
    )
    .pipe(
      z.number().int().positive().min(1).max(WORKER_QUESTION_LIMITS.MAX_LIMIT)
    ),
});

export type CreateWorkerQuestionSchemaType = z.infer<
  typeof createWorkerQuestionSchema
>;
export type AnswerWorkerQuestionSchemaType = z.infer<
  typeof answerWorkerQuestionSchema
>;
export type ListWorkerQuestionsQuerySchemaType = z.infer<
  typeof listWorkerQuestionsQuerySchema
>;
