import { userRepository } from "../../repositories/auth/user.repository";
import { AppError } from "../../utils/AppError";
import { AUTH_MESSAGES, WORKER_MESSAGES } from "../../constants/messages";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import type { WorkerSuggestionCandidate } from "../../repositories/worker/worker-service.repository";
import { workerFavoriteRepository } from "../../repositories/worker/worker-favorite.repository";
import { workerBlackoutRepository } from "../../repositories/worker/worker-blackout.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { IReviewDocument } from "../../types/review/review.types";
import { ReviewType } from "../../constants/review";
import { VALIDATION_LIMITS } from "../../constants/validation";
import { WorkerGroupedByServiceQuery } from "../../validations/worker/worker-grouped-query.validation";
import { UserStatus } from "../../types/auth";
import {
  WorkerDetailResponse,
  WorkerReviewItem,
  WorkerScheduleItem,
  WorkerScheduleResponse,
  WorkerSuggestionItem,
  WorkersGroupedByServiceItem,
} from "../../types/worker/worker.types";
import {
  CreateWorkerBlackoutInput,
  WorkerBlackoutItem,
} from "../../types/worker/worker-blackout.types";
import type {
  WorkerFavoriteItem,
  WorkerFavoriteMutationResult,
} from "../../types/worker/worker-favorite.types";
import type { WorkerServicePricing } from "../../types/worker/worker-service";
import { moderationService } from "../moderation";
import { moderationRepository } from "../../repositories/moderation";
import { RestrictionFeature } from "../../constants/moderation";
import { workerBoostRepository } from "../../repositories/boost/worker-boost.repository";
import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";

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

type CurrentWorkerService = {
  serviceId: string;
  pricing: WorkerServicePricing[];
};

type SuggestionPricingMatch = {
  matchedService: WorkerSuggestionCandidate["matched_services"][number];
  pricing: WorkerServicePricing | null;
  priceDifferenceRatio: number | null;
  priceProximityScore: number;
};

const getComparableCurrentPrices = (
  candidatePricing: WorkerServicePricing,
  currentPricing: WorkerServicePricing[]
): WorkerServicePricing[] => {
  const positivePrices = currentPricing.filter((price) => price.price > 0);
  const exactMatches = positivePrices.filter(
    (price) =>
      price.currency === candidatePricing.currency &&
      price.unit === candidatePricing.unit &&
      price.duration === candidatePricing.duration
  );
  if (exactMatches.length) return exactMatches;

  const sameUnitMatches = positivePrices.filter(
    (price) =>
      price.currency === candidatePricing.currency &&
      price.unit === candidatePricing.unit
  );
  if (sameUnitMatches.length) return sameUnitMatches;

  const sameCurrencyMatches = positivePrices.filter(
    (price) => price.currency === candidatePricing.currency
  );
  if (sameCurrencyMatches.length) return sameCurrencyMatches;

  return positivePrices;
};

const getBestPricingMatch = (
  candidate: WorkerSuggestionCandidate,
  currentServicesById: Map<string, CurrentWorkerService>
): SuggestionPricingMatch | null => {
  let bestMatch: SuggestionPricingMatch | null = null;

  for (const matchedService of candidate.matched_services) {
    const currentService = currentServicesById.get(matchedService.service_id);
    if (!currentService) continue;

    if (!matchedService.pricing.length && !bestMatch) {
      bestMatch = {
        matchedService,
        pricing: null,
        priceDifferenceRatio: null,
        priceProximityScore: 0,
      };
      continue;
    }

    for (const candidatePricing of matchedService.pricing) {
      const comparableCurrentPrices = getComparableCurrentPrices(
        candidatePricing,
        currentService.pricing
      );
      if (!comparableCurrentPrices.length) continue;

      for (const currentPricing of comparableCurrentPrices) {
        const differenceRatio =
          Math.abs(candidatePricing.price - currentPricing.price) /
          Math.max(currentPricing.price, 1);
        const priceProximityScore = Math.max(
          0,
          1 - Math.min(differenceRatio, 1)
        );

        if (
          !bestMatch ||
          priceProximityScore > bestMatch.priceProximityScore ||
          (priceProximityScore === bestMatch.priceProximityScore &&
            (bestMatch.priceDifferenceRatio === null ||
              differenceRatio < bestMatch.priceDifferenceRatio))
        ) {
          bestMatch = {
            matchedService,
            pricing: candidatePricing,
            priceDifferenceRatio: differenceRatio,
            priceProximityScore,
          };
        }
      }
    }
  }

  return bestMatch;
};

