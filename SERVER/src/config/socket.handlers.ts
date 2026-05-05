import { ExtendedError, Socket } from "socket.io";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { logger } from "../utils/logger";
import { chatRepository, groupChatRepository } from "../repositories/chat";
import { getSocketIO } from "./socket";
import { AUTH_MESSAGES, CHAT_MESSAGES } from "../constants/messages";
import { SOCKET_EVENTS } from "../constants/socket";
import {
  getConversationRoom,
  getGroupConversationRoom,
  getUserRoom,
} from "../utils/chat.helper";

const userSockets = new Map<string, Set<string>>();

export const authenticateSocket = (
  socket: Socket,
  next: (err?: ExtendedError) => void
): void => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      logger.error(`No token provided for socket ${socket.id}`);
      return next(new Error(AUTH_MESSAGES.TOKEN_NOT_PROVIDED));
    }

    const decoded = verifyToken(token);
    socket.data.user = decoded;
    next();
  } catch (error) {
    logger.error(`Socket authentication error for ${socket.id}:`, error);
    next(new Error(AUTH_MESSAGES.TOKEN_INVALID));
  }
};

export const registerUserSocket = (userId: string, socketId: string): void => {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socketId);
  logger.info(`User ${userId} connected with socket ${socketId}`);
};

export const unregisterUserSocket = (
  userId: string,
  socketId: string
): void => {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
  }
  logger.info(`User ${userId} disconnected socket ${socketId}`);
};

export const isUserOnline = (userId: string): boolean => {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
};

export const getUserSocketIds = (userId: string): string[] => {
  const sockets = userSockets.get(userId);
  return sockets ? Array.from(sockets) : [];
};

const verifyConversationAccess = async (
  conversationId: string,
  userId: string
): Promise<boolean> => {
  const conversation = await chatRepository.findConversationById(
    conversationId,
    userId
  );
  return !!conversation;
};

const verifyGroupConversationAccess = async (
  conversationGroupId: string,
  userId: string
): Promise<boolean> => {
  const conversation =
    await groupChatRepository.getConversationGroupForUserById(
      conversationGroupId,
      userId
    );
  return !!conversation;
};

