import { Response } from "express";
import { chatService } from "../../services/chat/chat.service";
import {
  sendMessageSchema,
  getMessagesSchema,
  getConversationsSchema,
  markAsReadSchema,
} from "../../validations/chat/chat.validation";
import { AuthRequest } from "../../middleware/auth";
import { AppError, R, validateWithSchema } from "../../utils";
import { COMMON_MESSAGES, CHAT_MESSAGES } from "../../constants/messages";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ErrorCode } from "../../types/common/error.types";

const requireAuth = (req: AuthRequest): string => {
  if (!req.user?.sub) {
    throw AppError.unauthorized(CHAT_MESSAGES.AUTHENTICATION_REQUIRED);
  }
  return req.user.sub;
};

export class ChatController {
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    const userId = requireAuth(req);
    const data = validateWithSchema(
      sendMessageSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.sendMessage(userId, data);
    R.created(res, result, CHAT_MESSAGES.MESSAGE_SENT_SUCCESS, req);
  }

  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    const userId = requireAuth(req);
    const query = validateWithSchema(
      getMessagesSchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.getMessages(userId, query);
    R.success(res, result, undefined, req);
  }

  async getConversations(req: AuthRequest, res: Response): Promise<void> {
    const userId = requireAuth(req);
    const query = validateWithSchema(
      getConversationsSchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.getConversations(userId, query);
    R.success(res, result, undefined, req);
  }

  async getConversation(req: AuthRequest, res: Response): Promise<void> {
    const userId = requireAuth(req);
    const { conversation_id } = req.params;

    if (!conversation_id) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_ID_REQUIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const result = await chatService.getConversation(userId, conversation_id);

    if (!result) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    R.success(res, { conversation: result }, undefined, req);
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    const userId = requireAuth(req);
    const data = validateWithSchema(
      markAsReadSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.markAsRead(userId, data);
    R.success(res, result, CHAT_MESSAGES.MESSAGES_MARKED_READ, req);
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    const userId = requireAuth(req);
    const { conversation_id } = req.query;
    const result = await chatService.getUnreadCount(
      userId,
      conversation_id as string | undefined
    );
    R.success(res, result, undefined, req);
  }

  async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    const userId = requireAuth(req);
    const { message_id } = req.params;

    if (!message_id) {
      throw new AppError(
        CHAT_MESSAGES.MESSAGE_ID_REQUIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const result = await chatService.deleteMessage(userId, message_id);
    R.success(res, result, CHAT_MESSAGES.MESSAGE_DELETED_SUCCESS, req);
  }
}

export const chatController = new ChatController();
