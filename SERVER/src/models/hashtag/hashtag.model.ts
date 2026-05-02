import mongoose, { Schema } from "mongoose";
import { IHashtagDocument } from "../../types/hashtag/hashtag.types";
import { HASHTAG_LIMITS } from "../../constants/hashtag";
import { modelsName } from "../models.name";

const hashtagSchema = new Schema<IHashtagDocument>(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: HASHTAG_LIMITS.MAX_LENGTH,
      unique: true,
      index: true,
    },
    display: {
      type: String,
      required: true,
      trim: true,
      maxlength: HASHTAG_LIMITS.MAX_LENGTH,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.HASHTAG,
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

export const Hashtag = mongoose.model<IHashtagDocument>(
  modelsName.HASHTAG,
  hashtagSchema
);
