import mongoose, { Schema } from "mongoose";
import {
  IReputationConfigDocument,
  ReputationConfigKey,
} from "../../types/reputation/reputation-config.types";
import { modelsName } from "../models.name";

const reputationConfigSchema = new Schema<IReputationConfigDocument>(
  {
    key: {
      type: String,
      enum: Object.values(ReputationConfigKey),
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    description: {
      type: String,
      required: true,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false, versionKey: false }
);

export const ReputationConfig = mongoose.model<IReputationConfigDocument>(
  modelsName.REPUTATION_CONFIG,
  reputationConfigSchema
);
