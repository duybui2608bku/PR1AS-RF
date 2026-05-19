import mongoose, { Schema } from "mongoose";
import { modelsName } from "./models.name";
import {
  IReputationHistoryDocument,
  ReputationHistoryReason,
} from "../types/reputation/reputation-history.types";

const reputationHistorySchema = new Schema<IReputationHistoryDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    delta: { type: Number, required: true },
    previous_score: { type: Number, required: true },
    new_score: { type: Number, required: true },
    reason: {
      type: String,
      enum: Object.values(ReputationHistoryReason),
      default: ReputationHistoryReason.MANUAL,
      index: true,
    },
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: modelsName.REPUTATION_HISTORY,
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

reputationHistorySchema.index({ user_id: 1, created_at: -1 });

export const ReputationHistory =
  mongoose.model<IReputationHistoryDocument>(
    modelsName.REPUTATION_HISTORY,
    reputationHistorySchema
  );
