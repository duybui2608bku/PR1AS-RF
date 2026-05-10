import { userRepository } from "../../repositories/auth/user.repository";
import { AppError } from "../../utils/AppError";
import { AUTH_MESSAGES } from "../../constants/messages";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { IReviewDocument } from "../../types/review/review.types";
import { ReviewType } from "../../constants/review";
import { VALIDATION_LIMITS } from "../../constants/validation";
import { WorkerGroupedByServiceQuery } from "../../validations/worker/worker-grouped-query.validation";
import {
  WorkerDetailResponse,
  WorkerReviewItem,
  WorkerScheduleItem,
  WorkersGroupedByServiceItem,
} from "../../types/worker/worker.types";

const parseLocation = (
  location?: string
): { latitude: number; longitude: number } | undefined => {
  if (!location) return undefined;
  const [latText, lngText] = location.split(",");
  return { latitude: Number(latText), longitude: Number(lngText) };
};

const hasTimeOverlap = (
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean => startA < endB && endA > startB;

const getDefaultScheduleRange = (
  startDateRaw?: string,
  endDateRaw?: string
): { startDate: Date; endDate: Date } => {
  const startDate = startDateRaw
    ? new Date(startDateRaw)
    : new Date(new Date().setDate(1));
  const endDate = endDateRaw
    ? new Date(endDateRaw)
    : new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));
  return { startDate, endDate };
};

export class WorkerService {
  async getWorkerById(workerId: string): Promise<WorkerDetailResponse> {
    const user = await userRepository.findById(workerId);

    if (!user) throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    if (!user.worker_profile) throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);

    const workerProfile = {
      ...user.worker_profile,
      coords: user.coords
        ? { latitude: user.coords.latitude, longitude: user.coords.longitude }
        : undefined,
    };

    const [workerServices, reviewStats, reviewsData] = await Promise.all([
      workerServiceRepository.findAllForWorker(user._id.toString()),
      reviewRepository.getStatsByWorkerId(user._id.toString()),
      reviewRepository.findByWorkerId(user._id.toString(), {
        review_type: ReviewType.CLIENT_TO_WORKER,
        is_visible: true,
        page: 1,
        limit: VALIDATION_LIMITS.PAGINATION_MAX_LIMIT,
      }),
    ]);

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
          client: { id: clientId, full_name: client.full_name ?? null, avatar: client.avatar ?? null },
          worker_reply: review.worker_reply ?? null,
          worker_replied_at: review.worker_replied_at ?? null,
          created_at: review.created_at,
        };
      }
    );

    return {
      user: {
        id: user._id.toString(),
        full_name: user.full_name ?? null,
        avatar: user.avatar ?? null,
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
    const groupedWorkers = await workerServiceRepository.findWorkersGroupedByService({
      q: query.q,
      category: query.category,
      location: parseLocation(query.location),
      workLocation:
        typeof query.province_code === "number"
          ? {
              provinceCode: query.province_code,
              wardCode:
                typeof query.ward_code === "number" ? query.ward_code : null,
            }
          : undefined,
    });

    if (!query.schedule) return groupedWorkers;

    const scheduleAt = query.schedule;

    // Build a map of unique worker → sorted non-zero durations
    const workerDurationsMap = new Map<string, number[]>();
    for (const group of groupedWorkers) {
      for (const worker of group.workers) {
        const durations = [...new Set(worker.pricing.map((p) => p.duration))]
          .filter((d) => d > 0)
          .sort((a, b) => a - b);
        if (durations.length) workerDurationsMap.set(worker.id, durations);
      }
    }

    if (!workerDurationsMap.size) return [];

    // Single DB call instead of one per worker (N+1 fix)
    const allWorkerIds = [...workerDurationsMap.keys()];
    const maxDurationOverall = Math.max(...[...workerDurationsMap.values()].flat());
    const globalMaxEndTime = new Date(scheduleAt.getTime() + maxDurationOverall * 60 * 1000);

    const allConflicts = await bookingRepository.findConflictsForWorkersInWindow(
      allWorkerIds,
      scheduleAt,
      globalMaxEndTime
    );

    // Group conflicts by worker for O(1) lookup
    const conflictsByWorker = new Map<string, Array<{ start_time: Date; end_time: Date }>>();
    for (const conflict of allConflicts) {
      const list = conflictsByWorker.get(conflict.worker_id) ?? [];
      list.push({ start_time: conflict.start_time, end_time: conflict.end_time });
      conflictsByWorker.set(conflict.worker_id, list);
    }

    const result: WorkersGroupedByServiceItem[] = [];
    for (const group of groupedWorkers) {
      const availableWorkers = group.workers.filter((worker) => {
        const durations = workerDurationsMap.get(worker.id);
        if (!durations?.length) return false;

        const workerConflicts = conflictsByWorker.get(worker.id) ?? [];
        return durations.some((durationMinutes) => {
          const candidateEnd = new Date(scheduleAt.getTime() + durationMinutes * 60 * 1000);
          return !workerConflicts.some((c) =>
            hasTimeOverlap(scheduleAt, candidateEnd, c.start_time, c.end_time)
          );
        });
      });

      if (availableWorkers.length > 0) {
        result.push({ service: group.service, workers: availableWorkers });
      }
    }

    return result;
  }

  async getWorkerSchedule(
    workerId: string,
    startDateRaw?: string,
    endDateRaw?: string
  ): Promise<WorkerScheduleItem[]> {
    const user = await userRepository.findById(workerId);

    if (!user) throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    if (!user.worker_profile) throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);

    const { startDate, endDate } = getDefaultScheduleRange(startDateRaw, endDateRaw);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw AppError.badRequest("Invalid date format");
    }

    const schedules = await bookingRepository.findScheduleByWorkerId(workerId, startDate, endDate);

    return schedules.map((item) => ({
      booking_id: item._id.toString(),
      start_time: item.schedule.start_time,
      end_time: item.schedule.end_time,
      status: item.status,
    }));
  }
}

export const workerService = new WorkerService();
