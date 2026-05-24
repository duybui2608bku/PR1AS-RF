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
import type { IUserDocument } from "../../types/auth/user.types";
import { sanitizeMessageContent } from "../../utils/sanitize";
import { isValidMediaUrl } from "../../utils/mediaUrl";
import { MessageType } from "../../types/chat/message.type";

export class ChatService {
  private isAdmin(user: Pick<IUserDocument, "roles"> | null): boolean {
    return Boolean(user?.roles?.includes(UserRole.ADMIN));
  }

  private async ensureDirectChatAllowed(
    sender: IUserDocument,
    receiver: IUserDocument
  ): Promise<void> {
    if (this.isAdmin(sender) || this.isAdmin(receiver)) {
      return;
    }

    const senderRole = sender.last_active_role;
    const senderId = sender._id.toString();
    const receiverId = receiver._id.toString();

    const isAllowed =
      senderRole === UserRole.CLIENT
        ? receiver.roles.includes(UserRole.WORKER) &&
          (await bookingRepository.hasConfirmedBookingForPair(
            senderId,
            receiverId
          ))
        : senderRole === UserRole.WORKER
          ? receiver.roles.includes(UserRole.CLIENT) &&
            (await bookingRepository.hasConfirmedBookingForPair(
              receiverId,
              senderId
            ))
          : false;

    if (!isAllowed) {
      throw new AppError(
        CHAT_MESSAGES.DIRECT_ROLE_NOT_ALLOWED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }
  }

  private async ensureConversationAllowedForActiveRole(
    user_id: string,
    conversation: IConversation
  ): Promise<void> {
    const currentUser = await userRepository.findById(user_id);

    if (!currentUser) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    if (this.isAdmin(currentUser)) {
      return;
    }

    const otherUserId = getOtherUserId(
      conversation.sender_id.toString(),
      conversation.receiver_id.toString(),
      user_id
    );
    const otherUser = await userRepository.findById(otherUserId);

    if (!otherUser) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.NOT_FOUND
      );
    }

    await this.ensureDirectChatAllowed(currentUser, otherUser);
  }

  async sendMessage(
    sender_id: string,
    input: CreateMessageInput
  ): Promise<SendMessageResponse> {
    const [sender, receiver] = await Promise.all([
      userRepository.findById(sender_id),
      userRepository.findById(input.receiver_id),
    ]);

    if (!sender || !receiver) {
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

    // Re-check block status at the moment of sending — caches/socket reconnects
    // could otherwise let a sender keep messaging a user who just blocked them.
    await moderationService.ensureChatAllowed(sender_id, input.receiver_id);
    await this.ensureDirectChatAllowed(sender, receiver);

    // Sanitize text content. Media messages keep the raw URL/content but
    // text messages must be HTML-stripped to defend against stored XSS.
    if (input.type === MessageType.TEXT) {
      const cleaned = sanitizeMessageContent(input.content ?? "");
      if (!cleaned) {
        throw new AppError(
          CHAT_MESSAGES.CANNOT_SEND_MESSAGE,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
      input = { ...input, content: cleaned };
    } else {
      // Media messages (image/video/audio/file): content is a URL. Without
      // validation a malicious client could inject `javascript:` schemes,
      // IDN homograph hosts, or oversized payloads — all of which the
      // recipient's renderer would happily resolve. Validate here so the
      // DB never holds an unsafe URL in the first place.
      if (!isValidMediaUrl(input.content)) {
        throw new AppError(
          CHAT_MESSAGES.INVALID_MEDIA_URL,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
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

    // Resolve the conversation first, then persist the message inside it.
    // The reverse order ("create message, then locate conversation") used to
    // work because the repository transparently created the conversation in
    // its createMessage path — fragile and easy to break in a refactor.
    const conversation = await chatRepository.findOrCreateConversation(
      sender_id,
      input.receiver_id
    );
    const message = await chatRepository.createMessage(
      sender_id,
      conversation._id,
      input
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
    next_cursor: string | null;
  }> {
    const { page = 1, limit = 50 } = query;

    // Require at least one filter. The repository silently returns an empty
    // page when neither is provided, but the service must not allow the
    // caller to bypass the access checks below by simply omitting both — it
    // hides a footgun for any future code that uses the result for
    // authorisation decisions.
    if (!query.receiver_id && !query.conversation_id) {
      throw new AppError(
        CHAT_MESSAGES.CONVERSATION_OR_RECEIVER_REQUIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    if (query.receiver_id) {
      const [currentUser, receiver] = await Promise.all([
        userRepository.findById(user_id),
        userRepository.findById(query.receiver_id),
      ]);

      if (!currentUser || !receiver) {
        throw new AppError(
          CHAT_MESSAGES.RECEIVER_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.NOT_FOUND
        );
      }

      await this.ensureDirectChatAllowed(currentUser, receiver);
    }

    if (query.conversation_id) {
      const conversation = await chatRepository.findConversationById(
        query.conversation_id,
        user_id
      );

      if (!conversation) {
        throw new AppError(
          CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.NOT_FOUND
        );
      }

      await this.ensureConversationAllowedForActiveRole(user_id, conversation);
    }

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
    const currentUser = await userRepository.findById(user_id);
    const allowedPeerIds =
      currentUser &&
      !this.isAdmin(currentUser) &&
      (currentUser.last_active_role === UserRole.CLIENT ||
        currentUser.last_active_role === UserRole.WORKER)
        ? new Set(
            await bookingRepository.getConfirmedChatPeerIdsForRole(
              user_id,
              currentUser.last_active_role
            )
          )
        : null;

    // Single query for all block edges (both directions) — keeps the symmetric
    // "chat block" semantics consistent with ensureChatAllowed without N×2 lookups.
    const blockMap = await moderationRepository.findBlockPairs(
      user_id,
      otherUserIds
    );

    const visibleConversations = result.conversations.filter(
      (conv: IConversation) => {
        if (!allowedPeerIds) return true;

        const otherUserId = getOtherUserId(
          conv.sender_id.toString(),
          conv.receiver_id.toString(),
          user_id
        );
        const otherUser = userMap.get(otherUserId);

        return this.isAdmin(otherUser ?? null) || allowedPeerIds.has(otherUserId);
      }
    );

    const enrichedConversations = visibleConversations.map(
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
      total: enrichedConversations.length,
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

    await this.ensureConversationAllowedForActiveRole(
      user_id,
      result.conversation
    );

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
    if (input.conversation_id) {
      const conversation = await chatRepository.findConversationById(
        input.conversation_id,
        user_id
      );

      if (!conversation) {
        throw new AppError(
          CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.NOT_FOUND
        );
      }

      await this.ensureConversationAllowedForActiveRole(user_id, conversation);
    }

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
