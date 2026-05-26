import { ExtendedError, Socket } from "socket.io";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { logger } from "../utils/logger";
import { chatRepository, groupChatRepository } from "../repositories/chat";
import { userRepository } from "../repositories/auth/user.repository";
import { bookingRepository } from "../repositories/booking/booking.repository";
import { getSocketIO } from "./socket";
import { AUTH_MESSAGES, CHAT_MESSAGES } from "../constants/messages";
import { SOCKET_EVENTS } from "../constants/socket";
import {
  getOtherUserId,
  getConversationRoom,
  getGroupConversationRoom,
  getUserRoom,
} from "../utils/chat.helper";
import { UserRole, UserStatus } from "../types/auth/user.types";
import { TTLCache } from "../utils/ttlCache";
import { getFreshUserStatus } from "../utils/userStatusCache";

const userSockets = new Map<string, Set<string>>();

// 60s TTL is short enough that revoked access (booking cancelled, user
// blocked) becomes visible quickly, but long enough to absorb the typing
// burst (5–10 events/sec) that previously hit Mongo on every keystroke.
const ACCESS_CACHE_TTL_MS = 60_000;
const ACCESS_CACHE_MAX = 10_000;
const accessCache = new TTLCache<string, boolean>(
  ACCESS_CACHE_MAX,
  ACCESS_CACHE_TTL_MS
);
const groupAccessCache = new TTLCache<string, boolean>(
  ACCESS_CACHE_MAX,
  ACCESS_CACHE_TTL_MS
);

// Grace window after the access token expires during which the socket stays
// open and we ask the client to send a fresh token. If the client doesn't
// respond within the window we disconnect — but the user gets a chance to
// silently refresh instead of dropping a live chat.
const TOKEN_REFRESH_GRACE_MS = 30_000;

const accessKey = (conversationId: string, userId: string) =>
  `${conversationId}|${userId}`;

export const authenticateSocket = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
): Promise<void> => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      logger.error(`No token provided for socket ${socket.id}`);
      return next(new Error(AUTH_MESSAGES.TOKEN_NOT_PROVIDED));
    }

    const decoded = verifyToken(token);
    // The token's status field is a snapshot from login time. Re-check the
    // DB so a user banned or self-deleted after issuing the JWT cannot open
    // a new socket.
    const freshStatus = await getFreshUserStatus(decoded.sub);
    if (!freshStatus || freshStatus !== UserStatus.ACTIVE) {
      const reason =
        freshStatus === UserStatus.BANNED
          ? AUTH_MESSAGES.USER_BANNED
          : freshStatus === UserStatus.PENDING_DELETE
            ? AUTH_MESSAGES.USER_PENDING_DELETE
            : AUTH_MESSAGES.USER_DELETED;
      logger.warn(
        `Rejecting non-active user ${decoded.sub} on socket ${socket.id} (${freshStatus ?? "missing"})`
      );
      return next(new Error(reason));
    }
    socket.data.user = { ...decoded, status: freshStatus };
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

/**
 * Cache invalidation hook for upstream services. Call when an event would
 * change access semantics — booking confirmed / cancelled, user blocked /
 * unblocked, role flipped. Cheap no-op if the entry isn't cached.
 */
export const invalidateConversationAccessCache = (
  conversationId: string,
  userIds: string[]
): void => {
  for (const userId of userIds) {
    accessCache.delete(accessKey(conversationId, userId));
  }
};

export const invalidateGroupConversationAccessCache = (
  conversationGroupId: string,
  userIds: string[]
): void => {
  for (const userId of userIds) {
    groupAccessCache.delete(accessKey(conversationGroupId, userId));
  }
};

const verifyConversationAccessUncached = async (
  conversationId: string,
  userId: string
): Promise<boolean> => {
  const conversation = await chatRepository.findConversationById(
    conversationId,
    userId
  );
  if (!conversation) return false;

  // Defence-in-depth: a self-conversation should never exist (service rejects
  // it on send) but if one slips into the DB via migration or future code we
  // still refuse to honour socket events against it.
  if (conversation.sender_id.toString() === conversation.receiver_id.toString()) {
    return false;
  }

  const currentUser = await userRepository.findById(userId);
  if (!currentUser) return false;
  if (currentUser.roles?.includes(UserRole.ADMIN)) return true;

  const otherUserId = getOtherUserId(
    conversation.sender_id.toString(),
    conversation.receiver_id.toString(),
    userId
  );

  // Explicit self-check on the participants — paranoia, but cheap.
  if (otherUserId === userId) return false;

  const otherUser = await userRepository.findById(otherUserId);
  if (!otherUser) return false;
  if (otherUser.roles?.includes(UserRole.ADMIN)) return true;

  if (currentUser.last_active_role === UserRole.CLIENT) {
    return (
      otherUser.roles.includes(UserRole.WORKER) &&
      (await bookingRepository.hasConfirmedBookingForPair(userId, otherUserId))
    );
  }

  if (currentUser.last_active_role === UserRole.WORKER) {
    return (
      otherUser.roles.includes(UserRole.CLIENT) &&
      (await bookingRepository.hasConfirmedBookingForPair(otherUserId, userId))
    );
  }

  return false;
};

