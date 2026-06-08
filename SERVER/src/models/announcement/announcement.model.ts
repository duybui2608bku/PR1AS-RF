import mongoose, { Schema } from "mongoose";
import {
  AnnouncementDisplayType,
  AnnouncementDisplayBehavior,
  AnnouncementTargetRole,
  AnnouncementRedirectTarget,
} from "../../constants/announcement";
import { modelsName } from "../models.name";
import { IAnnouncementDocument } from "../../types/announcement";

const announcementSchema = new Schema<IAnnouncementDocument>(
  {
    title: { type: String, default: "", trim: true, maxlength: 300 },
    content: { type: String, required: true },
    images: [{ type: String }],
    display_types: [
      {
        type: String,
        enum: Object.values(AnnouncementDisplayType),
      },
    ],
    display_behavior: {
      type: String,
      enum: Object.values(AnnouncementDisplayBehavior),
      default: AnnouncementDisplayBehavior.ONCE_DEVICE,
    },
    target_roles: [
      {
        type: String,
        enum: Object.values(AnnouncementTargetRole),
      },
    ],
    placements: [{ type: String, trim: true }],
    redirect_url: { type: String, default: null },
    redirect_target: {
      type: String,
      enum: Object.values(AnnouncementRedirectTarget),
      default: AnnouncementRedirectTarget.BLANK,
    },
    allow_close: { type: Boolean, default: true },
    is_active: { type: Boolean, default: false, index: true },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    priority: { type: Number, default: 0 },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: false,
    collection: modelsName.ANNOUNCEMENT,
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

announcementSchema.index({ placements: 1, is_active: 1, deleted: 1 });
announcementSchema.index({ created_at: -1, _id: -1 });

export const Announcement = mongoose.model<IAnnouncementDocument>(
  modelsName.ANNOUNCEMENT,
  announcementSchema
);
