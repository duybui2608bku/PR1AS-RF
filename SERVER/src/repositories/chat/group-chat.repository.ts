import { Types } from "mongoose";
import ConversationGroup from "../../models/chat/conversationsGroup";
import MessageGroup from "../../models/chat/messageGroup";
import { Booking } from "../../models/booking/booking.model";
import type {
  IConversationGroup,
  IMessageGroup,
  GetGroupMessagesQuery,
  GetGroupConversationsQuery,
} from "../../types/chat/group-chat.types";

export class GroupChatRepository {
  private mapConversationGroup(conversation: any): IConversationGroup {
    return {
      _id: conversation._id.toString(),
      booking_id: conversation.booking_id.toString(),
      name: conversation.name,
      members: conversation.members.map((member: Types.ObjectId) =>
        member.toString()
      ),
      last_message: conversation.last_message
        ? conversation.last_message.toString()
        : null,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    };
  }

  private mapMessageGroup(message: any): IMessageGroup {
    return {
      _id: message._id.toString(),
      conversation_group_id: message.conversation_group_id.toString(),
      sender_id: message.sender_id.toString(),
      type: message.type,
      content: message.content,
      read_by: (message.read_by || []).map(
        (item: { user_id: Types.ObjectId; read_at: Date }) => ({
          user_id: item.user_id.toString(),
          read_at: item.read_at,
        })
      ),
      is_deleted: message.is_deleted,
      reply_to_id: message.reply_to_id ? message.reply_to_id.toString() : null,
      created_at: message.created_at,
      updated_at: message.updated_at,
    };
  }

