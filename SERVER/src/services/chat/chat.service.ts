import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ErrorCode } from "../../types/common/error.types";

import type {
  CreateMessageInput,
  SendMessageResponse,
  GetMessagesQuery,
  GetConversationsQuery,
  ConversationWithLastMessage,
  MarkAsReadInput,
  IMessage,
} from "../../types/chat/chat.types";

import { userRepository } from "../../repositories/auth/user.repository";

import { getSocketIO } from "../../config/socket";

import Message from "../../models/chat/message";

import {
  getOtherUserId,
  formatOtherUser,
  getUserRoom,
  getConversationRoom,
} from "../../utils/chat.helper";
import { CHAT_MESSAGES } from "../../constants/messages";
import { chatRepository } from "../../repositories/chat/chat.repository";
import { SOCKET_EVENTS } from "../../constants/socket";

export class ChatService {
  async sendMessage(
    sender_id: string,
    input: CreateMessageInput
  ): Promise<SendMessageResponse> {
    const receiver = await userRepository.findById(input.receiver_id);

    if (!receiver) {
      throw new AppError(
        CHAT_MESSAGES.RECEIVER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    if (sender_id === input.receiver_id) {
      throw new AppError(
        CHAT_MESSAGES.CANNOT_SEND_TO_SELF,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    if (input.reply_to_id) {
      const replyMessage = await chatRepository.getMessageById(
        input.reply_to_id,
        sender_id
      );

      if (!replyMessage) {
        throw new AppError(
          CHAT_MESSAGES.REPLY_MESSAGE_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.NOT_FOUND
        );
      }
    }

    const message = await chatRepository.createMessage(sender_id, input);

    const conversation = await chatRepository.findOrCreateConversation(
      sender_id,
      input.receiver_id
    );

    const io = getSocketIO();

    // Emit to user rooms (for notifications)
    io.to(getUserRoom(input.receiver_id)).emit(SOCKET_EVENTS.NEW_MESSAGE, {
      message,
      conversation,
    });
    io.to(getUserRoom(sender_id)).emit(SOCKET_EVENTS.NEW_MESSAGE, {
      message,
      conversation,
    });

    // Also emit to conversation room (for users currently viewing the conversation)
    if (message.conversation_id) {
      io.to(getConversationRoom(message.conversation_id)).emit(
        SOCKET_EVENTS.NEW_MESSAGE,
        {
          message,
          conversation,
        }
      );
    }

    return {
      message,
      conversation,
    };
  }

  async getMessages(
    user_id: string,
    query: GetMessagesQuery
  ): Promise<{
    messages: IMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 50 } = query;
    const result = await chatRepository.getMessages(user_id, {
      ...query,
      page,
      limit,
    });

    return {
      ...result,
      page,
      limit,
    };
  }

  async getConversations(
    user_id: string,
    query: GetConversationsQuery
  ): Promise<{
    conversations: ConversationWithLastMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = query;

    const result = await chatRepository.getUserConversations(user_id, {
      page,
      limit,
    });

    const enrichedConversations = await Promise.all(
      result.conversations.map(async (conv: ConversationWithLastMessage) => {
        const otherUserId = getOtherUserId(
          conv.sender_id.toString(),
          conv.receiver_id.toString(),
          user_id
        );

        const [otherUser, lastMessage, unreadCount] = await Promise.all([
          userRepository.findById(otherUserId),

          conv.last_message
            ? chatRepository.getMessageById(conv.last_message, user_id)
            : null,

          chatRepository.getUnreadCount(user_id, conv._id),
        ]);

        return {
          ...conv,
          last_message_data: lastMessage || undefined,
          other_user: formatOtherUser(otherUser),
          unread_count: unreadCount,
        };
      })
    );

    return {
      conversations: enrichedConversations,
      total: result.total,
      page,
      limit,
    };
  }

  async getConversation(
    user_id: string,
    conversation_id: string
  ): Promise<ConversationWithLastMessage | null> {
    const result = await chatRepository.getConversationWithDetails(
      conversation_id,

      user_id
    );

    if (!result) {
      return null;
    }

    const otherUserId = getOtherUserId(
      result.conversation.sender_id.toString(),
      result.conversation.receiver_id.toString(),
      user_id
    );

    const otherUser = await userRepository.findById(otherUserId);

    return {
      ...result.conversation,
      last_message_data: result.last_message,
      other_user: formatOtherUser(otherUser),
      unread_count: result.unread_count,
    };
  }

  async markAsRead(
    user_id: string,
    input: MarkAsReadInput
  ): Promise<{ updated_count: number }> {
    const updatedCount = await chatRepository.markMessagesAsRead(
      user_id,
      input.message_ids,
      input.conversation_id
    );

    if (updatedCount > 0 && input.conversation_id) {
      const io = getSocketIO();
      io.to(getConversationRoom(input.conversation_id)).emit(
        SOCKET_EVENTS.MESSAGE_READ,
        {
          conversation_id: input.conversation_id,
          read_by: user_id,
          read_at: new Date(),
        }
      );
    }

    return { updated_count: updatedCount };
  }

  async getUnreadCount(
    user_id: string,
    conversation_id?: string
  ): Promise<{ unread_count: number }> {
    const count = await chatRepository.getUnreadCount(user_id, conversation_id);
    return { unread_count: count };
  }

  async deleteMessage(
    user_id: string,
    message_id: string
  ): Promise<{ success: boolean }> {
    const message = await chatRepository.getMessageById(message_id, user_id);

    if (!message) {
      throw new AppError(
        CHAT_MESSAGES.MESSAGE_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    if (message.sender_id.toString() !== user_id) {
      throw new AppError(
        CHAT_MESSAGES.UNAUTHORIZED_DELETE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }

    await Message.findByIdAndDelete(message_id);

    const io = getSocketIO();

    io.to(getConversationRoom(message.conversation_id)).emit(
      SOCKET_EVENTS.MESSAGE_DELETED,
      {
        message_id,
        conversation_id: message.conversation_id,
      }
    );
    return { success: true };
  }
}

export const chatService = new ChatService();
