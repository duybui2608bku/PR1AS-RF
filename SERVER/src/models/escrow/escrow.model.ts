import mongoose, { Schema } from "mongoose";
import {
  EscrowStatus,
  EscrowReleaseReason,
  EscrowRefundReason,
  ESCROW_LIMITS,
} from "../../constants/escrow";
import { IEscrowDocument } from "../../types/escrow";
import { modelsName } from "../models.name";

const escrowSchema = new Schema<IEscrowDocument>(
  {
    booking_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.BOOKING,
      required: true,
      index: true,
    },
    client_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platform_fee: {
      type: Number,
      required: true,
      min: 0,
    },
    worker_payout: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "VND",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(EscrowStatus),
      default: EscrowStatus.HOLDING,
      index: true,
    },
    hold_transaction_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.WALLET_TRANSACTION,
      default: null,
    },
    release_transaction_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.WALLET_TRANSACTION,
      default: null,
    },
    refund_transaction_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.WALLET_TRANSACTION,
      default: null,
    },
    held_at: {
      type: Date,
      default: Date.now,
    },
    released_at: {
      type: Date,
      default: null,
    },
    refunded_at: {
      type: Date,
      default: null,
    },
    release_reason: {
      type: String,
      enum: Object.values(EscrowReleaseReason),
      default: null,
    },
    refund_reason: {
      type: String,
      enum: Object.values(EscrowRefundReason),
      default: null,
    },
    refund_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    penalty_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expires_at: {
      type: Date,
      default: () =>
        new Date(
          Date.now() + ESCROW_LIMITS.MAX_HOLD_DAYS * 24 * 60 * 60 * 1000
        ),
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
    collection: modelsName.ESCROW,
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

escrowSchema.index({ booking_id: 1 }, { unique: true });
escrowSchema.index({ client_id: 1, status: 1 });
escrowSchema.index({ worker_id: 1, status: 1 });
escrowSchema.index({ status: 1, created_at: -1 });
escrowSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const Escrow = mongoose.model<IEscrowDocument>(
  modelsName.ESCROW,
  escrowSchema
);
