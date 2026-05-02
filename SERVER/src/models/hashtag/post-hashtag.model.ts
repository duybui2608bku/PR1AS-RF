import mongoose, { Schema } from "mongoose";
import { IPostHashtagDocument } from "../../types/hashtag/hashtag.types";
import { modelsName } from "../models.name";

const postHashtagSchema = new Schema<IPostHashtagDocument>(
  {
    post_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.POST,
      required: true,
      index: true,
    },
    hashtag_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.HASHTAG,
      required: true,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.POST_HASHTAG,
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

postHashtagSchema.index({ post_id: 1, hashtag_id: 1 }, { unique: true });
postHashtagSchema.index({ hashtag_id: 1, created_at: -1 });

export const PostHashtag = mongoose.model<IPostHashtagDocument>(
  modelsName.POST_HASHTAG,
  postHashtagSchema
);
