import { Response } from "express";
import { chatService, groupChatService } from "../../services/chat";
import {
  sendMessageSchema,
  getMessagesSchema,
  getConversationsSchema,
  markAsReadSchema,
  sendGroupMessageSchema,
  getGroupMessagesSchema,
  getGroupConversationsSchema,
  markGroupMessagesReadSchema,
  createComplaintConversationSchema,
} from "../../validations/chat/chat.validation";
import { AuthRequest } from "../../middleware/auth";
import {
  AppError,
  extractUserIdFromRequest,
  R,
  validateWithSchema,
} from "../../utils";
import { COMMON_MESSAGES, CHAT_MESSAGES } from "../../constants/messages";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ErrorCode } from "../../types/common/error.types";

export class ChatController {
  async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      sendMessageSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.sendMessage(userId, data);
    R.created(res, result, CHAT_MESSAGES.MESSAGE_SENT_SUCCESS, req);
  }

  async getMessages(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getMessagesSchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.getMessages(userId, query);
    R.success(res, result, undefined, req);
  }

  async getConversations(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getConversationsSchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.getConversations(userId, query);
    R.success(res, result, undefined, req);
  }

  async getConversation(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
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
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      markAsReadSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await chatService.markAsRead(userId, data);
    R.success(res, result, CHAT_MESSAGES.MESSAGES_MARKED_READ, req);
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { conversation_id } = req.query;
    const result = await chatService.getUnreadCount(
      userId,
      conversation_id as string | undefined
    );
    R.success(res, result, undefined, req);
  }

  async deleteMessage(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
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

  async sendGroupMessage(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      sendGroupMessageSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await groupChatService.sendGroupMessage(userId, data);
    R.created(res, result, CHAT_MESSAGES.MESSAGE_SENT_SUCCESS, req);
  }

  async getGroupMessages(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getGroupMessagesSchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await groupChatService.getGroupMessages(userId, query);
    R.success(res, result, undefined, req);
  }

  async getGroupConversations(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getGroupConversationsSchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await groupChatService.getGroupConversations(userId, query);
    R.success(res, result, undefined, req);
  }

  async getGroupConversation(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { conversation_group_id } = req.params;

    if (!conversation_group_id) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_ID_REQUIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const result = await groupChatService.getGroupConversation(
      userId,
      conversation_group_id
    );

    if (!result) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    R.success(res, { conversation: result }, undefined, req);
  }

  async markGroupMessagesRead(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      markGroupMessagesReadSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await groupChatService.markGroupMessagesAsRead(userId, data);
    R.success(res, result, CHAT_MESSAGES.MESSAGES_MARKED_READ, req);
  }

  async getGroupUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { conversation_group_id } = req.query;
    const result = await groupChatService.getGroupUnreadCount(
      userId,
      conversation_group_id as string | undefined
    );
    R.success(res, result, undefined, req);
  }

  async createComplaintConversation(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      createComplaintConversationSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await groupChatService.createComplaintConversationGroup(
      userId,
      data.booking_id
    );

    R.created(
      res,
      { conversation: result },
      CHAT_MESSAGES.MESSAGE_SENT_SUCCESS,
      req
    );
  }
}

export const chatController = new ChatController();
