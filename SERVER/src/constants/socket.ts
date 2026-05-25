export const SOCKET_EVENTS = {
  NEW_MESSAGE: "new_message",
  NEW_CONVERSATION: "new_conversation",
  CONVERSATION_UPDATED: "conversation_updated",
  CONVERSATION_DELETED: "conversation_deleted",
  MESSAGE_DELETED: "message_deleted",
  MESSAGE_READ: "message_read",
  MESSAGE_UPDATED: "message_updated",
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",
  NOTIFICATION_UNREAD_COUNT: "notification:unread_count",
  ACCOUNT_BANNED: "account:banned",
  TOKEN_REFRESH_REQUIRED: "auth:token_refresh_required",
  TOKEN_REFRESH: "auth:token_refresh",
  TOKEN_REFRESHED: "auth:token_refreshed",
} as const;

