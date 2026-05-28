import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { IWorkerBlackoutDocument } from "../../types/worker/worker-blackout.types";

const workerBlackoutSchema = new Schema<IWorkerBlackoutDocument>(
  {
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    reason: { type: String, default: null, trim: true, maxlength: 500 },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.WORKER_BLACKOUT,
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

// Window queries by worker dominate (`schedule` view + booking conflict check),
// so we index on the natural compound. end_time first lets the index serve
// `end_time > now` range filters for upcoming-blackouts views.
workerBlackoutSchema.index({ worker_id: 1, end_time: 1, start_time: 1 });

export const WorkerBlackout = mongoose.model<IWorkerBlackoutDocument>(
  modelsName.WORKER_BLACKOUT,
  workerBlackoutSchema
);
