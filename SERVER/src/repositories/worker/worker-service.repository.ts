import { WorkerService } from "../../models/worker/worker-service";
import {
  IWorkerServiceDocument,
  WorkerServicePricing,
} from "../../types/worker/worker-service";

export interface UpsertWorkerServicePayload {
  serviceId: string;
  serviceCode: string;
  pricing: WorkerServicePricing[];
}

interface UpdateWorkerServiceOptions {
  pricing?: WorkerServicePricing[];
  isActive?: boolean;
  now: Date;
}

class WorkerServiceRepository {
  async upsertManyForWorker(
    workerId: string,
    payloads: UpsertWorkerServicePayload[],
    now: Date
  ): Promise<IWorkerServiceDocument[]> {
    if (!payloads.length) {
      return [];
    }

    const operations = payloads.map((item) => ({
      updateOne: {
        filter: { worker_id: workerId, service_id: item.serviceId },
        update: {
          $set: {
            service_id: item.serviceId,
            service_code: item.serviceCode,
            pricing: item.pricing,
            is_active: true,
            updated_at: now,
          },
          $setOnInsert: {
            worker_id: workerId,
            created_at: now,
          },
        },
        upsert: true,
      },
    }));

    await WorkerService.bulkWrite(operations);

    const serviceIds = payloads.map((p) => p.serviceId);
    return WorkerService.find({
      worker_id: workerId,
      service_id: { $in: serviceIds },
    }).sort({ created_at: -1, service_code: 1 });
  }

  async findOneForWorker(
    workerId: string,
    serviceId: string
  ): Promise<IWorkerServiceDocument | null> {
    return WorkerService.findOne({
      worker_id: workerId,
      service_id: serviceId,
    });
  }

  async updateForWorker(
    workerId: string,
    serviceId: string,
    options: UpdateWorkerServiceOptions
  ): Promise<IWorkerServiceDocument | null> {
    const { pricing, isActive, now } = options;

    const set: Partial<IWorkerServiceDocument> & { updated_at: Date } = {
      updated_at: now,
    };

    if (pricing) {
      set.pricing = pricing;
    }

    if (typeof isActive !== "undefined") {
      set.is_active = isActive;
    }

    return WorkerService.findOneAndUpdate(
      { worker_id: workerId, service_id: serviceId },
      { $set: set },
      { new: true }
    );
  }

  async deleteForWorker(workerId: string, serviceId: string): Promise<boolean> {
    const result = await WorkerService.deleteOne({
      worker_id: workerId,
      service_id: serviceId,
    });

    return result.deletedCount === 1;
  }

  async findAllForWorker(
    workerId: string
  ): Promise<IWorkerServiceDocument[]> {
    return WorkerService.find({
      worker_id: workerId,
    }).sort({ created_at: -1, service_code: 1 });
  }
}

export const workerServiceRepository = new WorkerServiceRepository();
