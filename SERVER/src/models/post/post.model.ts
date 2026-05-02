import mongoose, { Schema } from "mongoose";
import { IPostDocument } from "../../types/post/post.types";
import { POST_LIMITS, PostVisibility } from "../../constants/post";
import { modelsName } from "../models.name";

const postSchema = new Schema<IPostDocument>(
  {
    author_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: POST_LIMITS.MIN_BODY_LENGTH,
      maxlength: POST_LIMITS.MAX_BODY_LENGTH,
    },
    visibility: {
      type: String,
      enum: Object.values(PostVisibility),
      default: PostVisibility.PUBLIC,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
    collection: modelsName.POST,
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

postSchema.index({ author_id: 1, created_at: -1 });
postSchema.index({ created_at: -1, _id: -1 });
postSchema.index({ deleted_at: 1 });

export const Post = mongoose.model<IPostDocument>(modelsName.POST, postSchema);
