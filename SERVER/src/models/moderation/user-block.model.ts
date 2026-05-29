import mongoose, { Schema } from "mongoose";
import { IUserBlockDocument } from "../../types/moderation";
import { modelsName } from "../models.name";

const userBlockSchema = new Schema<IUserBlockDocument>(
  {
    blocker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      // Indexed via the compound { blocker_id, blocked_id } unique index below.
    },
    blocked_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    block_profile: {
      type: Boolean,
      default: false,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.USER_BLOCK,
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

userBlockSchema.index({ blocker_id: 1, blocked_id: 1 }, { unique: true });

export const UserBlock = mongoose.model<IUserBlockDocument>(
  modelsName.USER_BLOCK,
  userBlockSchema
);
