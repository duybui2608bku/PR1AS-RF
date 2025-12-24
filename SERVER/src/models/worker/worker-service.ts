import mongoose, { Schema } from "mongoose";
import {
  IWorkerServiceDocument,
  WorkerServicePricing,
  PricingUnit,
} from "../../types/worker/worker-service";
import { modelsName } from "../models.name";

const pricingSchema = new Schema<WorkerServicePricing>(
  {
    unit: {
      type: String,
      enum: Object.values(PricingUnit),
      required: true,
    },
    duration: { type: Number, min: 1, required: true },
    price: { type: Number, min: 0.01, required: true },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
  },
  { _id: false }
);

const workerServiceSchema = new Schema<IWorkerServiceDocument>(
  {
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    service_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.SERVICE,
      required: true,
    },
    service_code: { type: String, required: true, uppercase: true, trim: true },
    pricing: {
      type: [pricingSchema],
      required: true,
      validate: {
        validator: (value: WorkerServicePricing[]) => value?.length > 0,
        message: "Pricing must contain at least one item",
      },
    },
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    collection: modelsName.WORKER_SERVICE,
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

export const WorkerService = mongoose.model<IWorkerServiceDocument>(
  modelsName.WORKER_SERVICE,
  workerServiceSchema
);
