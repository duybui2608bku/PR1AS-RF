import { z } from "zod";
import { MessageType } from "../../types/chat/message.type";

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
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export const getConversationsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const markAsReadSchema = z
  .object({
    message_ids: z.array(z.string()).optional(),
    conversation_id: z.string().optional(),
  })
  .refine((data) => data.message_ids || data.conversation_id, {
    message: "Either message_ids or conversation_id must be provided",
  });
