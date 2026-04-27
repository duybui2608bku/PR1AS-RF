export { getSocket, disconnectSocket, reconnectSocket } from "./config";
export { ChatSocket, chatSocket } from "./chat";
export type {
  JoinConversationData,
  LeaveConversationData,
  TypingData,
  MarkReadData,
  NewMessageData,
  UserTypingData,
  ConversationJoinedData,
  ConversationLeftData,
  ReadConfirmedData,
  SocketErrorData,
} from "./chat";
export type {
  RealtimeNotificationPayload,
  RealtimeUnreadCountPayload,
} from "../types/notification";

