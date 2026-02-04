import { z } from "zod";
import { MessageType } from "../../types/chat/message.type";
import { VALIDATION_LIMITS } from "../../constants/validation";

export const sendMessageSchema = z.object({
  receiver_id: z.string().min(1, "Receiver ID is required"),
  type: z.nativeEnum(MessageType, {
    errorMap: () => ({ message: "Invalid message type" }),
  }),
  content: z.string().min(1, "Content is required"),
  reply_to_id: z.string().optional().nullable(),
});

export const getMessagesSchema = z.object({
  conversation_id: z.string().optional(),
  receiver_id: z.string().optional(),
  page: z
    .coerce.number()
    .int()
    .positive()
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE),
  limit: z
    .coerce.number()
    .int()
    .positive()
    .max(VALIDATION_LIMITS.PAGINATION_MAX_LIMIT)
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT),
});

export const getConversationsSchema = z.object({
  page: z
    .coerce.number()
    .int()
    .positive()
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE),
  limit: z
    .coerce.number()
    .int()
    .positive()
    .max(VALIDATION_LIMITS.PAGINATION_MAX_LIMIT)
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT),
});

export const markAsReadSchema = z
  .object({
    message_ids: z.array(z.string()).optional(),
    conversation_id: z.string().optional(),
  })
  .refine((data) => data.message_ids || data.conversation_id, {
    message: "Either message_ids or conversation_id must be provided",
  });

export const sendGroupMessageSchema = z.object({
  booking_id: z.string().min(1, "Booking ID is required"),
  type: z.nativeEnum(MessageType, {
    errorMap: () => ({ message: "Invalid message type" }),
  }),
  content: z.string().min(1, "Content is required"),
  reply_to_id: z.string().optional().nullable(),
});

export const getGroupMessagesSchema = z.object({
  booking_id: z.string().optional(),
  conversation_group_id: z.string().optional(),
  page: z
    .coerce.number()
    .int()
    .positive()
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE),
  limit: z
    .coerce.number()
    .int()
    .positive()
    .max(VALIDATION_LIMITS.PAGINATION_MAX_LIMIT)
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT),
});

export const getGroupConversationsSchema = z.object({
  page: z
    .coerce.number()
    .int()
    .positive()
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_PAGE),
  limit: z
    .coerce.number()
    .int()
    .positive()
    .max(VALIDATION_LIMITS.PAGINATION_MAX_LIMIT)
    .optional()
    .default(VALIDATION_LIMITS.PAGINATION_DEFAULT_LIMIT),
});

export const markGroupMessagesReadSchema = z
  .object({
    message_ids: z.array(z.string()).optional(),
    conversation_group_id: z.string().optional(),
  })
  .refine(
    (data) => data.message_ids || data.conversation_group_id,
    {
      message:
        "Either message_ids or conversation_group_id must be provided",
    }
  );

export const createComplaintConversationSchema = z.object({
  booking_id: z.string().min(1, "Booking ID is required"),
});