const calculateSuggestionScore = (
  candidate: WorkerSuggestionCandidate,
  match: SuggestionPricingMatch,
  currentServiceCount: number
): number => {
  const serviceMatchScore =
    Math.min(candidate.matched_services.length / currentServiceCount, 1) * 15;
  const ratingScore =
    (Math.min(Math.max(candidate.average_rating, 0), 5) / 5) * 35;
  const completedBookingScore =
    (Math.min(candidate.completed_bookings, 20) / 20) * 25;
  const priceScore = match.priceProximityScore * 25;

  return serviceMatchScore + ratingScore + completedBookingScore + priceScore;
};

export class WorkerService {
  async getWorkerById(
    workerId: string,
    viewerId?: string
  ): Promise<WorkerDetailResponse> {
    if (await moderationService.isProfileBlocked(viewerId, workerId)) {
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);
    }
    await moderationService.assertNoActiveRestriction(
      workerId,
      RestrictionFeature.WORKER_ACTIVITY
    );
    const user = await userRepository.findById(workerId);

    if (!user) throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    if (!user.worker_profile)
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);

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
          client: {
            id: clientId,
            full_name: client.full_name ?? null,
            avatar: client.avatar ?? null,
          },
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

  async getFavoriteWorkerIds(clientId: string): Promise<string[]> {
    return workerFavoriteRepository.findWorkerIdsByClient(clientId);
  }

  async getFavoriteWorkers(clientId: string): Promise<WorkerFavoriteItem[]> {
    const favorites = await workerFavoriteRepository.findByClient(clientId);
    const workerIds = favorites.map((favorite) =>
      favorite.worker_id.toString()
    );

    if (!workerIds.length) return [];

    const [workers, workerServices] = await Promise.all([
      userRepository.findManyByIds(workerIds),
      workerServiceRepository.findActiveServicesForWorkers(workerIds),
    ]);
    const restrictedWorkerIds = new Set(
      await moderationRepository.getActiveRestrictedUserIds(
        RestrictionFeature.WORKER_ACTIVITY
      )
    );

    const workersById = new Map(
      workers.map((worker) => [worker._id.toString(), worker])
    );
    const favoriteDatesByWorkerId = new Map(
      favorites.map((favorite) => [
        favorite.worker_id.toString(),
        favorite.created_at,
      ])
    );
    const servicesByWorkerId = new Map<
      string,
      WorkerFavoriteItem["services"]
    >();

    for (const service of workerServices) {
      const services = servicesByWorkerId.get(service.worker_id) ?? [];
      services.push({
        service_id: service.service_id,
        service_code: service.service_code,
        pricing: service.pricing,
        service: service.service,
      });
      servicesByWorkerId.set(service.worker_id, services);
    }

    return workerIds.flatMap((workerId) => {
      const worker = workersById.get(workerId);
      const favoritedAt = favoriteDatesByWorkerId.get(workerId);

      if (
        !worker ||
        worker.status !== UserStatus.ACTIVE ||
        !worker.worker_profile ||
        restrictedWorkerIds.has(workerId) ||
        !favoritedAt
      ) {
        return [];
      }

      return [
        {
          id: workerId,
          favorited_at: favoritedAt,
          full_name: worker.full_name ?? null,
          avatar: worker.avatar ?? null,
          worker_profile: {
            title: worker.worker_profile.title ?? null,
            introduction: worker.worker_profile.introduction ?? null,
            gallery_urls: worker.worker_profile.gallery_urls ?? [],
            work_locations: (worker.worker_profile.work_locations ?? []).map(
              (location) => ({
                province_code: location.province_code,
                ward_code: location.ward_code ?? null,
                label_snapshot: location.label_snapshot ?? null,
              })
            ),
          },
          services: servicesByWorkerId.get(workerId) ?? [],
        } satisfies WorkerFavoriteItem,
      ];
    });
  }

  async addFavoriteWorker(
    clientId: string,
    workerId: string
  ): Promise<WorkerFavoriteMutationResult> {
    await this.ensureWorkerCanBeFavorited(clientId, workerId);
    await workerFavoriteRepository.add(clientId, workerId);
    return { worker_id: workerId, is_favorite: true };
  }

  async removeFavoriteWorker(
    clientId: string,
    workerId: string
  ): Promise<WorkerFavoriteMutationResult> {
    await workerFavoriteRepository.remove(clientId, workerId);
    return { worker_id: workerId, is_favorite: false };
  }

  private async ensureWorkerCanBeFavorited(
    clientId: string,
    workerId: string
  ): Promise<void> {
    if (clientId === workerId) {
      throw AppError.badRequest(WORKER_MESSAGES.CANNOT_FAVORITE_SELF);
    }

    const worker = await userRepository.findById(workerId);
    if (!worker) throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    if (worker.status !== UserStatus.ACTIVE || !worker.worker_profile) {
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);
    }
  }

  async getWorkerSuggestions(
    workerId: string,
    limit = 4
  ): Promise<WorkerSuggestionItem[]> {
    const safeLimit = Math.max(1, Math.min(limit, 12));
    const [user, workerServices] = await Promise.all([
      userRepository.findById(workerId),
      workerServiceRepository.findAllForWorker(workerId),
    ]);

    if (!user) throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    if (!user.worker_profile)
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);

    const currentServices = workerServices
      .filter((service) => service.is_active)
      .map<CurrentWorkerService>((service) => ({
        serviceId: service.service_id.toString(),
        pricing: service.pricing,
      }));

    if (!currentServices.length) return [];

    const currentServicesById = new Map(
      currentServices.map((service) => [service.serviceId, service])
    );
    const serviceIds = [...currentServicesById.keys()];
    const candidateLimit = Math.max(safeLimit * 8, 24);
    const candidates =
      await workerServiceRepository.findSuggestionCandidatesForWorker(
        workerId,
        serviceIds,
        candidateLimit
      );

    const scoredSuggestions = candidates.flatMap((candidate) => {
      const match = getBestPricingMatch(candidate, currentServicesById);
      if (!match) return [];

      const score = calculateSuggestionScore(
        candidate,
        match,
        currentServicesById.size
      );

      return [
        {
          score,
          suggestion: {
            id: candidate.id,
            full_name: candidate.full_name,
            avatar: candidate.avatar,
            worker_profile: candidate.worker_profile,
            matched_service: match.matchedService.service,
            pricing: match.pricing,
            review_stats: {
              total: candidate.total_reviews,
              average: candidate.average_rating,
            },
            completed_bookings: candidate.completed_bookings,
            price_difference_percent:
              match.priceDifferenceRatio === null
                ? null
                : Math.round(match.priceDifferenceRatio * 100),
          } satisfies WorkerSuggestionItem,
        },
      ];
    });

    return scoredSuggestions
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (
          b.suggestion.review_stats.average !==
          a.suggestion.review_stats.average
        ) {
          return (
            b.suggestion.review_stats.average -
            a.suggestion.review_stats.average
          );
        }
        return (
          b.suggestion.completed_bookings - a.suggestion.completed_bookings
        );
      })
      .slice(0, safeLimit)
      .map((item) => item.suggestion);
  }

  async getWorkersGroupedByService(
    query: WorkerGroupedByServiceQuery,
    viewerId?: string
  ): Promise<WorkersGroupedByServiceItem[]> {
    const [profileBlockedIds, restrictedWorkerIds] = await Promise.all([
      moderationService.getProfileBlockedIds(viewerId),
      moderationRepository.getActiveRestrictedUserIds(
        RestrictionFeature.WORKER_ACTIVITY
      ),
    ]);
    const groupedWorkers =
      await workerServiceRepository.findWorkersGroupedByService({
        categories: query.category,
        location: parseLocation(query.location),
        workLocation:
          typeof query.province_code === "number"
            ? {
                provinceCode: query.province_code,
                wardCode:
                  typeof query.ward_code === "number" ? query.ward_code : null,
              }
            : undefined,
        excludedWorkerIds: [
          ...new Set([
            ...profileBlockedIds,
            ...restrictedWorkerIds,
            ...(viewerId ? [viewerId] : []),
          ]),
        ],
      });

    // Collect all worker ids, fetch active boosts, then apply boost-tier sort
    const allWorkerIds = [
      ...new Set(groupedWorkers.flatMap((g) => g.workers.map((w) => w.id))),
    ];

    const [activeBoosts, boostConfig] = await Promise.all([
      workerBoostRepository.findActiveBoostsForWorkers(allWorkerIds),
      boostConfigRepository.get(),
    ]);

    const boostByWorkerId = new Map(activeBoosts.map((b) => [b.user_id, b]));

    // Deterministic rotation: slot changes every rotation_interval_minutes so
    // all boosted workers at the same tier get equal exposure over time.
    const slotId = Math.floor(
      Date.now() / (boostConfig.rotation_interval_minutes * 60 * 1000)
    );

    const getBoostSortKey = (workerId: string): [number, number] => {
      const boost = boostByWorkerId.get(workerId);
      const tier = boost ? boost.tier : 999;
      // Cheap deterministic scatter within same tier using last 4 hex chars of id
      const scatter = (parseInt(workerId.slice(-4), 16) + slotId) % 1000;
      return [tier, scatter];
    };

    const groupedWithBoost = groupedWorkers.map((group) => ({
      ...group,
      workers: group.workers
        .map((w) => {
          const boost = boostByWorkerId.get(w.id);
          return {
            ...w,
            boost: {
              is_boosted: Boolean(boost),
              boost_type: boost ? (boost.tier === 1 ? "featured" : "basic") : null,
              boost_tier: boost ? boost.tier : null,
            },
          };
        })
        .sort((a, b) => {
          const [tierA, scatterA] = getBoostSortKey(a.id);
          const [tierB, scatterB] = getBoostSortKey(b.id);
          if (tierA !== tierB) return tierA - tierB;
          return scatterA - scatterB;
        }),
    }));

    if (!query.schedule) return groupedWithBoost;

    const scheduleAt = query.schedule;

    // Build a map of unique worker → sorted non-zero durations
    const workerDurationsMap = new Map<string, number[]>();
    for (const group of groupedWithBoost) {
      for (const worker of group.workers) {
        const durations = [...new Set(worker.pricing.map((p) => p.duration))]
          .filter((d) => d > 0)
          .sort((a, b) => a - b);
        if (durations.length) workerDurationsMap.set(worker.id, durations);
      }
    }

    if (!workerDurationsMap.size) return [];

    // Single DB call instead of one per worker (N+1 fix)
    const scheduledWorkerIds = [...workerDurationsMap.keys()];
    const maxDurationOverall = Math.max(
      ...[...workerDurationsMap.values()].flat()
    );
    const globalMaxEndTime = new Date(
      scheduleAt.getTime() + maxDurationOverall * 60 * 1000
    );

    const allConflicts =
      await bookingRepository.findConflictsForWorkersInWindow(
        scheduledWorkerIds,
        scheduleAt,
        globalMaxEndTime
      );

    // Group conflicts by worker for O(1) lookup
    const conflictsByWorker = new Map<
      string,
      Array<{ start_time: Date; end_time: Date }>
    >();
    for (const conflict of allConflicts) {
      const list = conflictsByWorker.get(conflict.worker_id) ?? [];
      list.push({
        start_time: conflict.start_time,
        end_time: conflict.end_time,
      });
      conflictsByWorker.set(conflict.worker_id, list);
    }

    const result: WorkersGroupedByServiceItem[] = [];
    for (const group of groupedWithBoost) {
      const availableWorkers = group.workers.filter((worker) => {
        const durations = workerDurationsMap.get(worker.id);
        if (!durations?.length) return false;

        const workerConflicts = conflictsByWorker.get(worker.id) ?? [];
        return durations.some((durationMinutes) => {
          const candidateEnd = new Date(
            scheduleAt.getTime() + durationMinutes * 60 * 1000
          );
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
  ): Promise<WorkerScheduleResponse> {
    const user = await userRepository.findById(workerId);

    if (!user) throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    if (!user.worker_profile)
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);

    const { startDate, endDate } = getDefaultScheduleRange(
      startDateRaw,
      endDateRaw
    );

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw AppError.badRequest("Invalid date format");
    }

    const [schedules, blackouts] = await Promise.all([
      bookingRepository.findScheduleByWorkerId(workerId, startDate, endDate),
      workerBlackoutRepository.findByWorkerInWindow(
        workerId,
        startDate,
        endDate
      ),
    ]);

    const bookings: WorkerScheduleItem[] = schedules.map((item) => ({
      booking_id: item._id.toString(),
      start_time: item.schedule.start_time,
      end_time: item.schedule.end_time,
      status: item.status,
    }));

    return {
      bookings,
      blackouts: blackouts.map((item) => ({
        blackout_id: item._id.toString(),
        start_time: item.start_time,
        end_time: item.end_time,
        reason: item.reason ?? null,
      })),
    };
  }

  async createBlackout(
    workerId: string,
    input: CreateWorkerBlackoutInput
  ): Promise<WorkerBlackoutItem> {
    if (input.end_time.getTime() <= input.start_time.getTime()) {
      throw AppError.badRequest("end_time must be after start_time");
    }

    // Reject blackouts that would orphan already-confirmed work. Worker must
    // cancel/reschedule those bookings first — silently swallowing the
    // conflict would let them strand a client.
    const overlaps = await bookingRepository.findConflictsForWorkerInWindow(
      workerId,
      input.start_time,
      input.end_time
    );
    if (overlaps.length > 0) {
      throw AppError.badRequest(
        "There are existing bookings in this period. Cancel or reschedule them before marking the time off."
      );
    }

    const created = await workerBlackoutRepository.create(workerId, input);
    return {
      id: created._id.toString(),
      start_time: created.start_time,
      end_time: created.end_time,
      reason: created.reason ?? null,
    };
  }

  async listMyBlackouts(
    workerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkerBlackoutItem[]> {
    const items = await workerBlackoutRepository.findByWorkerInWindow(
      workerId,
      startDate,
      endDate
    );
    return items.map((item) => ({
      id: item._id.toString(),
      start_time: item.start_time,
      end_time: item.end_time,
      reason: item.reason ?? null,
    }));
  }

  async deleteBlackout(workerId: string, blackoutId: string): Promise<void> {
    const removed = await workerBlackoutRepository.deleteByIdForWorker(
      workerId,
      blackoutId
    );
    if (!removed) {
      throw AppError.notFound("Blackout not found");
    }
  }
}

export const workerService = new WorkerService();
