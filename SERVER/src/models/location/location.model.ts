import mongoose, { Schema } from "mongoose";
import { ILocationDocument, LocationType } from "../../types";
import { modelsName } from "../models.name";

const locationSchema = new Schema<ILocationDocument>(
  {
    name: {
      type: new Schema(
        {
          vi: {
            type: String,
            required: true,
            trim: true,
          },
          en: {
            type: String,
            required: true,
            trim: true,
          },
        },
        { _id: false }
      ),
      required: true,
    },
    slug_vi: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    slug_en: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: Object.values(LocationType),
      required: true,
    },
    country_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "VN",
    },
    admin_level_1: {
      type: String,
      required: true,
      trim: true,
    },
    admin_level_2: {
      type: String,
      default: null,
      trim: true,
    },
    admin_level_3: {
      type: String,
      default: null,
      trim: true,
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
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
    collection: modelsName.LOCATION,
    timestamps: false,
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

locationSchema.index({ slug_vi: 1 });
locationSchema.index({ slug_en: 1 });
locationSchema.index({ admin_level_1: 1, type: 1, is_active: 1 });
locationSchema.index({ lat: 1, lng: 1 });
locationSchema.index(
  { slug_vi: 1, admin_level_1: 1, type: 1 },
  { unique: true }
);

export const Location = mongoose.model<ILocationDocument>(
  modelsName.LOCATION,
  locationSchema
);
