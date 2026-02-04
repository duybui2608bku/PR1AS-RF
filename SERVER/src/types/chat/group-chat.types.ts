import { MessageType } from "./message.type";

export interface IMessageGroupReadBy {
  user_id: string;
  read_at: Date;
}

export interface IMessageGroup {
  _id: string;
  conversation_group_id: string;
  sender_id: string;
  type: MessageType;
  content: string;
  read_by: IMessageGroupReadBy[];
  is_deleted: boolean;
  reply_to_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IConversationGroup {
  _id: string;
  booking_id: string;
  name: string;
  members: string[];
  last_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateGroupMessageInput {
  booking_id: string;
  type: MessageType;
  content: string;
  reply_to_id?: string | null;
}

export interface SendGroupMessageResponse {
  message: IMessageGroup;
  conversation: IConversationGroup;
}

export interface GetGroupMessagesQuery {
  booking_id?: string;
  conversation_group_id?: string;
  page?: number;
  limit?: number;
}

export interface GetGroupConversationsQuery {
  page?: number;
  limit?: number;
}

export interface GroupConversationWithLastMessage extends IConversationGroup {
  last_message_data?: IMessageGroup;
  unread_count?: number;
}

export interface MarkGroupMessagesReadInput {
  message_ids?: string[];
  conversation_group_id?: string;
}
