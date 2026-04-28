import { model, Schema } from "mongoose";
import { modelsName } from "../models.name";
import { MessageType } from "../../types/chat/message.type";

const readBySchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
    },
    read_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageGroupSchema = new Schema({
  conversation_group_id: {
    type: Schema.Types.ObjectId,
    ref: modelsName.CONVERSATION_GROUP,
    required: true,
  },
  sender_id: {
    type: Schema.Types.ObjectId,
    ref: modelsName.USER,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(MessageType),
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  read_by: {
    type: [readBySchema],
    default: [],
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  reply_to_id: {
    type: Schema.Types.ObjectId,
    ref: modelsName.MESSAGE_GROUP,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

messageGroupSchema.index({ conversation_group_id: 1, created_at: -1 });
messageGroupSchema.index({ sender_id: 1 });
messageGroupSchema.index({ reply_to_id: 1 });

const MessageGroup = model(modelsName.MESSAGE_GROUP, messageGroupSchema);

export default MessageGroup;
