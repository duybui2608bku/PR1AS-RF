import { WorkerService } from "../../models/worker/worker-service";
import {
  IWorkerServiceDocument,
  WorkerServicePricing,
} from "../../types/worker/worker-service";
import type { WorkerFavoriteServiceItem } from "../../types/worker/worker-favorite.types";
import { modelsName } from "../../models/models.name";
import mongoose, { PipelineStage } from "mongoose";
import { ServiceCategory } from "../../types/service/service.type";
import { BookingStatus } from "../../constants/booking";
import { ReviewType } from "../../constants/review";
import { UserStatus } from "../../types/auth";

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
  categories?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  workLocation?: {
    provinceCode: number;
    wardCode?: number | null;
  };
  excludedWorkerIds?: string[];
}

type LocalizedText = {
  en: string;
  vi: string;
  zh?: string | null;
  ko?: string | null;
};

export interface WorkerSuggestionCandidate {
  id: string;
  full_name: string | null;
  avatar: string | null;
  worker_profile: {
    title: string | null;
    introduction: string | null;
    gallery_urls: string[];
    work_locations: Array<{
      province_code: number;
      ward_code: number | null;
      label_snapshot: string | null;
    }>;
  } | null;
  matched_services: Array<{
    service_id: string;
    service_code: string;
    service: {
      id: string;
      code: string;
      name: LocalizedText;
      category: string;
    };
    pricing: WorkerServicePricing[];
  }>;
  average_rating: number;
  total_reviews: number;
  completed_bookings: number;
}