export const setupChatHandlers = (socket: Socket): void => {
  const user = socket.data.user as JWTPayload;
  const userId = user.sub;

  registerUserSocket(userId, socket.id);
  socket.join(getUserRoom(userId));
  socket.emit("connected", { user_id: userId });

  socket.on("join_conversation", async (data: { conversation_id: string }) => {
    try {
      const { conversation_id } = data;
      const hasAccess = await verifyConversationAccess(conversation_id, userId);

      if (!hasAccess) {
        socket.emit("error", {
          message: CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
        });
        return;
      }

      const room = getConversationRoom(conversation_id);
      socket.join(room);
      socket.emit("conversation_joined", { conversation_id });
    } catch (error) {
      logger.error(`Error joining conversation for user ${userId}:`, error);
      socket.emit("error", {
        message: CHAT_MESSAGES.FAILED_JOIN_CONVERSATION,
      });
    }
  });

  socket.on("leave_conversation", (data: { conversation_id: string }) => {
    const { conversation_id } = data;
    socket.leave(getConversationRoom(conversation_id));
    logger.info(`User ${userId} left conversation ${conversation_id}`);
    socket.emit("conversation_left", { conversation_id });
  });

  socket.on(
    "typing",
    async (data: { conversation_id: string; is_typing: boolean }) => {
      try {
        const { conversation_id, is_typing } = data;
        const hasAccess = await verifyConversationAccess(
          conversation_id,
          userId
        );

        if (!hasAccess) {
          return;
        }

        socket.to(getConversationRoom(conversation_id)).emit("user_typing", {
          conversation_id,
          user_id: userId,
          is_typing,
        });
      } catch (error) {
        logger.error("Error handling typing indicator:", error);
      }
    }
  );

  socket.on(
    "mark_read",
    async (data: { message_ids?: string[]; conversation_id?: string }) => {
      try {
        const { message_ids, conversation_id } = data;
        const updatedCount = await chatRepository.markMessagesAsRead(
          userId,
          message_ids,
          conversation_id
        );

        if (updatedCount > 0 && conversation_id) {
          const io = getSocketIO();
          const payload = {
            conversation_id,
            read_by: userId,
            read_at: new Date(),
          };
          io.to(getConversationRoom(conversation_id)).emit(
            SOCKET_EVENTS.MESSAGE_READ,
            payload
          );
          io.to(getConversationRoom(conversation_id)).emit(
            "messages_read",
            payload
          );
        }

        socket.emit("read_confirmed", {
          updated_count: updatedCount,
        });
      } catch (error) {
        logger.error("Error marking messages as read:", error);
        socket.emit("error", {
          message: CHAT_MESSAGES.FAILED_MARK_READ,
        });
      }
    }
  );

  socket.on(
    "join_group_conversation",
    async (data: { conversation_group_id: string }) => {
      try {
        const { conversation_group_id } = data;
        const hasAccess = await verifyGroupConversationAccess(
          conversation_group_id,
          userId
        );

        if (!hasAccess) {
          socket.emit("error", {
            message: CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
          });
          return;
        }

        socket.join(getGroupConversationRoom(conversation_group_id));
        socket.emit("group_conversation_joined", { conversation_group_id });
      } catch (error) {
        logger.error(
          `Error joining group conversation for user ${userId}:`,
          error
        );
        socket.emit("error", {
          message: CHAT_MESSAGES.FAILED_JOIN_CONVERSATION,
        });
      }
    }
  );

  socket.on(
    "leave_group_conversation",
    (data: { conversation_group_id: string }) => {
      const { conversation_group_id } = data;
      socket.leave(getGroupConversationRoom(conversation_group_id));
      logger.info(
        `User ${userId} left group conversation ${conversation_group_id}`
      );
      socket.emit("group_conversation_left", { conversation_group_id });
    }
  );

  socket.on(
    "group_typing",
    async (data: { conversation_group_id: string; is_typing: boolean }) => {
      try {
        const { conversation_group_id, is_typing } = data;
        const hasAccess = await verifyGroupConversationAccess(
          conversation_group_id,
          userId
        );

        if (!hasAccess) {
          return;
        }

        socket
          .to(getGroupConversationRoom(conversation_group_id))
          .emit("group_user_typing", {
            conversation_group_id,
            user_id: userId,
            is_typing,
          });
      } catch (error) {
        logger.error("Error handling group typing indicator:", error);
      }
    }
  );

  socket.on(
    "mark_group_read",
    async (data: {
      message_ids?: string[];
      conversation_group_id?: string;
    }) => {
      try {
        const { message_ids } = data;
        let { conversation_group_id } = data;

        if (!conversation_group_id && message_ids && message_ids.length > 0) {
          const message = await groupChatRepository.getMessageGroupByIdForUser(
            message_ids[0],
            userId
          );
          conversation_group_id = message?.conversation_group_id;
        }

        if (!conversation_group_id) {
          socket.emit("error", {
            message: CHAT_MESSAGES.FAILED_MARK_READ,
          });
          return;
        }

        const hasAccess = await verifyGroupConversationAccess(
          conversation_group_id,
          userId
        );

        if (!hasAccess) {
          socket.emit("error", {
            message: CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
          });
          return;
        }

        const updatedCount = await groupChatRepository.markGroupMessagesAsRead(
          userId,
          conversation_group_id,
          message_ids
        );

        if (updatedCount > 0) {
          const io = getSocketIO();
          const payload = {
            conversation_group_id,
            read_by: userId,
            read_at: new Date(),
          };
          io.to(getGroupConversationRoom(conversation_group_id)).emit(
            SOCKET_EVENTS.MESSAGE_READ,
            payload
          );
          io.to(getGroupConversationRoom(conversation_group_id)).emit(
            "group_messages_read",
            payload
          );
        }

        socket.emit("group_read_confirmed", {
          updated_count: updatedCount,
        });
      } catch (error) {
        logger.error("Error marking group messages as read:", error);
        socket.emit("error", {
          message: CHAT_MESSAGES.FAILED_MARK_READ,
        });
      }
    }
  );

  socket.on("disconnect", () => {
    unregisterUserSocket(userId, socket.id);
    logger.info(`User ${userId} disconnected`);
  });
};
