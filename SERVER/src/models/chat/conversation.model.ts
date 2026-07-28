import { model, Schema } from "mongoose";
import { modelsName } from "../models.name";

const conversationSchema = new Schema({
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
  last_message: {
    type: Schema.Types.ObjectId,
    ref: modelsName.MESSAGE,
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

conversationSchema.index({ sender_id: 1, receiver_id: 1 }, { unique: true });
// listDirectPartnerIds() (repositories/chat/conversation.repository.ts) queries
// $or: [{ sender_id }, { receiver_id }] on every presence transition (socket
// connect/disconnect). The unique index above only covers the sender_id
// branch, so the receiver_id branch would full-scan without this.
conversationSchema.index({ receiver_id: 1 });

const Conversation = model(modelsName.CONVERSATION, conversationSchema);

export default Conversation;
