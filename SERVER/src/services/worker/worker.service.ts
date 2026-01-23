import { userRepository } from "../../repositories/auth/user.repository";

import { AppError } from "../../utils/AppError";

import { AUTH_MESSAGES } from "../../constants/messages";

import { IUserDocument } from "../../types/auth/user.types";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { ReviewStats, IReviewDocument } from "../../types/review/review.types";
import { ReviewType } from "../../constants/review";
import { VALIDATION_LIMITS } from "../../constants/validation";

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

  async getWorkersGroupedByService(): Promise<
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
        pricing: Array<{
          unit: string;
          duration: number;
          price: number;
          currency: string;
        }>;
      }>;
    }>
  > {
    return workerServiceRepository.findWorkersGroupedByService();
  }
}

export const workerService = new WorkerService();
