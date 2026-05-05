import mongoose, { Schema } from "mongoose";
import {
  TransactionType,
  TransactionStatus,
  PaymentGateway,
  SePayTransferType,
} from "../../constants/wallet";
import { IWalletTransactionDocument } from "../../types/wallet";
import { modelsName } from "../models.name";

const walletTransactionSchema = new Schema<IWalletTransactionDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
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
    payment_code: {
      type: String,
      default: null,
      index: true,
    },
    payment_content: {
      type: String,
      default: null,
    },
    qr_url: {
      type: String,
      default: null,
    },
    bank_account_number: {
      type: String,
      default: null,
    },
    bank_name: {
      type: String,
      default: null,
    },
    sepay_transaction_id: {
      type: Number,
      default: null,
      index: true,
    },
    sepay_gateway: {
      type: String,
      default: null,
    },
    sepay_transaction_date: {
      type: Date,
      default: null,
    },
    sepay_account_number: {
      type: String,
      default: null,
    },
    sepay_code: {
      type: String,
      default: null,
      index: true,
    },
    sepay_content: {
      type: String,
      default: null,
    },
    sepay_transfer_type: {
      type: String,
      enum: Object.values(SePayTransferType),
      default: null,
    },
    sepay_transfer_amount: {
      type: Number,
      default: null,
      min: 0,
    },
    sepay_accumulated: {
      type: Number,
      default: null,
    },
    sepay_sub_account: {
      type: String,
      default: null,
    },
    sepay_reference_code: {
      type: String,
      default: null,
      index: true,
    },
    sepay_description: {
      type: String,
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
walletTransactionSchema.index({ payment_code: 1 });
walletTransactionSchema.index({ sepay_transaction_id: 1 });
walletTransactionSchema.index({ sepay_reference_code: 1 });
walletTransactionSchema.index({ status: 1, type: 1 });

export const WalletTransaction = mongoose.model<IWalletTransactionDocument>(
  modelsName.WALLET_TRANSACTION,
  walletTransactionSchema
);
