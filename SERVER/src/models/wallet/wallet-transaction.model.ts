import mongoose, { Schema } from "mongoose";
import {
  TransactionType,
  TransactionStatus,
  PaymentGateway,
} from "../../constants/wallet";
import { IWalletTransactionDocument } from "../../types/wallet";
import { modelsName } from "../models.name";

const walletTransactionSchema = new Schema<IWalletTransactionDocument>(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
      ref: modelsName.USER,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      default: TransactionStatus.PENDING,
      index: true,
    },
    gateway: {
      type: String,
      enum: Object.values(PaymentGateway),
      default: null,
    },
    gateway_transaction_id: {
      type: String,
      default: null,
      index: true,
    },
    gateway_response: {
      type: Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    currency: {
      type: String,
      default: "VND",
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
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

walletTransactionSchema.index({ user_id: 1, created_at: -1 });
walletTransactionSchema.index({ gateway_transaction_id: 1 });
walletTransactionSchema.index({ status: 1, type: 1 });

export const WalletTransaction = mongoose.model<IWalletTransactionDocument>(
  modelsName.WALLET_TRANSACTION,
  walletTransactionSchema
);
