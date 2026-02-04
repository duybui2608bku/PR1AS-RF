import { model, Schema } from "mongoose";
import { modelsName } from "../models.name";

const conversationGroupSchema = new Schema({
  booking_id: {
    type: Schema.Types.ObjectId,
    ref: modelsName.BOOKING,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
    },
  ],
  last_message: {
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

conversationGroupSchema.index({ booking_id: 1 });
conversationGroupSchema.index({ members: 1 });

const ConversationGroup = model(
  modelsName.CONVERSATION_GROUP,
  conversationGroupSchema
);

export default ConversationGroup;
