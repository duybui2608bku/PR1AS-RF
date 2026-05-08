import mongoose, { Schema } from "mongoose";
import { IReactionDocument } from "../../types/reaction/reaction.types";
import { ReactionTargetType, ReactionType } from "../../constants/reaction";
import { modelsName } from "../models.name";

const reactionSchema = new Schema<IReactionDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    target_type: {
      type: String,
      enum: Object.values(ReactionTargetType),
      required: true,
    },
    target_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ReactionType),
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.REACTION,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

reactionSchema.index(
  { user_id: 1, target_type: 1, target_id: 1 },
  { unique: true }
);
reactionSchema.index({ target_type: 1, target_id: 1, type: 1 });

export const Reaction = mongoose.model<IReactionDocument>(
  modelsName.REACTION,
  reactionSchema
);
