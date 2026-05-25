import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";

export interface IJobLock {
  name: string;
  holder: string;
  acquired_at: Date;
  held_until: Date;
}

export interface IJobLockDocument extends IJobLock, mongoose.Document {}

const jobLockSchema = new Schema<IJobLockDocument>(
  {
    name: { type: String, required: true, unique: true, index: true },
    holder: { type: String, required: true },
    acquired_at: { type: Date, required: true, default: () => new Date() },
    // Stale locks past held_until are automatically reclaimable. A TTL index
    // is set so MongoDB also cleans up abandoned locks even if no job ever
    // tries to reclaim them.
    held_until: { type: Date, required: true },
  },
  {
    collection: modelsName.JOB_LOCK,
    timestamps: false,
  }
);

jobLockSchema.index({ held_until: 1 }, { expireAfterSeconds: 0 });

export const JobLock = mongoose.model<IJobLockDocument>(
  modelsName.JOB_LOCK,
  jobLockSchema
);
