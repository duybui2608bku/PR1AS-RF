import { userRepository } from "../../repositories/auth/user.repository";

import { AppError } from "../../utils/AppError";

import { AUTH_MESSAGES } from "../../constants/messages";

import { IUserDocument } from "../../types/auth/user.types";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { ReviewStats, IReviewDocument } from "../../types/review/review.types";
import { ReviewType } from "../../constants/review";
import { VALIDATION_LIMITS } from "../../constants/validation";
import { WorkerGroupedByServiceQuery } from "../../validations/worker/worker-grouped-query.validation";

export interface WorkerReviewItem {
  id: string;
  rating: number;
  comment: string;
  client: {
    id: string;
    full_name: string | null;
    avatar: string | null;
  };
  worker_reply: string | null;
  worker_replied_at: Date | null;
  created_at: Date;
}

export interface WorkerScheduleItem {
  booking_id: string;
  start_time: Date;
  end_time: Date;
  status: string;
}

export interface WorkerDetailResponse {
  user: {
    id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
  };
  worker_profile: IUserDocument["worker_profile"] | null;
  services?: Array<{
    _id: string;
    service_id: string;
    service_code: string;
    pricing: Array<{
      unit: string;
      duration: number;
      price: number;
      currency: string;
    }>;
    is_active: boolean;
  }>;
  review_stats?: ReviewStats;
  reviews?: WorkerReviewItem[];
}

export interface WorkersGroupedByServiceItem {
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
    pricing: Array<{
      unit: string;
      duration: number;
      price: number;
      currency: string;
    }>;
  }>;
}

const parseLocation = (
  location?: string
): { latitude: number; longitude: number } | undefined => {
  if (!location) {
    return undefined;
  }
  const [latText, lngText] = location.split(",");
  return {
    latitude: Number(latText),
    longitude: Number(lngText),
  };
};

const hasTimeOverlap = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean => startA < endB && endA > startB;

export class WorkerService {
  async getWorkerById(workerId: string): Promise<WorkerDetailResponse> {
    const user = await userRepository.findById(workerId);

    if (!user) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    if (!user.worker_profile) {
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);
    }

    const workerProfile = {
      ...user.worker_profile,
      coords: user.coords
        ? {
            latitude: user.coords.latitude,
            longitude: user.coords.longitude,
          }
        : undefined,
    };
    const workerServices = await workerServiceRepository.findAllForWorker(
      user._id.toString()
    );

    const services = workerServices.map((ws) => ({
      _id: ws._id.toString(),
      service_id: ws.service_id.toString(),
      service_code: ws.service_code,
      pricing: ws.pricing.map((p) => ({
        unit: p.unit,
        duration: p.duration,
        price: p.price,
        currency: p.currency,
      })),
      is_active: ws.is_active,
    }));

    const [reviewStats, reviewsData] = await Promise.all([
      reviewRepository.getStatsByWorkerId(user._id.toString()),
      reviewRepository.findByWorkerId(user._id.toString(), {
        review_type: ReviewType.CLIENT_TO_WORKER,
        is_visible: true,
        page: 1,
        limit: VALIDATION_LIMITS.PAGINATION_MAX_LIMIT,
      }),
    ]);

    const reviews: WorkerReviewItem[] = reviewsData.reviews.map(
      (review: IReviewDocument) => {
        const client = review.client_id as unknown as {
          _id: { toString: () => string } | string;
          full_name: string | null;
          avatar: string | null;
        };

        const clientId =
          typeof client._id === "string" ? client._id : client._id.toString();

        return {
          id: review._id.toString(),
          rating: review.rating,
          comment: review.comment,
          client: {
            id: clientId,
            full_name: client.full_name || null,
            avatar: client.avatar || null,
          },
          worker_reply: review.worker_reply || null,
          worker_replied_at: review.worker_replied_at || null,
          created_at: review.created_at,
        };
      }
    );

    return {
      user: {
        id: user._id.toString(),
        full_name: user.full_name || null,
        avatar: user.avatar || null,
        email: user.email,
      },
      worker_profile: workerProfile,
      services,
      review_stats: reviewStats,
      reviews,
    };
  }

  async getWorkersGroupedByService(
    query: WorkerGroupedByServiceQuery
  ): Promise<WorkersGroupedByServiceItem[]> {
    const groupedWorkers =
      await workerServiceRepository.findWorkersGroupedByService({
        q: query.q,
        category: query.category,
        location: parseLocation(query.location),
      });

    if (!query.schedule) {
      return groupedWorkers;
    }
    const scheduleAt = query.schedule;

    const availabilityCache = new Map<string, boolean>();

    const groupsWithAvailability = await Promise.all(
      groupedWorkers.map(async (group) => {
        const availableWorkers = await Promise.all(
          group.workers.map(async (worker) => {
            const durations = Array.from(
              new Set(worker.pricing.map((item) => item.duration))
            )
              .filter((duration) => duration > 0)
              .sort((a, b) => a - b);

            if (!durations.length) {
              return null;
            }

            const cacheKey = `${worker.id}:${scheduleAt.toISOString()}:${durations.join(",")}`;
            const cachedAvailability = availabilityCache.get(cacheKey);
            if (typeof cachedAvailability !== "undefined") {
              return cachedAvailability ? worker : null;
            }

            const maxDurationMinutes = durations[durations.length - 1];
            const maxEndTime = new Date(
              scheduleAt.getTime() + maxDurationMinutes * 60 * 1000
            );

            const conflicts =
              await bookingRepository.findConflictsForWorkerInWindow(
                worker.id,
                scheduleAt,
                maxEndTime
              );

            const isAvailable = durations.some((durationMinutes) => {
              const candidateEnd = new Date(
                scheduleAt.getTime() + durationMinutes * 60 * 1000
              );
              return !conflicts.some((conflict) =>
                hasTimeOverlap(
                  scheduleAt,
                  candidateEnd,
                  conflict.start_time,
                  conflict.end_time
                )
              );
            });

            availabilityCache.set(cacheKey, isAvailable);
            return isAvailable ? worker : null;
          })
        );

        const filteredWorkers = availableWorkers.filter(
          (worker): worker is NonNullable<typeof worker> => worker !== null
        );

        return {
          service: group.service,
          workers: filteredWorkers,
        };
      })
    );

    return groupsWithAvailability.filter((group) => group.workers.length > 0);
  }

  async getWorkerSchedule(
    workerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkerScheduleItem[]> {
    const user = await userRepository.findById(workerId);

    if (!user) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    if (!user.worker_profile) {
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);
    }

    const schedules = await bookingRepository.findScheduleByWorkerId(
      workerId,
      startDate,
      endDate
    );

    return schedules.map((item) => ({
      booking_id: item._id.toString(),
      start_time: item.schedule.start_time,
      end_time: item.schedule.end_time,
      status: item.status,
    }));
  }
}

export const workerService = new WorkerService();
