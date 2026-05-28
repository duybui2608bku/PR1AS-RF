import { Document, Types } from "mongoose";

export interface IWorkerBlackout {
  worker_id: Types.ObjectId | string;
  // Half-open interval [start_time, end_time). A whole-day off block stores
  // start = local 00:00 and end = next local 00:00 so the same overlap check
  // works for both partial-day and multi-day blackouts.
  start_time: Date;
  end_time: Date;
  reason?: string | null;
  created_at: Date;
}

export interface IWorkerBlackoutDocument extends IWorkerBlackout, Document {
  _id: Types.ObjectId;
}

export interface CreateWorkerBlackoutInput {
  start_time: Date;
  end_time: Date;
  reason?: string;
}

export interface WorkerBlackoutItem {
  id: string;
  start_time: Date;
  end_time: Date;
  reason?: string | null;
}
