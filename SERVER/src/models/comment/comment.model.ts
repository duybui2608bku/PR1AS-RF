import mongoose, { Schema } from "mongoose";
import { ICommentDocument } from "../../types/comment/comment.types";
import { COMMENT_LIMITS } from "../../constants/comment";
import { modelsName } from "../models.name";

const commentSchema = new Schema<ICommentDocument>(
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
    parent_comment_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.COMMENT,
      default: null,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: COMMENT_LIMITS.MIN_BODY_LENGTH,
      maxlength: COMMENT_LIMITS.MAX_BODY_LENGTH,
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
    collection: modelsName.COMMENT,
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

commentSchema.index({ post_id: 1, created_at: 1 });
commentSchema.index({ post_id: 1, parent_comment_id: 1, created_at: 1 });
commentSchema.index({ deleted_at: 1 });

export const Comment = mongoose.model<ICommentDocument>(
  modelsName.COMMENT,
  commentSchema
);
