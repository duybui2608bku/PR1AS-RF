import { MessageType } from "./message.type";

export interface IMessage {
  _id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  type: MessageType;
  content: string;
  is_read: boolean;
  read_at: Date | null;
  reply_to_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IConversation {
  _id: string;
  sender_id: string;
  receiver_id: string;
  last_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageInput {
  receiver_id: string;
  type: MessageType;
  content: string;
  reply_to_id?: string | null;
}

export interface SendMessageResponse {
  message: IMessage;
  conversation: IConversation;
}

export interface GetMessagesQuery {
  conversation_id?: string;
  receiver_id?: string;
  page?: number;
  limit?: number;
}

export interface GetConversationsQuery {
  page?: number;
  limit?: number;
}

export interface ConversationWithLastMessage extends IConversation {
  last_message_data?: IMessage;
  other_user?: {
    _id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
  };
  unread_count?: number;
}

export interface MarkAsReadInput {
  message_ids?: string[];
  conversation_id?: string;
}
