import { AppError } from "../../utils/AppError";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { ErrorCode } from "../../types/common/error.types";
import type {
  CreateGroupMessageInput,
  SendGroupMessageResponse,
  GetGroupMessagesQuery,
  GetGroupConversationsQuery,
  GroupConversationWithLastMessage,
  GroupChatBooking,
  GroupChatMember,
  MarkGroupMessagesReadInput,
  IMessageGroup,
  IConversationGroup,
} from "../../types/chat/group-chat.types";
import { getSocketIO } from "../../config/socket";
import {
  formatGroupMember,
  getGroupConversationRoom,
  getUserRoom,
} from "../../utils/chat.helper";
import { CHAT_MESSAGES, BOOKING_MESSAGES } from "../../constants/messages";
import { BookingStatus } from "../../constants/booking";
import { SOCKET_EVENTS } from "../../constants/socket";
import { groupChatRepository } from "../../repositories/chat";
import { userRepository } from "../../repositories/auth/user.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import type { IBookingDocument } from "../../types/booking";

export class GroupChatService {
  private toId(value: unknown): string {
    if (value && typeof value === "object" && "_id" in value) {
      const idValue = (value as { _id: { toString: () => string } })._id;
      return idValue.toString();
    }

    return String(value);
  }

  private formatBookingData(
    booking: IBookingDocument,
    memberMap: Map<string, GroupChatMember>
  ): GroupChatBooking {
    const clientId = this.toId(booking.client_id);
    const workerId = this.toId(booking.worker_id);

    return {
      _id: booking._id.toString(),
      service_code: booking.service_code,
      status: booking.status,
      schedule: {
        start_time: booking.schedule.start_time,
        end_time: booking.schedule.end_time,
        duration_hours: booking.schedule.duration_hours,
      },
      pricing: {
        unit: booking.pricing.unit,
        quantity: booking.pricing.quantity,
      },
      client_id: clientId,
      worker_id: workerId,
      client: memberMap.get(clientId),
      worker: memberMap.get(workerId),
      dispute: booking.dispute
        ? {
            reason: booking.dispute.reason,
            description: booking.dispute.description,
            evidence_urls: booking.dispute.evidence_urls,
            disputed_by: this.toId(booking.dispute.disputed_by),
            disputed_at: booking.dispute.disputed_at,
            resolution: booking.dispute.resolution,
            resolution_notes: booking.dispute.resolution_notes,
            resolved_by: booking.dispute.resolved_by
              ? this.toId(booking.dispute.resolved_by)
              : null,
            resolved_at: booking.dispute.resolved_at,
          }
        : null,
      disputed_at: booking.disputed_at,
    };
  }

