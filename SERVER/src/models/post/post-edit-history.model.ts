import mongoose, { Schema } from "mongoose";
import { PostMediaType } from "../../constants/post";
import { modelsName } from "../models.name";
import { IPostEditHistoryDocument } from "../../types/post/post.types";

const mediaSnapshotSchema = new Schema(
  {
    type: { type: String, enum: Object.values(PostMediaType), required: true },
    url: { type: String, required: true, trim: true },
    sort_order: { type: Number, default: 0 },
    mime_type: { type: String, default: null },
    byte_size: { type: Number, default: null },
    duration_seconds: { type: Number, default: null },
  },
  { _id: false }
);

const postEditHistorySchema = new Schema<IPostEditHistoryDocument>(
  {
    post_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.POST,
      required: true,
      index: true,
    },
    author_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    body_snapshot: { type: String, required: true },
    media_snapshot: { type: [mediaSnapshotSchema], default: [] },
    // Why we kept a copy: either the moment a report was filed against the
    // post, or because the author edited the post while at least one report
    // was still open (potential bait-and-switch on an applied job).
    reason: {
      type: String,
      enum: ["report_filed", "edited_after_report"],
      required: true,
      index: true,
    },
    report_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.REPORT,
      default: null,
    },
    snapshot_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: "post_edit_histories",
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

postEditHistorySchema.index({ post_id: 1, snapshot_at: -1 });

export const PostEditHistory = mongoose.model<IPostEditHistoryDocument>(
  "post_edit_histories",
  postEditHistorySchema
);
