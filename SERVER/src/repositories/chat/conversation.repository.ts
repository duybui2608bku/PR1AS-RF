import { Types } from "mongoose";
import Conversation from "../../models/chat/conversation.model";
import Message from "../../models/chat/message.model";
import type { IMessage, IConversation } from "../../types/chat/chat.types";

export class ConversationRepository {
  private toDto(conversation: any): IConversation {
    return {
      _id: conversation._id.toString(),
      sender_id: conversation.sender_id.toString(),
      receiver_id: conversation.receiver_id.toString(),
      last_message: conversation.last_message?.toString() || null,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    } as IConversation;
  }

  async findOrCreateConversation(
    sender_id: string,
    receiver_id: string
  ): Promise<IConversation> {
    const existing = await Conversation.findOne({
      $or: [
        { sender_id, receiver_id },
        { sender_id: receiver_id, receiver_id: sender_id },
      ],
    }).lean();

    if (existing) {
      return this.toDto(existing);
    }

    try {
      const newConversation = new Conversation({
        sender_id: new Types.ObjectId(sender_id),
        receiver_id: new Types.ObjectId(receiver_id),
        last_message: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await newConversation.save();
      return this.toDto(newConversation.toObject());
    } catch (err: any) {
      // Handle duplicate key race condition
      if (err.code === 11000) {
        const retry = await Conversation.findOne({
          $or: [
            { sender_id, receiver_id },
            { sender_id: receiver_id, receiver_id: sender_id },
          ],
        }).lean();
        if (retry) return this.toDto(retry);
      }
      throw err;
    }
  }

  async findConversationById(
    conversation_id: string,
    user_id: string
  ): Promise<IConversation | null> {
    const conversation = await Conversation.findOne({
      _id: conversation_id,
      $or: [{ sender_id: user_id }, { receiver_id: user_id }],
    }).lean();
    return conversation as IConversation | null;
  }

  async getUserConversations(
    user_id: string,
    query: { page?: number; limit?: number }
  ): Promise<{ conversations: IConversation[]; total: number }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const filter = {
      $or: [{ sender_id: user_id }, { receiver_id: user_id }],
    };

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    return {
      conversations: conversations.map((conv) => this.toDto(conv)),
      total,
    };
  }

  async updateConversationLastMessage(
    conversation_id: string,
    message_id: string
  ): Promise<IConversation | null> {
    return Conversation.findByIdAndUpdate(
      conversation_id,
      {
        last_message: new Types.ObjectId(message_id),
        updated_at: new Date(),
      },
      { new: true }
    ).lean() as Promise<IConversation | null>;
  }

  async getConversationWithDetails(
    conversation_id: string,
    user_id: string
  ): Promise<{
    conversation: IConversation;
    last_message?: IMessage;
    unread_count: number;
  } | null> {
    const conversation = await Conversation.findOne({
      _id: conversation_id,
      $or: [{ sender_id: user_id }, { receiver_id: user_id }],
    }).lean();

    if (!conversation) {
      return null;
    }

    const [last_message, unread_count] = await Promise.all([
      conversation.last_message
        ? Message.findById(conversation.last_message)
            .lean()
            .then((msg) => {
              if (!msg) return undefined;
              return {
                _id: msg._id.toString(),
                conversation_id: msg.conversation_id.toString(),
                sender_id: msg.sender_id.toString(),
                receiver_id: msg.receiver_id.toString(),
                type: msg.type,
                content: msg.content,
                is_read: msg.is_read,
                read_at: msg.read_at,
                reply_to_id: msg.reply_to_id?.toString() || null,
                created_at: msg.created_at,
                updated_at: msg.updated_at,
              } as IMessage;
            })
        : undefined,
      this.getUnreadCount(user_id, conversation_id),
    ]);

    return {
      conversation: this.toDto(conversation),
      last_message,
      unread_count,
    };
  }

  async getUnreadCount(
    user_id: string,
    conversation_id?: string
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      receiver_id: new Types.ObjectId(user_id),
      is_read: false,
    };
    if (conversation_id) {
      filter.conversation_id = new Types.ObjectId(conversation_id);
    }
    return Message.countDocuments(filter);
  }

  async getConversationUnreadCounts(
    conversationIds: string[],
    user_id: string
  ): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map();

    const results = await Message.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          conversation_id: {
            $in: conversationIds.map((id) => new Types.ObjectId(id)),
          },
          receiver_id: new Types.ObjectId(user_id),
          is_read: false,
          is_deleted: false,
        },
      },
      {
        $group: {
          _id: "$conversation_id",
          count: { $sum: 1 },
        },
      },
    ]);

    return new Map(results.map((r) => [r._id.toString(), r.count]));
  }
}

export const conversationRepository = new ConversationRepository();
