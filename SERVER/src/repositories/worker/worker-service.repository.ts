import { WorkerService } from "../../models/worker/worker-service";
import {
  IWorkerServiceDocument,
  WorkerServicePricing,
} from "../../types/worker/worker-service";
import { modelsName } from "../../models/models.name";
import mongoose, { PipelineStage } from "mongoose";
import { ServiceCategory } from "../../types/service/service.type";

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

export interface GroupedWorkersFilter {
  q?: string;
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

const LOCATION_RADIUS_KM = 30;
const KM_PER_LAT_DEGREE = 111.32;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class WorkerServiceRepository {
  async upsertManyForWorker(
    workerId: string,
    payloads: UpsertWorkerServicePayload[],
    now: Date
  ): Promise<IWorkerServiceDocument[]> {
    if (!payloads.length) {
      return [];
    }

    const workerObjectId = new mongoose.Types.ObjectId(workerId);
    const operations: Parameters<typeof WorkerService.bulkWrite>[0] =
      payloads.map((item) => {
        const serviceObjectId = new mongoose.Types.ObjectId(item.serviceId);
        return {
          updateOne: {
            filter: {
              worker_id: workerObjectId,
              service_id: serviceObjectId,
            },
            update: {
              $set: {
                service_id: serviceObjectId,
                service_code: item.serviceCode,
                pricing: item.pricing,
                is_active: true,
                updated_at: now,
              },
              $setOnInsert: {
                worker_id: workerObjectId,
                created_at: now,
              },
            },
            upsert: true,
          },
        };
      });

    await WorkerService.bulkWrite(operations);

    const serviceIds = payloads.map(
      (p) => new mongoose.Types.ObjectId(p.serviceId)
    );
    return WorkerService.find({
      worker_id: workerObjectId,
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

  async findAllForWorker(workerId: string): Promise<IWorkerServiceDocument[]> {
    return WorkerService.find({
      worker_id: workerId,
    }).sort({ created_at: -1, service_code: 1 });
  }

  async findById(id: string): Promise<IWorkerServiceDocument | null> {
    return WorkerService.findById(id);
  }

  async findWorkersGroupedByService(filters?: GroupedWorkersFilter): Promise<
    Array<{
      service: {
        id: string;
        code: string;
        name: {
          en: string;
          vi: string;
          zh?: string | null;
          ko?: string | null;
        };
        description: {
          en: string;
          vi: string;
          zh?: string | null;
          ko?: string | null;
        };
        category: string;
      };
      workers: Array<{
        id: string;
        full_name: string | null;
        avatar: string | null;
        worker_profile: {
          title: string | null;
          introduction: string | null;
          gallery_urls: string[];
        } | null;
        pricing: WorkerServicePricing[];
      }>;
    }>
  > {
    const q = filters?.q?.trim();
    const category = filters?.category?.trim();
    const normalizedCategory = category?.toUpperCase();

    const isParentCategory =
      normalizedCategory &&
      Object.values(ServiceCategory).includes(
        normalizedCategory as ServiceCategory
      );

    const stages: PipelineStage[] = [
      {
        $match: {
          is_active: true,
        },
      },
      {
        $lookup: {
          from: modelsName.SERVICE,
          localField: "service_id",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $unwind: {
          path: "$service",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "service.is_active": true,
        },
      },
    ];

    if (normalizedCategory) {
      if (isParentCategory) {
        stages.push({
          $match: {
            "service.category": normalizedCategory,
          },
        });
      } else {
        stages.push({
          $match: {
            $or: [
              { "service.code": normalizedCategory },
              { service_code: normalizedCategory },
            ],
          },
        });
      }
    }

    if (q) {
      const qRegex = new RegExp(escapeRegExp(q), "i");
      stages.push({
        $match: {
          $or: [
            { "service.code": qRegex },
            { "service.name.vi": qRegex },
            { "service.name.en": qRegex },
            { "service.name.zh": qRegex },
            { "service.name.ko": qRegex },
          ],
        },
      });
    }

    stages.push(
      {
        $lookup: {
          from: modelsName.USER,
          localField: "worker_id",
          foreignField: "_id",
          as: "worker",
        },
      },
      {
        $unwind: {
          path: "$worker",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "worker.status": "active",
          "worker.worker_profile": { $ne: null },
        },
      }
    );

    if (filters?.location) {
      const { latitude, longitude } = filters.location;
      const latDelta = LOCATION_RADIUS_KM / KM_PER_LAT_DEGREE;
      const cosLat = Math.cos((latitude * Math.PI) / 180);
      const lngDelta =
        LOCATION_RADIUS_KM /
        (KM_PER_LAT_DEGREE * Math.max(Math.abs(cosLat), 0.01));

      stages.push({
        $match: {
          "worker.coords.latitude": {
            $gte: latitude - latDelta,
            $lte: latitude + latDelta,
          },
          "worker.coords.longitude": {
            $gte: longitude - lngDelta,
            $lte: longitude + lngDelta,
          },
        },
      });
    }

    stages.push(
      {
        $group: {
          _id: "$service_id",
          service: {
            $first: {
              id: { $toString: "$service._id" },
              code: "$service.code",
              name: "$service.name",
              description: "$service.description",
              category: "$service.category",
            },
          },
          workers: {
            $push: {
              id: { $toString: "$worker._id" },
              full_name: "$worker.full_name",
              avatar: "$worker.avatar",
              worker_profile: {
                title: "$worker.worker_profile.title",
                introduction: "$worker.worker_profile.introduction",
                gallery_urls: "$worker.worker_profile.gallery_urls",
              },
              pricing: "$pricing",
            },
          },
        },
      },
      {
        $sort: {
          "service.code": 1,
        },
      }
    );

    const result = await WorkerService.aggregate(stages);

    return result.map(
      (item: {
        service: {
          id: string;
          code: string;
          name: {
            en: string;
            vi: string;
            zh?: string | null;
            ko?: string | null;
          };
          description: {
            en: string;
            vi: string;
            zh?: string | null;
            ko?: string | null;
          };
          category: string;
        };
        workers: Array<{
          id: string;
          full_name: string | null;
          avatar: string | null;
          worker_profile: {
            title: string | null;
            introduction: string | null;
            gallery_urls: string[];
          } | null;
          pricing: WorkerServicePricing[];
        }>;
      }) => ({
        service: item.service,
        workers: item.workers,
      })
    );
  }
}

export const workerServiceRepository = new WorkerServiceRepository();
