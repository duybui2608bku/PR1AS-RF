import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { BoostStatus, BoostType } from "../../constants/boost";
import { IWorkerBoostDocument } from "../../types/boost/boost.types";

const workerBoostSchema = new Schema<IWorkerBoostDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: modelsName.USER, required: true },
    boost_type: { type: String, enum: Object.values(BoostType), required: true },
    tier: { type: Number, required: true }, // 1=featured, 2=basic
    cost_points: { type: Number, required: true, min: 0 },
    started_at: { type: Date, required: true },
    expires_at: { type: Date, required: true },
    status: { type: String, enum: Object.values(BoostStatus), required: true, default: BoostStatus.ACTIVE },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.WORKER_BOOST,
  }
);

workerBoostSchema.index({ user_id: 1, status: 1 });
workerBoostSchema.index({ status: 1, expires_at: 1 }); // for cron expiration

export const WorkerBoost = mongoose.model<IWorkerBoostDocument>(
  modelsName.WORKER_BOOST,
  workerBoostSchema
);
