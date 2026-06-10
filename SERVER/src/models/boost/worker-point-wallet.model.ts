import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { IWorkerPointWalletDocument } from "../../types/boost/boost.types";

const workerPointWalletSchema = new Schema<IWorkerPointWalletDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: modelsName.USER, required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    total_earned: { type: Number, required: true, default: 0, min: 0 },
    total_spent: { type: Number, required: true, default: 0, min: 0 },
    attendance_streak: { type: Number, required: true, default: 0, min: 0 },
    last_attendance_date: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.WORKER_POINT_WALLET,
  }
);

workerPointWalletSchema.pre("save", function () {
  this.updated_at = new Date();
});

export const WorkerPointWallet = mongoose.model<IWorkerPointWalletDocument>(
  modelsName.WORKER_POINT_WALLET,
  workerPointWalletSchema
);
