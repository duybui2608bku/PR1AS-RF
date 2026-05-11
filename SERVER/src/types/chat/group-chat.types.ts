import { MessageType } from "./message.type";
import { BookingStatus } from "../../constants/booking";
import { PricingUnit } from "../worker/worker-service";
import { UserRole } from "../auth/user.types";

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

export interface GroupChatMember {
  _id: string;
  full_name: string | null;
  avatar: string | null;
  email: string;
  roles: UserRole[];
}

export interface GroupChatBooking {
  _id: string;
  service_code: string;
  status: BookingStatus;
  schedule: {
    start_time: Date;
    end_time: Date;
    duration_hours: number;
  };
  pricing: {
    unit: PricingUnit;
    quantity: number;
  };
  client_id: string;
  worker_id: string;
  client?: GroupChatMember;
  worker?: GroupChatMember;
  dispute?: {
    reason: string;
    description: string;
    evidence_urls: string[];
    disputed_by: string;
    disputed_at: Date;
    resolution: string | null;
    resolution_notes: string;
    resolved_by: string | null;
    resolved_at: Date | null;
  } | null;
  disputed_at: Date | null;
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
  members_data?: GroupChatMember[];
  booking_data?: GroupChatBooking;
}

export interface MarkGroupMessagesReadInput {
  message_ids?: string[];
  conversation_group_id?: string;
}
