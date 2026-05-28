import { Types } from "mongoose";
import { WorkerBlackout } from "../../models/worker/worker-blackout.model";
import {
  CreateWorkerBlackoutInput,
  IWorkerBlackoutDocument,
} from "../../types/worker/worker-blackout.types";

export class WorkerBlackoutRepository {
  async create(
    workerId: string,
    input: CreateWorkerBlackoutInput
  ): Promise<IWorkerBlackoutDocument> {
    return WorkerBlackout.create({
      worker_id: new Types.ObjectId(workerId),
      start_time: input.start_time,
      end_time: input.end_time,
      reason: input.reason ?? null,
    });
  }

  async findById(id: string): Promise<IWorkerBlackoutDocument | null> {
    return WorkerBlackout.findById(id);
  }

  async findByWorkerInWindow(
    workerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<IWorkerBlackoutDocument[]> {
    return WorkerBlackout.find({
      worker_id: new Types.ObjectId(workerId),
      start_time: { $lt: endTime },
      end_time: { $gt: startTime },
    })
      .sort({ start_time: 1 })
      .lean() as Promise<IWorkerBlackoutDocument[]>;
  }

  /**
   * Cheap exists check used by the booking-conflict path so we avoid loading
   * full documents on the create-booking hot path.
   */
  async existsOverlap(
    workerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    return WorkerBlackout.exists({
      worker_id: new Types.ObjectId(workerId),
      start_time: { $lt: endTime },
      end_time: { $gt: startTime },
    }).then(Boolean);
  }

  async deleteByIdForWorker(
    workerId: string,
    id: string
  ): Promise<IWorkerBlackoutDocument | null> {
    return WorkerBlackout.findOneAndDelete({
      _id: new Types.ObjectId(id),
      worker_id: new Types.ObjectId(workerId),
    });
  }
}

export const workerBlackoutRepository = new WorkerBlackoutRepository();
