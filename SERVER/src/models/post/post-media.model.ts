import mongoose, { Schema } from "mongoose";
import { IPostMediaDocument } from "../../types/post/post.types";
import { PostMediaType } from "../../constants/post";
import { modelsName } from "../models.name";

const postMediaSchema = new Schema<IPostMediaDocument>(
  {
    post_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.POST,
      required: true,
      index: true,
    },
    sort_order: {
      type: Number,
      default: 0,
      min: 0,
    },
    type: {
      type: String,
      enum: Object.values(PostMediaType),
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    storage_key: {
      type: String,
      default: null,
      trim: true,
    },
    mime_type: {
      type: String,
      default: null,
      trim: true,
    },
    byte_size: {
      type: Number,
      default: null,
      min: 0,
    },
    duration_seconds: {
      type: Number,
      default: null,
      min: 0,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.POST_MEDIA,
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

postMediaSchema.index({ post_id: 1, sort_order: 1 });

export const PostMedia = mongoose.model<IPostMediaDocument>(
  modelsName.POST_MEDIA,
  postMediaSchema
);
