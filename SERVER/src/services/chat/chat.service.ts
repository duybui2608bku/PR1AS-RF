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
  IConversation,
} from "../../types/chat/chat.types";

import { userRepository } from "../../repositories/auth/user.repository";
import { UserRole } from "../../types/auth/user.types";

import { getSocketIO } from "../../config/socket";

import {
  getOtherUserId,
  formatOtherUser,
  getUserRoom,
  getConversationRoom,
} from "../../utils/chat.helper";
import { CHAT_MESSAGES } from "../../constants/messages";
import { chatRepository } from "../../repositories/chat/chat.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { SOCKET_EVENTS } from "../../constants/socket";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { moderationService } from "../moderation";
import { moderationRepository } from "../../repositories/moderation";

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

    await moderationService.ensureChatAllowed(sender_id, input.receiver_id);

    // Admin support chat bypasses the booking requirement so any user can
    // contact admin (and admin can reach out to any user) at any time.
    const sender = await userRepository.findById(sender_id);
    const isAdminConversation =
      receiver.roles?.includes(UserRole.ADMIN) ||
      sender?.roles?.includes(UserRole.ADMIN);

    if (!isAdminConversation) {
      const hasConfirmedBooking =
        await bookingRepository.hasConfirmedBookingBetweenUsers(
          sender_id,
          input.receiver_id
        );

      if (!hasConfirmedBooking) {
        throw new AppError(
          CHAT_MESSAGES.BOOKING_CONFIRMATION_REQUIRED,
          HTTP_STATUS.FORBIDDEN,
          ErrorCode.FORBIDDEN
        );
      }
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

    // Emit to user rooms so both parties update their conversation list
    io.to(getUserRoom(input.receiver_id)).emit(SOCKET_EVENTS.NEW_MESSAGE, {
      message,
      conversation,
    });
    io.to(getUserRoom(sender_id)).emit(SOCKET_EVENTS.NEW_MESSAGE, {
      message,
      conversation,
    });

    // Emit to conversation room for users actively viewing it
    if (message.conversation_id) {
      io.to(getConversationRoom(message.conversation_id)).emit(
        SOCKET_EVENTS.NEW_MESSAGE,
        { message, conversation }
      );
    }

    if (message.conversation_id) {
      const conversationRoom = getConversationRoom(message.conversation_id);
      const receiverSockets = await io
        .in(getUserRoom(input.receiver_id))
        .fetchSockets();
      const isReceiverViewingConversation = receiverSockets.some((socket) =>
        socket.rooms.has(conversationRoom)
      );

      if (!isReceiverViewingConversation) {
        void notificationEventService
          .chatMessage({
            recipientIds: [input.receiver_id],
            actorId: sender_id,
            messageId: message._id.toString(),
            conversationId: message.conversation_id,
            isGroup: false,
          })
          .catch((error) =>
            logger.error("Chat message notification failed:", error)
          );
      }
    }

    return { message, conversation };
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

    return { ...result, page, limit };
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

    // Collect all IDs upfront for batch fetching — avoids N×3 queries
    const otherUserIds = result.conversations.map((conv: IConversation) =>
      getOtherUserId(
        conv.sender_id.toString(),
        conv.receiver_id.toString(),
        user_id
      )
    );

    const lastMessageIds = result.conversations
      .filter((conv: IConversation) => conv.last_message)
      .map((conv: IConversation) => conv.last_message!);

    const conversationIds = result.conversations.map(
      (conv: IConversation) => conv._id
    );

    // 3 queries regardless of how many conversations
    const [otherUsers, lastMessages, unreadCountMap] = await Promise.all([
      userRepository.findManyByIds(otherUserIds),
      chatRepository.getMessagesByIds(lastMessageIds),
      chatRepository.getConversationUnreadCounts(conversationIds, user_id),
    ]);

    const userMap = new Map(otherUsers.map((u) => [u._id.toString(), u]));
    const messageMap = new Map(lastMessages.map((m) => [m._id.toString(), m]));

    const blockPairs = await Promise.all(
      otherUserIds.map(async (otherUserId) => ({
        otherUserId,
        outgoing: await moderationRepository.findBlock(user_id, otherUserId),
        incoming: await moderationRepository.findBlock(otherUserId, user_id),
      }))
    );
    const blockMap = new Map(
      blockPairs.map((item) => [item.otherUserId, item])
    );

    const enrichedConversations = result.conversations.map(
      (conv: IConversation) => {
        const otherUserId = getOtherUserId(
          conv.sender_id.toString(),
          conv.receiver_id.toString(),
          user_id
        );
        const otherUser = userMap.get(otherUserId) || null;
        const formattedUser = formatOtherUser(otherUser);
        const block = blockMap.get(otherUserId);
        return {
          ...conv,
          last_message_data: conv.last_message
            ? messageMap.get(conv.last_message)
            : undefined,
          other_user: formattedUser
            ? {
                ...formattedUser,
                is_blocked: Boolean(block?.outgoing),
                has_blocked_me: Boolean(block?.incoming),
                block_profile: Boolean(block?.outgoing?.block_profile),
              }
            : formattedUser,
          unread_count: unreadCountMap.get(conv._id) ?? 0,
        };
      }
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
    const [outgoingBlock, incomingBlock] = await Promise.all([
      moderationRepository.findBlock(user_id, otherUserId),
      moderationRepository.findBlock(otherUserId, user_id),
    ]);
    const formattedUser = formatOtherUser(otherUser);

    return {
      ...result.conversation,
      last_message_data: result.last_message,
      other_user: formattedUser
        ? {
            ...formattedUser,
            is_blocked: Boolean(outgoingBlock),
            has_blocked_me: Boolean(incomingBlock),
            block_profile: Boolean(outgoingBlock?.block_profile),
          }
        : formattedUser,
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

  async getAdminContact(): Promise<{
    _id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
  } | null> {
    const admin = await userRepository.findFirstAdmin();
    if (!admin) return null;
    const formatted = formatOtherUser(admin);
    return formatted ?? null;
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

    await chatRepository.softDeleteMessage(message_id);

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
