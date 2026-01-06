import type { IUserDocument } from "../types/auth/user.types";

export const getOtherUserId = (
  senderId: string,
  receiverId: string,
  currentUserId: string
): string => {
  return senderId === currentUserId ? receiverId : senderId;
};

export const formatOtherUser = (user: IUserDocument | null) => {
  if (!user) return undefined;
  return {
    _id: user._id.toString(),
    full_name: user.full_name || null,
    avatar: user.avatar || null,
    email: user.email,
  };
};

export const getUserRoom = (userId: string): string => {
  return `user:${userId}`;
};

export const getConversationRoom = (conversationId: string): string => {
  return `conversation:${conversationId}`;
};
