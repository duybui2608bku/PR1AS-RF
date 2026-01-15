import mongoose, { Schema } from "mongoose";
import { IWalletDocument } from "../../types/wallet";
import { modelsName } from "../models.name";

const walletSchema = new Schema<IWalletDocument>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: modelsName.USER,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
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

walletSchema.index({ user_id: 1 });

export const Wallet = mongoose.model<IWalletDocument>(
  modelsName.WALLET,
  walletSchema
);
