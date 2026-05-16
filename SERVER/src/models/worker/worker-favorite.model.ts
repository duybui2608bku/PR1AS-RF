import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { IWorkerFavoriteDocument } from "../../types/worker/worker-favorite.types";

const workerFavoriteSchema = new Schema<IWorkerFavoriteDocument>(
  {
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
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.CLIENT_FAVORITE_WORKER,
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

workerFavoriteSchema.index({ client_id: 1, worker_id: 1 }, { unique: true });
workerFavoriteSchema.index({ client_id: 1, created_at: -1 });

export const WorkerFavorite = mongoose.model<IWorkerFavoriteDocument>(
  modelsName.CLIENT_FAVORITE_WORKER,
  workerFavoriteSchema
);
