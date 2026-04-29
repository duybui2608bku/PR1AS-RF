import { Types } from "mongoose";
import Message from "../../models/chat/message.model";
import type {
  IMessage,
  CreateMessageInput,
  GetMessagesQuery,
} from "../../types/chat/chat.types";
import { conversationRepository } from "./conversation.repository";

export class MessageRepository {
  async createMessage(
    sender_id: string,
    input: CreateMessageInput
  ): Promise<IMessage> {
    const conversation = await conversationRepository.findOrCreateConversation(
      sender_id,
      input.receiver_id
    );

    const message = new Message({
      conversation_id: new Types.ObjectId(conversation._id),
      sender_id: new Types.ObjectId(sender_id),
      receiver_id: new Types.ObjectId(input.receiver_id),
      type: input.type,
      content: input.content,
      is_read: false,
      read_at: null,
      reply_to_id: input.reply_to_id
        ? new Types.ObjectId(input.reply_to_id)
        : null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const savedMessage = await message.save();
    const messageObj = savedMessage.toObject();

    await conversationRepository.updateConversationLastMessage(
      conversation._id,
      savedMessage._id.toString()
    );

    return {
      _id: messageObj._id.toString(),
      conversation_id: messageObj.conversation_id.toString(),
      sender_id: messageObj.sender_id.toString(),
      receiver_id: messageObj.receiver_id.toString(),
      type: messageObj.type,
      content: messageObj.content,
      is_read: messageObj.is_read,
      read_at: messageObj.read_at,
      reply_to_id: messageObj.reply_to_id?.toString() || null,
      created_at: messageObj.created_at,
      updated_at: messageObj.updated_at,
    } as IMessage;
  }

  async getMessages(
    user_id: string,
    query: GetMessagesQuery
  ): Promise<{ messages: IMessage[]; total: number }> {
    const { conversation_id, receiver_id, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (conversation_id) {
      const conversation = await conversationRepository.findConversationById(
        conversation_id,
        user_id
      );
      if (!conversation) return { messages: [], total: 0 };
      filter.conversation_id = new Types.ObjectId(conversation_id);
    } else if (receiver_id) {
      const conversation =
        await conversationRepository.findOrCreateConversation(
          user_id,
          receiver_id
        );
      if (!conversation) return { messages: [], total: 0 };
      filter.conversation_id = new Types.ObjectId(conversation._id);
    } else {
      return { messages: [], total: 0 };
    }

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate({
          path: "reply_to_id",
          select: "_id content type created_at updated_at",
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter),
    ]);

    return {
      messages: messages
        .map((msg) => ({
          _id: msg._id.toString(),
          conversation_id: msg.conversation_id.toString(),
          sender_id: msg.sender_id.toString(),
          receiver_id: msg.receiver_id.toString(),
          type: msg.type,
          content: msg.content,
          is_read: msg.is_read,
          read_at: msg.read_at,
          reply_to_id: msg.reply_to_id
            ? typeof msg.reply_to_id === "object" && "_id" in msg.reply_to_id
              ? msg.reply_to_id._id.toString()
              : (msg.reply_to_id as unknown as Types.ObjectId).toString()
            : null,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
        }))
        .reverse() as IMessage[],
      total,
    };
  }

  async getMessageById(
    message_id: string,
    user_id: string
  ): Promise<IMessage | null> {
    const message = await Message.findById(message_id).lean();
    if (!message) return null;

    if (
      message.sender_id.toString() !== user_id &&
      message.receiver_id.toString() !== user_id
    ) {
      return null;
    }

    return {
      _id: message._id.toString(),
      conversation_id: message.conversation_id.toString(),
      sender_id: message.sender_id.toString(),
      receiver_id: message.receiver_id.toString(),
      type: message.type,
      content: message.content,
      is_read: message.is_read,
      read_at: message.read_at,
      reply_to_id: message.reply_to_id?.toString() || null,
      created_at: message.created_at,
      updated_at: message.updated_at,
    } as IMessage;
  }

  async markMessagesAsRead(
    user_id: string,
    message_ids?: string[],
    conversation_id?: string
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      receiver_id: new Types.ObjectId(user_id),
      is_read: false,
    };

    if (message_ids && message_ids.length > 0) {
      filter._id = { $in: message_ids.map((id) => new Types.ObjectId(id)) };
    } else if (conversation_id) {
      filter.conversation_id = new Types.ObjectId(conversation_id);
    } else {
      return 0;
    }

    const result = await Message.updateMany(filter, {
      $set: { is_read: true, read_at: new Date() },
    });

    return result.modifiedCount;
  }
}

export const messageRepository = new MessageRepository();
