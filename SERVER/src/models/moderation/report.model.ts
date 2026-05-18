import mongoose, { Schema } from "mongoose";
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "../../constants/moderation";
import { modelsName } from "../models.name";
import { IReportDocument } from "../../types/moderation";

const reportSchema = new Schema<IReportDocument>(
  {
    reporter_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    target_type: {
      type: String,
      enum: Object.values(ReportTargetType),
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    post_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.POST,
      default: null,
      index: true,
    },
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
      index: true,
    },
    target_user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
      index: true,
    },
    booking_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.BOOKING,
      default: null,
      index: true,
    },
    evidence_urls: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.OPEN,
      index: true,
    },
    admin_note: { type: String, trim: true, maxlength: 2000, default: null },
    post_deleted_at: { type: Date, default: null },
    post_create_restriction_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER_RESTRICTION,
      default: null,
    },
    worker_activity_restriction_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER_RESTRICTION,
      default: null,
    },
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
    collection: modelsName.REPORT,
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

reportSchema.index({ target_type: 1, status: 1, created_at: -1 });

export const Report = mongoose.model<IReportDocument>(
  modelsName.REPORT,
  reportSchema
);
