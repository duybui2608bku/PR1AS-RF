import mongoose, { Schema, Document } from "mongoose";
import { modelsName } from "../models.name";

export interface IPostRegistrationDocument extends Document {
  post_id: mongoose.Types.ObjectId;
  worker_id: mongoose.Types.ObjectId;
  created_at: Date;
}

const postRegistrationSchema = new Schema<IPostRegistrationDocument>(
  {
    post_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.POST,
      required: true,
    },
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.POST_REGISTRATION,
  }
);

postRegistrationSchema.index({ post_id: 1, worker_id: 1 }, { unique: true });
postRegistrationSchema.index({ worker_id: 1, created_at: -1 });
postRegistrationSchema.index({ post_id: 1, created_at: -1 });

export const PostRegistration = mongoose.model<IPostRegistrationDocument>(
  modelsName.POST_REGISTRATION,
  postRegistrationSchema
);