  async findOrCreateConversationGroupByBooking(
    booking_id: string
  ): Promise<IConversationGroup | null> {
    const existing = await ConversationGroup.findOne({
      booking_id: new Types.ObjectId(booking_id),
    }).lean();

    if (existing) {
      return this.mapConversationGroup(existing);
    }

    const booking = await Booking.findById(booking_id)
      .select("client_id worker_id service_code")
      .lean();

    if (!booking) {
      return null;
    }

    const conversation = new ConversationGroup({
      booking_id: new Types.ObjectId(booking_id),
      name: booking.service_code,
      members: [booking.client_id, booking.worker_id],
      last_message: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await conversation.save();
    return this.mapConversationGroup(saved.toObject());
  }

  async findOrCreateComplaintConversationGroup(
    booking_id: string,
    admin_id: string
  ): Promise<IConversationGroup | null> {
    const booking = await Booking.findById(booking_id)
      .select("client_id worker_id service_code")
      .lean();

    if (!booking) {
      return null;
    }

    const existing = await ConversationGroup.findOne({
      booking_id: new Types.ObjectId(booking_id),
    }).lean();

    if (existing) {
      const requiredMembers = [
        new Types.ObjectId(booking.client_id),
        new Types.ObjectId(booking.worker_id),
        new Types.ObjectId(admin_id),
      ];
      const updated = await ConversationGroup.findByIdAndUpdate(
        existing._id,
        {
          $addToSet: { members: { $each: requiredMembers } },
          $set: {
            name: `Complaint - ${booking.service_code}`,
            updated_at: new Date(),
          },
        },
        { new: true }
      ).lean();

      return this.mapConversationGroup(updated ?? existing);
    }

    const conversation = new ConversationGroup({
      booking_id: new Types.ObjectId(booking_id),
      name: `Complaint - ${booking.service_code}`,
      members: [
        booking.client_id,
        booking.worker_id,
        new Types.ObjectId(admin_id),
      ],
      last_message: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await conversation.save();
    return this.mapConversationGroup(saved.toObject());
  }

  async getConversationGroupForUserById(
    conversation_group_id: string,
    user_id: string
  ): Promise<IConversationGroup | null> {
    const conversation = await ConversationGroup.findOne({
      _id: new Types.ObjectId(conversation_group_id),
      members: new Types.ObjectId(user_id),
    }).lean();

    if (!conversation) {
      return null;
    }

    return this.mapConversationGroup(conversation);
  }

  async getConversationGroupForUserByBooking(
    booking_id: string,
    user_id: string
  ): Promise<IConversationGroup | null> {
    const conversation = await ConversationGroup.findOne({
      booking_id: new Types.ObjectId(booking_id),
      members: new Types.ObjectId(user_id),
    }).lean();

    if (!conversation) {
      return null;
    }

    return this.mapConversationGroup(conversation);
  }

  async getUserConversationGroups(
    user_id: string,
    query: GetGroupConversationsQuery
  ): Promise<{ conversations: IConversationGroup[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = {
      members: new Types.ObjectId(user_id),
    };

    const [conversations, total] = await Promise.all([
      ConversationGroup.find(filter)
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ConversationGroup.countDocuments(filter),
    ]);

    return {
      conversations: conversations.map((conv) =>
        this.mapConversationGroup(conv)
      ),
      total,
    };
  }

  async updateConversationGroupLastMessage(
    conversation_group_id: string,
    message_id: string
  ): Promise<IConversationGroup | null> {
    const updated = await ConversationGroup.findByIdAndUpdate(
      conversation_group_id,
      {
        last_message: new Types.ObjectId(message_id),
        updated_at: new Date(),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return null;
    }

    return this.mapConversationGroup(updated);
  }

  async createGroupMessage(
    sender_id: string,
    conversation_group_id: string,
    type: IMessageGroup["type"],
    content: string,
    reply_to_id?: string | null
  ): Promise<IMessageGroup> {
    const message = new MessageGroup({
      conversation_group_id: new Types.ObjectId(conversation_group_id),
      sender_id: new Types.ObjectId(sender_id),
      type,
      content,
      read_by: [
        {
          user_id: new Types.ObjectId(sender_id),
          read_at: new Date(),
        },
      ],
      is_deleted: false,
      reply_to_id: reply_to_id ? new Types.ObjectId(reply_to_id) : null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await message.save();
    const messageObj = saved.toObject();

    await this.updateConversationGroupLastMessage(
      conversation_group_id,
      saved._id.toString()
    );

    return this.mapMessageGroup(messageObj);
  }

  async getGroupMessages(
    conversation_group_id: string,
    query: GetGroupMessagesQuery
  ): Promise<{ messages: IMessageGroup[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter = {
      conversation_group_id: new Types.ObjectId(conversation_group_id),
      is_deleted: false,
    };

    const [messages, total] = await Promise.all([
      MessageGroup.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MessageGroup.countDocuments(filter),
    ]);

    return {
      messages: messages.map((msg) => this.mapMessageGroup(msg)).reverse(),
      total,
    };
  }

  async getMessageGroupByIdForUser(
    message_id: string,
    user_id: string
  ): Promise<IMessageGroup | null> {
    const message = await MessageGroup.findById(message_id).lean();

    if (!message) {
      return null;
    }

    const conversation = await ConversationGroup.findOne({
      _id: message.conversation_group_id,
      members: new Types.ObjectId(user_id),
    }).lean();

    if (!conversation) {
      return null;
    }

    return this.mapMessageGroup(message);
  }

  async markGroupMessagesAsRead(
    user_id: string,
    conversation_group_id?: string,
    message_ids?: string[]
  ): Promise<number> {
    if (!conversation_group_id && (!message_ids || message_ids.length === 0)) {
      return 0;
    }

    const filter: Record<string, unknown> = {
      is_deleted: false,
    };

    if (conversation_group_id) {
      filter.conversation_group_id = new Types.ObjectId(conversation_group_id);
    }

    if (message_ids && message_ids.length > 0) {
      filter._id = {
        $in: message_ids.map((id) => new Types.ObjectId(id)),
      };
    }

    const result = await MessageGroup.updateMany(filter, {
      $addToSet: {
        read_by: {
          user_id: new Types.ObjectId(user_id),
          read_at: new Date(),
        },
      },
    });

    return result.modifiedCount;
  }

  async getGroupUnreadCount(
    user_id: string,
    conversation_group_id?: string
  ): Promise<number> {
    const memberFilter = {
      members: new Types.ObjectId(user_id),
    };

    const conversationFilter: Record<string, unknown> = {};

    if (conversation_group_id) {
      conversationFilter._id = new Types.ObjectId(conversation_group_id);
    }

    const conversations = await ConversationGroup.find({
      ...memberFilter,
      ...conversationFilter,
    })
      .select("_id")
      .lean();

    if (conversations.length === 0) {
      return 0;
    }

    const conversationIds = conversations.map(
      (conv) => conv._id as Types.ObjectId
    );

    return MessageGroup.countDocuments({
      conversation_group_id: { $in: conversationIds },
      is_deleted: false,
      "read_by.user_id": { $ne: new Types.ObjectId(user_id) },
    });
  }
}

export const groupChatRepository = new GroupChatRepository();
