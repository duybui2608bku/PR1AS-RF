import mongoose, { Schema } from "mongoose";
import { FeedbackStatus, FeedbackType } from "../../constants/feedback";
import { modelsName } from "../models.name";
import { IFeedbackDocument } from "../../types/feedback";

const feedbackSchema = new Schema<IFeedbackDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(FeedbackType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: Object.values(FeedbackStatus),
      default: FeedbackStatus.OPEN,
      index: true,
    },
    admin_note: { type: String, trim: true, maxlength: 2000, default: null },
    resolved_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    resolved_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.FEEDBACK,
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

feedbackSchema.index({ type: 1, status: 1, created_at: -1 });

export const Feedback = mongoose.model<IFeedbackDocument>(
  modelsName.FEEDBACK,
  feedbackSchema
);
