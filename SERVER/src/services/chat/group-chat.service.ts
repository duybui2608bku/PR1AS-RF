import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ErrorCode } from "../../types/common/error.types";
import type {
  CreateGroupMessageInput,
  SendGroupMessageResponse,
  GetGroupMessagesQuery,
  GetGroupConversationsQuery,
  GroupConversationWithLastMessage,
  MarkGroupMessagesReadInput,
  IMessageGroup,
  IConversationGroup,
} from "../../types/chat/group-chat.types";
import { getSocketIO } from "../../config/socket";
import { getGroupConversationRoom, getUserRoom } from "../../utils/chat.helper";
import { CHAT_MESSAGES, BOOKING_MESSAGES } from "../../constants/messages";
import { SOCKET_EVENTS } from "../../constants/socket";
import { groupChatRepository } from "../../repositories/chat";
import { userRepository } from "../../repositories/auth/user.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";

export class GroupChatService {
  private async ensureUserInConversation(
    user_id: string,
    conversation_group_id: string
  ) {
    const conversation =
      await groupChatRepository.getConversationGroupForUserById(
        conversation_group_id,
        user_id
      );

    if (!conversation) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    return conversation;
  }

  async sendGroupMessage(
    sender_id: string,
    input: CreateGroupMessageInput
  ): Promise<SendGroupMessageResponse> {
    const conversation =
      await groupChatRepository.findOrCreateConversationGroupByBooking(
        input.booking_id
      );

    if (!conversation) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    if (!conversation.members.includes(sender_id)) {
      throw new AppError(
        CHAT_MESSAGES.FAILED_JOIN_CONVERSATION,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }

    if (input.reply_to_id) {
      const replyMessage = await groupChatRepository.getMessageGroupByIdForUser(
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

    const message = await groupChatRepository.createGroupMessage(
      sender_id,
      conversation._id,
      input.type,
      input.content,
      input.reply_to_id
    );

    const io = getSocketIO();

    conversation.members.forEach((memberId) => {
      io.to(getUserRoom(memberId)).emit(SOCKET_EVENTS.NEW_MESSAGE, {
        message,
        conversation,
      });
    });

    io.to(getGroupConversationRoom(conversation._id)).emit(
      SOCKET_EVENTS.NEW_MESSAGE,
      {
        message,
        conversation,
      }
    );

    return {
      message,
      conversation,
    };
  }

  async getGroupMessages(
    user_id: string,
    query: GetGroupMessagesQuery
  ): Promise<{
    messages: IMessageGroup[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    let conversationGroupId = query.conversation_group_id;

    if (!conversationGroupId && query.booking_id) {
      const conversation =
        await groupChatRepository.getConversationGroupForUserByBooking(
          query.booking_id,
          user_id
        );

      if (!conversation) {
        throw new AppError(
          CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.NOT_FOUND
        );
      }

      conversationGroupId = conversation._id;
    }

    if (!conversationGroupId) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_ID_REQUIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    await this.ensureUserInConversation(user_id, conversationGroupId);

    const result = await groupChatRepository.getGroupMessages(
      conversationGroupId,
      {
        ...query,
        page,
        limit,
      }
    );

    return {
      ...result,
      page,
      limit,
    };
  }

  async getGroupConversations(
    user_id: string,
    query: GetGroupConversationsQuery
  ): Promise<{
    conversations: GroupConversationWithLastMessage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await groupChatRepository.getUserConversationGroups(
      user_id,
      {
        page,
        limit,
      }
    );

    const enrichedConversations = await Promise.all(
      result.conversations.map(async (conv) => {
        let lastMessage: IMessageGroup | undefined;
        if (conv.last_message) {
          const message = await groupChatRepository.getGroupMessages(conv._id, {
            page: 1,
            limit: 1,
          });
          lastMessage = message.messages[0];
        }

        const unreadCount = await groupChatRepository.getGroupUnreadCount(
          user_id,
          conv._id
        );

        return {
          ...conv,
          last_message_data: lastMessage,
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

  async getGroupConversation(
    user_id: string,
    conversation_group_id: string
  ): Promise<GroupConversationWithLastMessage | null> {
    const conversation = await this.ensureUserInConversation(
      user_id,
      conversation_group_id
    );

    let last_message: IMessageGroup | undefined;

    if (conversation.last_message) {
      const messages = await groupChatRepository.getGroupMessages(
        conversation._id,
        {
          page: 1,
          limit: 1,
        }
      );
      last_message = messages.messages[0];
    }

    const unread_count = await groupChatRepository.getGroupUnreadCount(
      user_id,
      conversation._id
    );

    return {
      ...conversation,
      last_message_data: last_message,
      unread_count,
    };
  }

  async markGroupMessagesAsRead(
    user_id: string,
    input: MarkGroupMessagesReadInput
  ): Promise<{ updated_count: number }> {
    if (!input.conversation_group_id && !input.message_ids) {
      throw new AppError(
        CHAT_MESSAGES.FAILED_MARK_READ,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    if (input.conversation_group_id) {
      await this.ensureUserInConversation(user_id, input.conversation_group_id);
    } else if (input.message_ids && input.message_ids.length > 0) {
      const message = await groupChatRepository.getMessageGroupByIdForUser(
        input.message_ids[0],
        user_id
      );
      if (!message) {
        throw new AppError(
          CHAT_MESSAGES.MESSAGE_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.NOT_FOUND
        );
      }
    }

    const updatedCount = await groupChatRepository.markGroupMessagesAsRead(
      user_id,
      input.conversation_group_id,
      input.message_ids
    );

    if (updatedCount > 0 && input.conversation_group_id) {
      const io = getSocketIO();
      io.to(getGroupConversationRoom(input.conversation_group_id)).emit(
        SOCKET_EVENTS.MESSAGE_READ,
        {
          conversation_group_id: input.conversation_group_id,
          read_by: user_id,
          read_at: new Date(),
        }
      );
    }

    return { updated_count: updatedCount };
  }

  async getGroupUnreadCount(
    user_id: string,
    conversation_group_id?: string
  ): Promise<{ unread_count: number }> {
    const count = await groupChatRepository.getGroupUnreadCount(
      user_id,
      conversation_group_id
    );
    return { unread_count: count };
  }

  async createComplaintConversationGroup(
    user_id: string,
    booking_id: string
  ): Promise<IConversationGroup> {
    const booking = await bookingRepository.findById(booking_id);

    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    const clientId = booking.client_id._id.toString();
    const workerId = booking.worker_id._id.toString();

    if (user_id !== clientId && user_id !== workerId) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }

    const admin = await userRepository.findFirstAdmin();

    if (!admin) {
      throw new AppError(
        CHAT_MESSAGES.FAILED_JOIN_CONVERSATION,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }

    const conversation =
      await groupChatRepository.findOrCreateComplaintConversationGroup(
        booking_id,
        admin._id.toString()
      );

    if (!conversation) {
      throw new AppError(
        CHAT_MESSAGES.FAILED_JOIN_CONVERSATION,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }

    return conversation;
  }
}

export const groupChatService = new GroupChatService();