const verifyConversationAccess = async (
  conversationId: string,
  userId: string
): Promise<boolean> => {
  const key = accessKey(conversationId, userId);
  const cached = accessCache.get(key);
  if (cached !== undefined) return cached;
  const allowed = await verifyConversationAccessUncached(conversationId, userId);
  accessCache.set(key, allowed);
  return allowed;
};

const verifyGroupConversationAccess = async (
  conversationGroupId: string,
  userId: string
): Promise<boolean> => {
  const key = accessKey(conversationGroupId, userId);
  const cached = groupAccessCache.get(key);
  if (cached !== undefined) return cached;
  const conversation =
    await groupChatRepository.getConversationGroupForUserById(
      conversationGroupId,
      userId
    );
  const allowed = !!conversation;
  groupAccessCache.set(key, allowed);
  return allowed;
};

export const setupChatHandlers = (socket: Socket): void => {
  const user = socket.data.user as JWTPayload;
  const userId = user.sub;

  registerUserSocket(userId, socket.id);
  socket.join(getUserRoom(userId));
  socket.emit("connected", { user_id: userId });

  // Token-refresh state. When the JWT expires mid-session we don't hard
  // disconnect — we ask the client to send a refreshed access token via the
  // `TOKEN_REFRESH` event and only disconnect if the client fails to do so
  // within `TOKEN_REFRESH_GRACE_MS`. This avoids dropping live chats at the
  // 15-minute access-token boundary.
  let refreshTimer: NodeJS.Timeout | null = null;
  let refreshRequested = false;

  const clearRefreshTimer = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  const requestTokenRefresh = () => {
    if (refreshRequested) return;
    refreshRequested = true;
    socket.emit(SOCKET_EVENTS.TOKEN_REFRESH_REQUIRED, {
      message: AUTH_MESSAGES.TOKEN_EXPIRED,
      grace_ms: TOKEN_REFRESH_GRACE_MS,
    });
    refreshTimer = setTimeout(() => {
      socket.emit("error", { message: AUTH_MESSAGES.TOKEN_EXPIRED });
      socket.disconnect(true);
    }, TOKEN_REFRESH_GRACE_MS);
  };

  socket.use((packet, next) => {
    const currentUser = socket.data.user as JWTPayload | undefined;
    if (!currentUser || typeof currentUser.exp !== "number") {
      socket.emit("error", { message: AUTH_MESSAGES.TOKEN_INVALID });
      socket.disconnect(true);
      return next(new Error(AUTH_MESSAGES.TOKEN_INVALID));
    }

    const isExpired = Date.now() >= currentUser.exp * 1000;
    // Always allow the refresh packet through so the client can recover
    // even after the original token expired.
    const eventName = packet[0];
    if (eventName === SOCKET_EVENTS.TOKEN_REFRESH) {
      return next();
    }
    if (isExpired) {
      requestTokenRefresh();
      // Drop this packet without disconnecting — the client will retry once
      // it has refreshed. Returning an Error here is what skips the handler.
      return next(new Error(AUTH_MESSAGES.TOKEN_EXPIRED));
    }
    return next();
  });

  socket.on(
    SOCKET_EVENTS.TOKEN_REFRESH,
    (data: { token?: string } | undefined) => {
      const token = data?.token;
      if (typeof token !== "string" || token.length === 0) {
        socket.emit("error", { message: AUTH_MESSAGES.TOKEN_NOT_PROVIDED });
        return;
      }
      try {
        const decoded = verifyToken(token);
        // Refusing to accept a token for a different account stops a hijack
        // attempt (e.g. an attacker who stole someone else's access token
        // can't piggy-back on this socket session to act as them).
        if (decoded.sub !== userId) {
          socket.emit("error", { message: AUTH_MESSAGES.TOKEN_INVALID });
          socket.disconnect(true);
          return;
        }
        socket.data.user = decoded;
        clearRefreshTimer();
        refreshRequested = false;
        socket.emit(SOCKET_EVENTS.TOKEN_REFRESHED, { exp: decoded.exp });
      } catch (error) {
        logger.warn(`Token refresh failed for user ${userId}:`, error);
        socket.emit("error", { message: AUTH_MESSAGES.TOKEN_INVALID });
        socket.disconnect(true);
      }
    }
  );

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
        let verifiedConversationId = conversation_id;

        if (!verifiedConversationId && message_ids && message_ids.length > 0) {
          const [message] = await chatRepository.getMessagesByIds([
            message_ids[0],
          ]);
          verifiedConversationId = message?.conversation_id;
        }

        if (
          verifiedConversationId &&
          !(await verifyConversationAccess(verifiedConversationId, userId))
        ) {
          socket.emit("error", {
            message: CHAT_MESSAGES.CONVERSATION_NOT_FOUND,
          });
          return;
        }

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
          // Emit a single canonical event to avoid double-handling on the
          // client. Listeners should subscribe to SOCKET_EVENTS.MESSAGE_READ.
          io.to(getConversationRoom(conversation_id)).emit(
            SOCKET_EVENTS.MESSAGE_READ,
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
    clearRefreshTimer();
    unregisterUserSocket(userId, socket.id);
    logger.info(`User ${userId} disconnected`);
  });
};
