import mongoose, { Schema } from "mongoose";
import {
  DressCode,
  IServiceDocument,
  ServiceCategory,
} from "../../types/service/service.type";

const serviceSchema = new Schema<IServiceDocument>(
  {
    category: {
      type: String,
      enum: Object.values(ServiceCategory),
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      en: { type: String, required: true },
      vi: { type: String, required: true },
      zh: { type: String, default: null },
      ko: { type: String, default: null },
    },
    description: {
      en: { type: String, required: true },
      vi: { type: String, required: true },
      zh: { type: String, default: null },
      ko: { type: String, default: null },
    },
    companionship_level: {
      type: Number,
      min: 1,
      max: 3,
      default: null,
    },
    rules: {
      physical_touch: { type: Boolean },
      intellectual_conversation_required: { type: Boolean },
      dress_code: {
        type: String,
        enum: Object.values(DressCode),
      },
    },
    is_active: {
      type: Boolean,
      default: true,
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
  },
  {
    timestamps: false,
    collection: "service",
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

serviceSchema.index({ code: 1, category: 1 });

export const Service = mongoose.model<IServiceDocument>(
  "Service",
  serviceSchema
);