  private async ensureUserInConversation(
    user_id: string,
    conversation_group_id: string
  ): Promise<IConversationGroup> {
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
    // Validate sender is a booking participant BEFORE creating the conversation
    const booking = await bookingRepository.findById(input.booking_id);

    if (!booking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    const clientId =
      typeof booking.client_id === "object" && booking.client_id?._id
        ? booking.client_id._id.toString()
        : booking.client_id
          ? String(booking.client_id)
          : null;
    const workerId =
      typeof booking.worker_id === "object" && booking.worker_id?._id
        ? booking.worker_id._id.toString()
        : String(booking.worker_id);

    if (!clientId) {
      throw new AppError(
        CHAT_MESSAGES.FAILED_JOIN_CONVERSATION,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }

    const isBookingParticipant =
      sender_id === clientId || sender_id === workerId;

    const conversation = isBookingParticipant
      ? await groupChatRepository.findOrCreateConversationGroupByBooking(
          input.booking_id
        )
      : await groupChatRepository.getConversationGroupForUserByBooking(
          input.booking_id,
          sender_id
        );

    if (!conversation || !conversation.members.includes(sender_id)) {
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
      { message, conversation }
    );

    const groupRoom = getGroupConversationRoom(conversation._id);
    const notificationRecipients = (
      await Promise.all(
        conversation.members
          .filter((memberId) => memberId !== sender_id)
          .map(async (memberId) => {
            const sockets = await io.in(getUserRoom(memberId)).fetchSockets();
            const isViewingGroup = sockets.some((socket) =>
              socket.rooms.has(groupRoom)
            );
            return isViewingGroup ? null : memberId;
          })
      )
    ).filter((memberId): memberId is string => memberId !== null);

    if (notificationRecipients.length > 0) {
      void notificationEventService
        .chatMessage({
          recipientIds: notificationRecipients,
          actorId: sender_id,
          messageId: message._id.toString(),
          conversationGroupId: conversation._id.toString(),
          isGroup: true,
        })
        .catch((error) =>
          logger.error("Group chat message notification failed:", error)
        );
    }

    return { message, conversation };
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
      { ...query, page, limit }
    );

    return { ...result, page, limit };
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
      { page, limit }
    );

    // Batch fetch: fixed number of queries regardless of N conversations
    const lastMessageIds = result.conversations
      .filter((c) => c.last_message)
      .map((c) => c.last_message!);

    const conversationIds = result.conversations.map((c) => c._id);
    const memberIds = [
      ...new Set(result.conversations.flatMap((c) => c.members)),
    ];
    const bookingIds = [
      ...new Set(result.conversations.map((c) => c.booking_id)),
    ];

    const [lastMessages, unreadCountMap, members, bookings] = await Promise.all(
      [
        groupChatRepository.getMessageGroupsByIds(lastMessageIds),
        groupChatRepository.getGroupUnreadCounts(user_id, conversationIds),
        userRepository.findManyByIds(memberIds),
        bookingRepository.findManyByIds(bookingIds),
      ]
    );

    const messageMap = new Map(lastMessages.map((m) => [m._id, m]));
    const memberMap = new Map(
      members
        .map((member) => formatGroupMember(member))
        .filter((member): member is GroupChatMember => Boolean(member))
        .map((member) => [member._id, member])
    );
    const bookingMap = new Map(
      bookings.map((booking) => [
        booking._id.toString(),
        this.formatBookingData(booking, memberMap),
      ])
    );

    const enrichedConversations = result.conversations.map((conv) => ({
      ...conv,
      last_message_data: conv.last_message
        ? messageMap.get(conv.last_message)
        : undefined,
      unread_count: unreadCountMap.get(conv._id) ?? 0,
      members_data: conv.members
        .map((memberId) => memberMap.get(memberId))
        .filter((member): member is GroupChatMember => Boolean(member)),
      booking_data: bookingMap.get(conv.booking_id),
    }));

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
  ): Promise<GroupConversationWithLastMessage> {
    const conversation = await this.ensureUserInConversation(
      user_id,
      conversation_group_id
    );

    const [last_message, unread_count, members, bookings] = await Promise.all([
      conversation.last_message
        ? groupChatRepository.getMessageGroupById(conversation.last_message)
        : Promise.resolve(undefined),
      groupChatRepository.getGroupUnreadCount(user_id, conversation._id),
      userRepository.findManyByIds(conversation.members),
      bookingRepository.findManyByIds([conversation.booking_id]),
    ]);
    const memberMap = new Map(
      members
        .map((member) => formatGroupMember(member))
        .filter((member): member is GroupChatMember => Boolean(member))
        .map((member) => [member._id, member])
    );
    const booking = bookings[0];

    return {
      ...conversation,
      last_message_data: last_message ?? undefined,
      unread_count,
      members_data: conversation.members
        .map((memberId) => memberMap.get(memberId))
        .filter((member): member is GroupChatMember => Boolean(member)),
      booking_data: booking
        ? this.formatBookingData(booking, memberMap)
        : undefined,
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
      // Verify ALL provided messages belong to conversations the user is a member of
      const messages = await groupChatRepository.getMessageGroupsByIds(
        input.message_ids
      );
      const conversationIds = [
        ...new Set(messages.map((m) => m.conversation_group_id)),
      ];
      await Promise.all(
        conversationIds.map((id) => this.ensureUserInConversation(user_id, id))
      );
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

    const clientId =
      typeof booking.client_id === "object" && booking.client_id?._id
        ? booking.client_id._id.toString()
        : booking.client_id
          ? String(booking.client_id)
          : null;
    const workerId =
      typeof booking.worker_id === "object" && booking.worker_id?._id
        ? booking.worker_id._id.toString()
        : String(booking.worker_id);

    if (!clientId) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }

    if (user_id !== clientId && user_id !== workerId) {
      throw new AppError(
        BOOKING_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }

    if (booking.status !== BookingStatus.DISPUTED) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_DISPUTED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BOOKING_NOT_DISPUTED
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

    // Pass pre-fetched booking data to avoid a second DB lookup inside the repository
    const conversation =
      await groupChatRepository.findOrCreateComplaintConversationGroup(
        booking_id,
        admin._id.toString(),
        { clientId, workerId, serviceCode: booking.service_code }
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