const LOCATION_RADIUS_KM = 30;
const KM_PER_LAT_DEGREE = 111.32;

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

  async findActiveServicesForWorkers(
    workerIds: string[]
  ): Promise<Array<WorkerFavoriteServiceItem & { worker_id: string }>> {
    if (!workerIds.length) return [];

    const workerObjectIds = workerIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    return WorkerService.aggregate<
      WorkerFavoriteServiceItem & { worker_id: string }
    >([
      {
        $match: {
          worker_id: { $in: workerObjectIds },
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
      {
        $sort: {
          service_code: 1,
          created_at: -1,
        },
      },
      {
        $project: {
          _id: 0,
          worker_id: { $toString: "$worker_id" },
          service_id: { $toString: "$service_id" },
          service_code: 1,
          pricing: 1,
          service: {
            id: { $toString: "$service._id" },
            code: "$service.code",
            name: "$service.name",
            category: "$service.category",
          },
        },
      },
    ]);
  }

  async findSuggestionCandidatesForWorker(
    workerId: string,
    serviceIds: string[],
    limit: number
  ): Promise<WorkerSuggestionCandidate[]> {
    if (!serviceIds.length) return [];

    const workerObjectId = new mongoose.Types.ObjectId(workerId);
    const serviceObjectIds = serviceIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const stages: PipelineStage[] = [
      {
        $match: {
          is_active: true,
          worker_id: { $ne: workerObjectId },
          service_id: { $in: serviceObjectIds },
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
          "worker.status": UserStatus.ACTIVE,
          "worker.worker_profile": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$worker._id",
          full_name: { $first: "$worker.full_name" },
          avatar: { $first: "$worker.avatar" },
          worker_profile: {
            $first: {
              title: "$worker.worker_profile.title",
              introduction: "$worker.worker_profile.introduction",
              gallery_urls: "$worker.worker_profile.gallery_urls",
              work_locations: {
                $ifNull: ["$worker.worker_profile.work_locations", []],
              },
            },
          },
          matched_services: {
            $push: {
              service_id: { $toString: "$service_id" },
              service_code: "$service_code",
              service: {
                id: { $toString: "$service._id" },
                code: "$service.code",
                name: "$service.name",
                category: "$service.category",
              },
              pricing: "$pricing",
            },
          },
        },
      },
      {
        $lookup: {
          from: modelsName.REVIEW,
          let: { workerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$worker_id", "$$workerId"] },
                    { $eq: ["$is_visible", true] },
                    { $eq: ["$review_type", ReviewType.CLIENT_TO_WORKER] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                average_rating: { $avg: "$rating" },
                total_reviews: { $sum: 1 },
              },
            },
          ],
          as: "review_summary",
        },
      },
      {
        $lookup: {
          from: modelsName.BOOKING,
          let: { workerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$worker_id", "$$workerId"] },
                    { $eq: ["$status", BookingStatus.COMPLETED] },
                    { $in: ["$service_id", serviceObjectIds] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                completed_bookings: { $sum: 1 },
              },
            },
          ],
          as: "booking_summary",
        },
      },
      {
        $addFields: {
          review_summary: {
            $ifNull: [
              { $arrayElemAt: ["$review_summary", 0] },
              { average_rating: 0, total_reviews: 0 },
            ],
          },
          booking_summary: {
            $ifNull: [
              { $arrayElemAt: ["$booking_summary", 0] },
              { completed_bookings: 0 },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          full_name: 1,
          avatar: 1,
          worker_profile: 1,
          matched_services: 1,
          average_rating: {
            $round: [{ $ifNull: ["$review_summary.average_rating", 0] }, 1],
          },
          total_reviews: { $ifNull: ["$review_summary.total_reviews", 0] },
          completed_bookings: {
            $ifNull: ["$booking_summary.completed_bookings", 0],
          },
        },
      },
      {
        $sort: {
          average_rating: -1,
          completed_bookings: -1,
          total_reviews: -1,
        },
      },
      {
        $limit: Math.max(limit, 1),
      },
    ];

    return WorkerService.aggregate<WorkerSuggestionCandidate>(stages);
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
          work_locations: Array<{
            province_code: number;
            ward_code: number | null;
            label_snapshot: string | null;
          }>;
        } | null;
        pricing: WorkerServicePricing[];
      }>;
    }>
  > {
    const normalizedCategories = filters?.categories
      ?.map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const stages: PipelineStage[] = [
      {
        $match: {
          is_active: true,
          ...(filters?.excludedWorkerIds?.length
            ? {
                worker_id: {
                  $nin: filters.excludedWorkerIds
                    .filter((id) => mongoose.Types.ObjectId.isValid(id))
                    .map((id) => new mongoose.Types.ObjectId(id)),
                },
              }
            : {}),
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

    if (normalizedCategories && normalizedCategories.length > 0) {
      const parentCodes = normalizedCategories.filter((c) =>
        Object.values(ServiceCategory).includes(c as ServiceCategory)
      );
      const serviceCodes = normalizedCategories.filter(
        (c) => !Object.values(ServiceCategory).includes(c as ServiceCategory)
      );

      const orClauses: Record<string, unknown>[] = [];
      if (parentCodes.length > 0) {
        orClauses.push({ "service.category": { $in: parentCodes } });
      }
      if (serviceCodes.length > 0) {
        orClauses.push({ "service.code": { $in: serviceCodes } });
        orClauses.push({ service_code: { $in: serviceCodes } });
      }

      if (orClauses.length > 0) {
        stages.push({ $match: { $or: orClauses } });
      }
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

    if (filters?.workLocation) {
      const { provinceCode, wardCode } = filters.workLocation;
      // Workers must declare service in this area. Three scopes are valid:
      //   - Province-wide (ward_code is null OR field is missing)
      //   - The exact ward selected by the searcher
      //   - When only a province is provided, ANY ward inside that province
      const wardConditions: Record<string, unknown>[] = [
        { ward_code: null },
        { ward_code: { $exists: false } },
      ];
      if (wardCode != null) {
        wardConditions.push({ ward_code: wardCode });
      }
      const elemMatch: Record<string, unknown> = {
        province_code: provinceCode,
      };
      if (wardCode != null) {
        elemMatch.$or = wardConditions;
      }
      stages.push({
        $match: {
          "worker.worker_profile.work_locations": {
            $elemMatch: elemMatch,
          },
        },
      });
    }

    stages.push(
      {
        $addFields: {
          // Workers with reputation_score < 30 get sort priority 1 (pushed to back), others get 0
          _reputation_priority: {
            $cond: {
              if: {
                $lt: [
                  { $ifNull: ["$worker.meta_data.reputation_score", 100] },
                  30,
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
      },
      {
        $sort: {
          _reputation_priority: 1,
          "worker.meta_data.reputation_score": -1,
        },
      },
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
                work_locations: {
                  $ifNull: ["$worker.worker_profile.work_locations", []],
                },
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
            work_locations: Array<{
              province_code: number;
              ward_code: number | null;
              label_snapshot: string | null;
            }>;
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
