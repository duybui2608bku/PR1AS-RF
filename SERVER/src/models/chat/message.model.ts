import { model, Schema } from "mongoose";
import { modelsName } from "../models.name";
import { MessageType } from "../../types/chat/message.type";

const messageSchema = new Schema({
  conversation_id: {
    type: Schema.Types.ObjectId,
    ref: modelsName.CONVERSATION,
    required: true,
  },
  sender_id: {
    type: Schema.Types.ObjectId,
    ref: modelsName.USER,
    required: true,
  },
  receiver_id: {
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
  is_read: {
    type: Boolean,
    default: false,
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  read_at: {
    type: Date,
    default: null,
  },
  reply_to_id: {
    type: Schema.Types.ObjectId,
    ref: modelsName.MESSAGE,
    default: null,
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

messageSchema.index({ conversation_id: 1, created_at: -1 });
messageSchema.index({ receiver_id: 1, is_read: 1, read_at:1 });

const Message = model(modelsName.MESSAGE, messageSchema);

export default Message;
